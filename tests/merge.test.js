/* 同期の統合（項目ごとの最終書き込み優先）と、オフライン用ファイル一覧の整合性 */
'use strict';
const fs = require('fs');
const path = require('path');
const { suite, test, assert } = require('./harness');
const { load, scriptList, ROOT } = require('./load');

const SA = load().SA;
const S = SA.storage, G = SA.merge;
const plain = (o) => JSON.parse(JSON.stringify(o));

function state(fill) {
  const st = S.emptyState();
  st.courses.boki = S.emptyCourseState();
  fill(st.courses.boki, st);
  return plain(st);
}

suite('同期の統合（マージ）', () => {
  test('片方にしかない項目は、両方とも残る', () => {
    const pc = state((c) => { c.cards['c-1'] = { box: 2, due: '2026-11-03', updatedAt: '2026-11-01T10:00:00Z' }; });
    const phone = state((c) => { c.cards['c-2'] = { box: 3, due: '2026-11-05', updatedAt: '2026-11-01T11:00:00Z' }; });
    const m = G.merge(pc, phone);
    assert.deepStrictEqual(plain(Object.keys(m.courses.boki.cards).sort()), ['c-1', 'c-2']);
    assert.ok(S.validate(m).ok);
  });

  test('同じ項目は、更新時刻が新しい方を採用する', () => {
    const pc = state((c) => { c.cards['c-1'] = { box: 4, due: '2026-11-09', updatedAt: '2026-11-01T12:00:00Z' }; });
    const phone = state((c) => { c.cards['c-1'] = { box: 1, due: '2026-11-02', updatedAt: '2026-11-01T09:00:00Z' }; });
    assert.strictEqual(G.merge(pc, phone).courses.boki.cards['c-1'].box, 4);
    assert.strictEqual(G.merge(phone, pc).courses.boki.cards['c-1'].box, 4, '引数の順序によらない');
  });

  test('学習計画の日は、日ごとに新しい方', () => {
    const day = (memo, at) => ({ tasks: [{ text: 'A', done: true }], minutes: 30, memo: memo, updatedAt: at });
    const pc = state((c) => { c.plan['2026-10-24'] = day('PC', '2026-10-24T20:00:00Z'); c.plan['2026-10-25'] = day('PC', '2026-10-25T08:00:00Z'); });
    const phone = state((c) => { c.plan['2026-10-24'] = day('スマホ', '2026-10-24T21:00:00Z'); });
    const m = G.merge(pc, phone).courses.boki.plan;
    assert.strictEqual(m['2026-10-24'].memo, 'スマホ');
    assert.strictEqual(m['2026-10-25'].memo, 'PC');
  });

  test('受験予定日は、変更時刻が新しい方', () => {
    const pc = state((c) => { c.examDate = '2027-02-01'; c.examDateUpdatedAt = '2026-10-30T00:00:00Z'; });
    const phone = state((c) => { c.examDate = '2027-06-01'; c.examDateUpdatedAt = '2026-11-02T00:00:00Z'; });
    assert.strictEqual(G.merge(pc, phone).courses.boki.examDate, '2027-06-01');
  });

  test('ドリルの記録は両方を合わせ、同じ記録は重複させない', () => {
    const a = { qid: 'w1-01', date: '2026-10-24', correct: true, ts: '2026-10-24T10:00:00Z' };
    const b = { qid: 'w1-02', date: '2026-10-24', correct: false, ts: '2026-10-24T11:00:00Z' };
    const pc = state((c) => { c.drill.log = [a]; });
    const phone = state((c) => { c.drill.log = [a, b]; });
    const log = G.merge(pc, phone).courses.boki.drill.log;
    assert.strictEqual(log.length, 2);
    assert.deepStrictEqual(plain(log.map((l) => l.qid)), ['w1-01', 'w1-02']);
  });

  test('復習の完了は、もう一方の古い「未完了」より優先される', () => {
    const pc = state((c) => { c.drill.review.q = { anchor: '2026-11-01', stage: 2, due: '2026-11-08', done: true, updatedAt: '2026-11-08T10:00:00Z' }; });
    const phone = state((c) => { c.drill.review.q = { anchor: '2026-11-01', stage: 1, due: '2026-11-04', updatedAt: '2026-11-04T10:00:00Z' }; });
    assert.strictEqual(G.merge(phone, pc).courses.boki.drill.review.q.done, true);
  });

  test('読んだ解説は早い日付、学習した日は多い方の回数', () => {
    const pc = state((c) => { c.lessons['l-bs'] = '2026-10-25'; c.activity['2026-10-25'] = 3; });
    const phone = state((c) => { c.lessons['l-bs'] = '2026-10-24'; c.activity['2026-10-25'] = 5; c.activity['2026-10-24'] = 1; });
    const m = G.merge(pc, phone).courses.boki;
    assert.strictEqual(m.lessons['l-bs'], '2026-10-24');
    assert.strictEqual(m.activity['2026-10-25'], 5);
    assert.strictEqual(m.activity['2026-10-24'], 1);
  });

  test('全削除（resetAt）より前の記録は、もう一方の端末にあっても消える', () => {
    const old = state((c) => {
      c.cards['c-1'] = { box: 3, due: '2026-11-05', updatedAt: '2026-11-01T10:00:00Z' };
      c.drill.log = [{ qid: 'w1-01', date: '2026-11-01', correct: true, ts: '2026-11-01T10:00:00Z' }];
      c.lessons['l-bs'] = '2026-11-01';
      c.activity['2026-11-01'] = 2;
    });
    const reset = state((c, st) => {
      st.resetAt = '2026-11-02T00:00:00Z';
      c.cards['c-2'] = { box: 2, due: '2026-11-04', updatedAt: '2026-11-02T09:00:00Z' };
    });
    const m = G.merge(old, reset);
    assert.strictEqual(m.resetAt, '2026-11-02T00:00:00Z');
    assert.deepStrictEqual(plain(Object.keys(m.courses.boki.cards)), ['c-2']);
    assert.strictEqual(m.courses.boki.drill.log.length, 0);
    assert.deepStrictEqual(plain(m.courses.boki.lessons), {});
    assert.deepStrictEqual(plain(m.courses.boki.activity), {});
  });

  test('サーバーにデータがないときは、ローカルをそのまま使う', () => {
    const pc = state((c) => { c.lessons['l-bs'] = '2026-10-24'; });
    const m = G.merge(pc, null);
    assert.ok(G.sameContent(m, pc));
  });

  test('統合を2回しても結果は変わらない（同期を繰り返しても安定する）', () => {
    const pc = state((c) => { c.cards['c-1'] = { box: 2, due: '2026-11-03', updatedAt: '2026-11-01T10:00:00Z' }; });
    const phone = state((c) => { c.lessons['l-bs'] = '2026-10-24'; });
    const once = G.merge(pc, phone);
    const twice = G.merge(once, phone);
    assert.ok(G.sameContent(once, twice));
    assert.ok(G.sameContent(G.merge(phone, once), once));
  });
});

