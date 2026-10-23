/*
 * 同期の送受信（js/sync.js）のテスト。Supabase の代わりに、メモリ上の偽サーバーを使う
 * 2台の端末（PC とスマホ）が同じサーバーと同期する流れを確かめる
 * ※ RLS（本人の行しか読めないこと）は、Supabase 側の SQL で守る。ここでは確認できない
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { suite, test, assert } = require('./harness');
const { load, ROOT } = require('./load');

// 偽の Supabase（user_state テーブル1つ）
// テスト用のパスワード（実在のものではない）
const TEST_PASSWORD = 'test-only-password';

function fakeServer(opts) {
  const o = Object.assign({ signedIn: true, offline: false }, opts);
  const rows = {};
  const stats = { writes: 0 };
  return {
    rows,
    stats,
    createClient() {
      const me = { id: 'user-1', email: 'me@example.com' };
      let session = o.signedIn ? { user: me } : null;
      const listeners = [];
      const fire = (ev) => listeners.forEach((fn) => fn(ev, session));
      return {
        auth: {
          onAuthStateChange(fn) { listeners.push(fn); return { data: { subscription: { unsubscribe() {} } } }; },
          // オフラインでトークンを更新できないときは、エラーになる想定
          getSession: () => o.offline ? Promise.reject(new Error('network')) : Promise.resolve({ data: { session } }),
          signInWithPassword: ({ email, password }) => {
            if (email !== me.email || password !== TEST_PASSWORD) return Promise.resolve({ error: { message: 'Invalid login credentials' } });
            session = { user: me };
            fire('SIGNED_IN');
            return Promise.resolve({ error: null });
          },
          signOut: () => { session = null; fire('SIGNED_OUT'); return Promise.resolve({ error: null }); }
        },
        from(table) {
          assert.strictEqual(table, 'user_state');
          return {
            select() {
              return { eq: (col, id) => ({ maybeSingle: () => Promise.resolve({ data: rows[id] ? { data: JSON.parse(JSON.stringify(rows[id].data)) } : null, error: null }) }) };
            },
            upsert(row) {
              stats.writes++;
              rows[row.user_id] = JSON.parse(JSON.stringify(row));
              return Promise.resolve({ error: null });
            }
          };
        }
      };
    }
  };
}

function memoryStorage(initial) {
  const mem = Object.assign({}, initial);
  return { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
}

function device(server, opts) {
  const o = opts || {};
  const ctx = load({ localStorage: o.localStorage || memoryStorage() });
  const handlers = {};
  ctx.navigator = { onLine: !o.offline };
  ctx.location = { protocol: 'https:', origin: 'https://example.github.io', pathname: '/study-app/' };
  ctx.document = { addEventListener() {}, visibilityState: 'visible' };
  ctx.addEventListener = (n, fn) => { handlers[n] = fn; };
  ctx.setTimeout = () => 0;
  ctx.clearTimeout = () => {};
  ctx.STUDY_APP_CONFIG = 'config' in o ? o.config : { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' };
  ctx.supabase = { createClient: server.createClient };
  const code = fs.readFileSync(path.join(ROOT, 'js', 'sync.js'), 'utf8');
  vm.runInContext(code, ctx, { filename: 'js/sync.js' });
  ctx.SA.storage.init();
  return ctx;
}

const tick = () => new Promise((r) => setImmediate(r));
async function settle() { for (let i = 0; i < 20; i++) await tick(); }

const pending = [];
function atest(name, fn) { pending.push([name, fn]); }

atest('ログインすると、端末の記録をサーバーに送る', async () => {
  const server = fakeServer();
  const pc = device(server);
  const course = pc.SA.courses.boki;
  pc.SA.model.recordDrill(course, pc.SA.storage.course('boki'), course.drillsById['w1-06'], false, '2026-10-24');
  pc.SA.storage.save();
  pc.SA.sync.init();
  await settle();
  assert.strictEqual(pc.SA.sync.status().state, 'synced');
  assert.strictEqual(server.rows['user-1'].data.courses.boki.drill.log.length, 1);
});

atest('もう一台の端末が同期すると、記録を受け取り、両方の記録がそろう', async () => {
  const server = fakeServer();
  const pc = device(server);
  const phone = device(server);
  const course = pc.SA.courses.boki;
  pc.SA.model.recordDrill(course, pc.SA.storage.course('boki'), course.drillsById['w1-06'], false, '2026-10-24');
  pc.SA.sync.init();
  await settle();

  const pcs = phone.SA.storage.course('boki');
  phone.SA.model.rateCard(course, pcs, course.cards[0], 'ok', '2026-10-25');
  phone.SA.sync.init();
  await settle();
  const ph = phone.SA.storage.get().courses.boki;
  assert.strictEqual(ph.drill.log.length, 1, 'PC の記録がスマホに届く');
  assert.ok(ph.drill.review['w1-06'], '復習キューも届く');
  assert.ok(ph.cards[course.cards[0].id], 'スマホの記録も残る');

  await pc.SA.sync.syncNow();
  await settle();
  assert.ok(pc.SA.storage.get().courses.boki.cards[course.cards[0].id], 'スマホの記録が PC に届く');
  assert.strictEqual(phone.SA.sync.status().state, 'synced');
});

atest('サーバーと同じ内容なら、書き込みをしない', async () => {
  const server = fakeServer();
  const pc = device(server);
  pc.SA.sync.init();
  await settle();
  const after1 = server.stats.writes;
  await pc.SA.sync.syncNow();
  await settle();
  assert.strictEqual(server.stats.writes, after1);
});

atest('オフラインのときは送受信せず、状態を「オフライン」にする', async () => {
  const server = fakeServer();
  const pc = device(server);
  pc.SA.sync.init();
  await settle();
  pc.navigator.onLine = false;
  await pc.SA.sync.syncNow();
  assert.strictEqual(pc.SA.sync.status().state, 'offline');
});

atest('設定（config.js）がないときは、同期しない', async () => {
  const pc = device(fakeServer());
  pc.STUDY_APP_CONFIG = null;
  pc.SA.sync.init();
  await settle();
  assert.strictEqual(pc.SA.sync.status().state, 'unconfigured');
});

atest('サーバーのデータが壊れていたら、ローカルを上書きせずにエラーにする', async () => {
  const server = fakeServer();
  server.rows['user-1'] = { user_id: 'user-1', data: { schemaVersion: 2, courses: { boki: { examDate: 'bad' } } } };
  const pc = device(server);
  pc.SA.storage.course('boki').lessons['l-bs'] = '2026-10-24';
  pc.SA.sync.init();
  await settle();
  assert.strictEqual(pc.SA.sync.status().state, 'error');
  assert.strictEqual(pc.SA.storage.get().courses.boki.lessons['l-bs'], '2026-10-24');
});

/* ---------- 入口のログイン ---------- */
const GATED = { requireLogin: true, supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' };

atest('入口: ログインしていなければ通さない', async () => {
  const pc = device(fakeServer({ signedIn: false }), { config: GATED });
  pc.SA.sync.init();
  await settle();
  assert.strictEqual(pc.SA.sync.status().state, 'signedOut');
  assert.strictEqual(pc.SA.sync.unlocked(), false);
});

atest('入口: パスワードが違えば通さず、正しければ通して同期する', async () => {
  const server = fakeServer({ signedIn: false });
  const pc = device(server, { config: GATED });
  pc.SA.sync.init();
  await settle();
  let failed = false;
  await pc.SA.sync.signInWithPassword('me@example.com', 'wrong-password').catch(() => { failed = true; });
  assert.strictEqual(failed, true);
  assert.strictEqual(pc.SA.sync.unlocked(), false);
  await pc.SA.sync.signInWithPassword('me@example.com', TEST_PASSWORD);
  await settle();
  assert.strictEqual(pc.SA.sync.unlocked(), true);
  assert.strictEqual(pc.SA.sync.status().state, 'synced');
  assert.ok(server.rows['user-1'], 'ログイン後にサーバーへ保存される');
});

atest('入口: ログアウトすると、また通さない', async () => {
  const pc = device(fakeServer({ signedIn: true }), { config: GATED });
  pc.SA.sync.init();
  await settle();
  assert.strictEqual(pc.SA.sync.unlocked(), true);
  await pc.SA.sync.signOut();
  assert.strictEqual(pc.SA.sync.unlocked(), false);
});

atest('入口: 一度ログインした端末は、オフラインでも開ける', async () => {
  const ls = memoryStorage({ 'studyApp.auth': JSON.stringify({ user: { id: 'user-1' } }) });
  const pc = device(fakeServer({ signedIn: true, offline: true }), { config: GATED, offline: true, localStorage: ls });
  pc.SA.sync.init();
  await settle();
  assert.strictEqual(pc.SA.sync.status().state, 'offline');
  assert.strictEqual(pc.SA.sync.unlocked(), true);
});

atest('入口: ログインしたことのない端末は、オフラインでは開けない', async () => {
  const pc = device(fakeServer({ signedIn: false, offline: true }), { config: GATED, offline: true });
  pc.SA.sync.init();
  await settle();
  assert.strictEqual(pc.SA.sync.unlocked(), false);
});

atest('入口: ログイン必須なのに接続情報がない公開版は、中身を表示しない', async () => {
  const pc = device(fakeServer(), { config: { requireLogin: true } });
  pc.SA.sync.init();
  await settle();
  assert.strictEqual(pc.SA.sync.status().state, 'unconfigured');
  assert.strictEqual(pc.SA.sync.unlocked(), false);
});

atest('入口: requireLogin がない（ファイルで直接開く版）ときは、ログインなしで使える', async () => {
  const pc = device(fakeServer({ signedIn: false }), { config: null });
  pc.SA.sync.init();
  await settle();
  assert.strictEqual(pc.SA.sync.unlocked(), true);
});

atest('公開用ビルドの config.js は、常にログイン必須になる', async () => {
  const { execFileSync } = require('child_process');
  const outEnv = Object.assign({}, process.env, { SUPABASE_URL: '', SUPABASE_ANON_KEY: '', SITE_URL: '' });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-site.js')], { env: outEnv, stdio: 'ignore' });
  const cfgCtx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, '_site', 'config.js'), 'utf8'), cfgCtx);
  assert.strictEqual(cfgCtx.window.STUDY_APP_CONFIG.requireLogin, true);
});

module.exports = async function runSyncTests() {
  for (const [name, fn] of pending) {
    let err = null;
    try { await fn(); } catch (e) { err = e; }
    suite('同期の送受信（偽サーバー）', () => test(name, () => { if (err) throw err; }));
  }
};
