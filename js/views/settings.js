/*
 * 設定: 受験予定日（コースごと）、同期（ログイン）、データのJSON書き出し・読み込み、全データ削除
 */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, M = SA.model, S = SA.storage, U = SA.util, Y = SA.sync;
  var esc = UI.esc;

  var pendingEmail = '';

  /* ---------- 同期 ---------- */
  function syncMode() {
    if (!Y.config()) return 'unconfigured';
    if (!Y.isReady()) return Y.status().state === 'error' || Y.status().state === 'offline' ? 'failed' : 'loading';
    return Y.user() ? 'in' : (pendingEmail ? 'code' : 'out');
  }

  function statusLine() {
    var s = Y.status();
    var when = s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';
    var text = {
      synced: '同期済み' + (when ? '（' + when + '）' : ''),
      syncing: '同期中です',
      offline: 'オフラインです。オンラインに戻ると自動で同期します',
      error: '同期できませんでした: ' + (s.message || '原因不明'),
      signedOut: 'ログインしていません',
      loading: '準備中です',
      unconfigured: '同期は設定されていません'
    }[s.state] || '';
    return '<span class="sync-chip" data-state="' + esc(s.state) + '">' + esc(Y.label(s.state)) + '</span> <span class="small">' + esc(text) + '</span>';
  }

  function syncBody(mode) {
    var standalone = SA.pwa && SA.pwa.isStandalone();
    if (mode === 'unconfigured') {
      return '<p class="small">PCとスマホで進捗を合わせるには、Supabase（無料）を設定します。手順は <code>docs/PHASE2_SETUP.md</code> にあります。設定しなくても、この端末だけで今までどおり使えます。</p>';
    }
    if (mode === 'loading') return '<p class="small muted">同期の準備をしています。</p>';
    if (mode === 'failed') return '<p class="small">同期の準備ができませんでした。オンラインか確認して、ページを再読み込みしてください。</p>';
    if (mode === 'in') {
      return '<div class="kv"><span class="muted">ログイン中</span><span>' + esc(Y.user().email || '') + '</span></div>' +
        '<div class="btn-row"><button class="btn btn-primary" data-sync-now>今すぐ同期</button><button class="btn" data-signout>ログアウト</button></div>' +
        '<p class="small muted">ログアウトしても、この端末の学習記録は消えません。' + (Y.gateRequired() ? '次に開くときは、ログイン画面が出ます。' : '') + '</p>' +
        '<h3>パスワードを変える</h3>' +
        '<p class="small muted">12文字以上をおすすめします。ほかのサービスと同じパスワードは使わないでください。</p>' +
        '<label class="field">新しいパスワード<input type="password" autocomplete="new-password" data-new-pw></label>' +
        '<label class="field">もう一度<input type="password" autocomplete="new-password" data-new-pw2></label>' +
        '<div class="btn-row"><button class="btn" data-change-pw>パスワードを変える</button></div>' +
        '<p class="small" data-auth-msg aria-live="polite"></p>';
    }
    if (mode === 'code') {
      return '<p class="small"><strong>' + esc(pendingEmail) + '</strong> にメールを送りました。メールに書かれた確認コードを入力してください。' +
        (standalone ? '' : 'このブラウザでメールのリンクを開いてもログインできます。') + '</p>' +
        '<label class="field">確認コード<input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" data-code></label>' +
        '<div class="btn-row"><button class="btn btn-primary" data-verify>ログイン</button><button class="btn" data-restart-login>メールアドレスを変える</button></div>' +
        '<p class="small" data-auth-msg aria-live="polite"></p>';
    }
    return '<label class="field">メールアドレス<input type="email" autocomplete="username" data-email></label>' +
      '<label class="field">パスワード<input type="password" autocomplete="current-password" data-password></label>' +
      '<div class="btn-row"><button class="btn btn-primary" data-login>ログイン</button>' +
      '<button class="btn" data-send>パスワードを忘れた（確認コードを送る）</button></div>' +
      (standalone ? '' : '<p class="small muted">確認コードのメールにあるリンクを、このブラウザで開いてもログインできます。</p>') +
      '<p class="small" data-auth-msg aria-live="polite"></p>';
  }

  function bindSync(box) {
    var msg = function (text, bad) {
      var m = box.querySelector('[data-auth-msg]');
      if (m) { m.textContent = text; m.style.color = bad ? 'var(--shu)' : ''; }
    };
    var login = box.querySelector('[data-login]');
    if (login) login.addEventListener('click', function () {
      var email = box.querySelector('[data-email]').value.trim();
      var pw = box.querySelector('[data-password]').value;
      if (!email || !pw) { msg('メールアドレスとパスワードを入力してください。', true); return; }
      login.disabled = true;
      Y.signInWithPassword(email, pw).then(function () {
        SA.views.updateSyncBox(true);
      }).catch(function () {
        login.disabled = false;
        msg('メールアドレスかパスワードが違います。', true);
      });
    });
    var change = box.querySelector('[data-change-pw]');
    if (change) change.addEventListener('click', function () {
      var a = box.querySelector('[data-new-pw]').value;
      var b = box.querySelector('[data-new-pw2]').value;
      if (a.length < 8) { msg('パスワードは8文字以上にしてください。', true); return; }
      if (a !== b) { msg('2つの入力が一致しません。', true); return; }
      change.disabled = true;
      Y.updatePassword(a).then(function () {
        box.querySelector('[data-new-pw]').value = '';
        box.querySelector('[data-new-pw2]').value = '';
        change.disabled = false;
        msg('パスワードを変えました。');
      }).catch(function (e) {
        change.disabled = false;
        msg('変えられませんでした: ' + e.message, true);
      });
    });
    var send = box.querySelector('[data-send]');
    if (send) send.addEventListener('click', function () {
      var email = box.querySelector('[data-email]').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg('メールアドレスの形式が正しくありません。', true); return; }
      send.disabled = true;
      msg('送信しています。');
      Y.sendLoginEmail(email).then(function () {
        pendingEmail = email;
        SA.views.updateSyncBox(true);
      }).catch(function (e) {
        send.disabled = false;
        msg('メールを送れませんでした: ' + e.message, true);
      });
    });
    var verify = box.querySelector('[data-verify]');
    if (verify) verify.addEventListener('click', function () {
      var code = box.querySelector('[data-code]').value.replace(/\s/g, '');
      if (!/^\d{6,10}$/.test(code)) { msg('確認コードは数字6〜10桁です。', true); return; }
      verify.disabled = true;
      Y.verifyCode(pendingEmail, code).then(function () {
        pendingEmail = '';
        SA.views.updateSyncBox(true);
      }).catch(function (e) {
        verify.disabled = false;
        msg('ログインできませんでした: ' + e.message, true);
      });
    });
    var restart = box.querySelector('[data-restart-login]');
    if (restart) restart.addEventListener('click', function () { pendingEmail = ''; SA.views.updateSyncBox(true); });
    var now = box.querySelector('[data-sync-now]');
    if (now) now.addEventListener('click', function () { Y.syncNow(); });
    var out = box.querySelector('[data-signout]');
    if (out) out.addEventListener('click', function () { Y.signOut().then(function () { SA.views.updateSyncBox(true); }); });
  }

  // 同期の欄だけを更新する（入力中の内容を消さないように、表示の種類が変わったときだけ作り直す）
  SA.views.updateSyncBox = function (force) {
    var box = document.querySelector('[data-sync-box]');
    if (!box) return;
    var mode = syncMode();
    box.querySelector('[data-sync-status]').innerHTML = statusLine();
    if (force || box.getAttribute('data-mode') !== mode) {
      box.setAttribute('data-mode', mode);
      var body = box.querySelector('[data-sync-body]');
      body.innerHTML = syncBody(mode);
      bindSync(body);
    }
  };

  function syncSection() {
    return '<h2>同期（PCとスマホ）</h2><div class="card" data-sync-box>' +
      '<p data-sync-status></p><div data-sync-body></div></div>';
  }

  /* ---------- データ ---------- */
  function dataSection() {
    return '<h2>データ（全コース共通）</h2><div class="card">' +
      '<p class="small">学習記録はこの端末のブラウザに保存されます。バックアップや、ファイルで直接開いた版からの移行には「書き出し」と「読み込み」を使ってください。</p>' +
      '<div class="btn-row"><button class="btn" data-export>JSONを書き出す</button>' +
      '<label class="btn">JSONを読み込む<input type="file" accept="application/json,.json" data-import hidden></label></div>' +
      '<p class="small" data-import-msg aria-live="polite"></p>' +
      '<hr class="closing-rule">' +
      '<p class="small">全データ削除: 学習計画のチェック・メモ、成績、復習キュー、カードの箱、受験予定日をすべて消します。同期している場合は、ほかの端末からも消えます。元に戻せません。</p>' +
      '<button class="btn btn-danger" data-clear>全データを削除する</button></div>';
  }

  function bindData(ctx) {
    UI.$(ctx.el, '[data-export]').addEventListener('click', function () {
      var blob = new Blob([S.exportJSON()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'study-app-' + U.today() + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    });
    UI.$(ctx.el, '[data-import]').addEventListener('change', function (e) {
      var file = e.target.files[0];
      var msg = UI.$(ctx.el, '[data-import-msg]');
      if (!file) return;
      if (!confirm('今のデータを、読み込んだファイルの内容で置き換えます。よろしいですか？')) { e.target.value = ''; return; }
      file.text().then(function (text) {
        var r = S.importJSON(text);
        if (r.ok) {
          ctx.rerender();
          UI.toast('読み込みました');
        } else {
          msg.style.color = 'var(--shu)';
          msg.textContent = '読み込めませんでした（今のデータは変わっていません）: ' + r.errors.slice(0, 5).join(' / ') + (r.errors.length > 5 ? ' ほか' + (r.errors.length - 5) + '件' : '');
        }
        e.target.value = '';
      });
    });
    UI.$(ctx.el, '[data-clear]').addEventListener('click', function () {
      if (!confirm('すべての学習データを削除します。元に戻せません。よろしいですか？')) return;
      if (!confirm('本当に削除しますか？（書き出しをしていなければ、データは失われます）')) return;
      S.clearAll();
      location.hash = '#/';
    });
  }

  SA.views.settings = function (ctx) {
    if (!ctx.course) {
      ctx.el.innerHTML = '<h1>設定</h1>' +
        '<div class="card"><p>受験予定日は、各コースの設定で決めます。</p><ul>' +
        SA.courseList.map(function (c) { return '<li><a href="#/c/' + esc(c.id) + '/settings">' + esc(c.title) + 'の設定</a></li>'; }).join('') +
        '</ul></div>' + syncSection() + dataSection();
      SA.views.updateSyncBox(true);
      bindData(ctx);
      return;
    }
    var course = ctx.course, cs = ctx.cstate;
    ctx.el.innerHTML =
      '<h1>設定</h1>' +
      '<h2>受験予定日（' + esc(course.title) + '）</h2><div class="card">' +
      '<label class="field">受験予定日（未設定でもかまいません）<input type="date" data-exam value="' + esc(cs.examDate || '') + '"></label>' +
      '<div class="btn-row"><button class="btn btn-primary" data-save>保存</button><button class="btn" data-unset>未設定に戻す</button></div>' +
      '<p class="small">' + UI.examLine(course, cs, ctx.today) + '</p>' +
      '<ul class="small">' + course.config.editions.map(function (ed) {
        var range = (ed.from ? ed.from : '') + '〜' + (ed.to ? ed.to : '');
        return '<li><strong>' + esc(ed.id) + '</strong>（受験予定日 ' + esc(range) + '）: ' + esc(ed.label) + '</li>';
      }).join('') + '</ul>' +
      '<p class="small muted">未設定のときは両方の版を表示し、版で違う項目にバッジを付けます。設定すると、その版の項目だけが出題・復習の対象になり、もう一方の版だけの項目は「対象外」と表示します。版を変えても、学習履歴と成績は消えません。</p>' +
      '</div>' + syncSection() + dataSection();

    UI.$(ctx.el, '[data-save]').addEventListener('click', function () {
      var v = UI.$(ctx.el, '[data-exam]').value;
      if (v && !U.isISODate(v)) { UI.toast('日付の形式が正しくありません'); return; }
      M.setExamDate(cs, v || null);
      ctx.save();
      ctx.rerender();
      UI.toast('受験予定日を保存しました');
    });
    UI.$(ctx.el, '[data-unset]').addEventListener('click', function () {
      M.setExamDate(cs, null);
      ctx.save();
      ctx.rerender();
    });
    SA.views.updateSyncBox(true);
    bindData(ctx);
  };
})(window);