suite('ホーム画面のアプリ（オフライン用のファイル一覧）', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const listed = (sw.match(/APP_FILES = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g) || []).map((s) => s.slice(1, -1));
  test('index.html のスクリプトがすべて sw.js に載っている', () => {
    scriptList().filter((src) => !/^https?:/.test(src)).forEach((src) => assert.ok(listed.includes(src), src + ' が APP_FILES にありません'));
  });
  test('sw.js に載っているファイルが実在する（config.js を除く）', () => {
    listed.filter((f) => f !== './' && f !== 'config.js').forEach((f) => assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' がありません'));
  });
  test('manifest のアイコンが実在する', () => {
    const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    assert.strictEqual(mf.display, 'standalone');
    mf.icons.forEach((i) => assert.ok(fs.existsSync(path.join(ROOT, i.src)), i.src));
    assert.ok(mf.icons.some((i) => i.purpose === 'maskable'));
  });
  test('Supabase ライブラリの版が、sync.js と sw.js で同じ', () => {
    const sync = fs.readFileSync(path.join(ROOT, 'js', 'sync.js'), 'utf8');
    const v1 = sync.match(/supabase-js@([\d.]+)/)[1];
    const v2 = sw.match(/supabase-js@([\d.]+)/)[1];
    assert.strictEqual(v1, v2);
  });
});
