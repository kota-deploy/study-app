/*
 * 入口のログイン画面。config.js の requireLogin が true のとき、ログインするまでアプリの中身を表示しない
 *  - メールアドレスとパスワードでログイン
 *  - パスワードを忘れたときは、メールの確認コードでログインし、設定画面でパスワードを変える
 */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, Y = SA.sync;
  var esc = UI.esc;

  var mode = 'password'; // 'password' | 'code-email' | 'code-verify'
  var codeEmail = '';

  function form() {
    var st = Y.status().state;
    if (!Y.config()) {
      return '<p>ログインの準備ができていません。</p>' +
        '<p class="small muted">管理者向け: GitHub のリポジトリ変数（SUPABASE_URL と SUPABASE_ANON_KEY）を登録して、公開し直してください（docs/PHASE2_SETUP.md の3章）。</p>';
    }
    if (st === 'loading') return '<p class="muted">確認しています…</p>';
    if (!Y.isReady()) {
      return '<p>ログイン画面を読み込めませんでした。インターネットにつながっているか確かめて、ページを再読み込みしてください。</p>';
    }
    if (mode === 'code-email') {
      return '<p class="small">登録しているメールアドレスに、確認コードを送ります。</p>' +
        '<label class="field">メールアドレス<input type="email" autocomplete="email" data-email value="' + esc(codeEmail) + '"></label>' +
        '<div class="btn-row stretch"><button class="btn btn-primary" data-send>確認コードを送る</button></div>' +
        '<p class="small"><a href="#" data-mode="password">パスワードでログインする</a></p>';
    }
    if (mode === 'code-verify') {
      return '<p class="small"><strong>' + esc(codeEmail) + '</strong> にメールを送りました。メールに書かれた確認コードを入力してください。</p>' +
        '<label class="field">確認コード<input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" data-code></label>' +
        '<div class="btn-row stretch"><button class="btn btn-primary" data-verify>ログイン</button></div>' +
        '<p class="small"><a href="#" data-mode="code-email">メールを送り直す</a>　<a href="#" data-mode="password">パスワードでログインする</a></p>';
    }
    return '<label class="field">メールアドレス<input type="email" autocomplete="username" data-email></label>' +
      '<label class="field">パスワード<input type="password" autocomplete="current-password" data-password></label>' +
      '<div class="btn-row stretch"><button class="btn btn-primary" data-login>ログイン</button></div>' +
      '<p class="small"><a href="#" data-mode="code-email">パスワードを忘れた場合（メールの確認コードでログイン）</a></p>';
  }

  SA.views.login = function (ctx) {
    ctx.el.innerHTML =
      '<section class="login" aria-labelledby="login-title">' +
      '<div class="login-mark" aria-hidden="true"><svg viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#233f86"/><rect x="104" y="128" width="304" height="40" rx="8" fill="#fff"/><rect x="236" y="128" width="40" height="240" rx="8" fill="#fff"/><rect x="104" y="384" width="304" height="16" rx="8" fill="#ff8a78"/><rect x="104" y="414" width="304" height="16" rx="8" fill="#ff8a78"/></svg></div>' +
      '<h1 id="login-title">学習ノート</h1>' +
      '<p class="small muted">この学習ノートを使うには、ログインしてください。</p>' +
      '<div class="card login-card" data-login-body>' + form() + '<p class="small" data-msg aria-live="polite"></p></div>' +
      '</section>';
    bind(ctx);
  };

  function bind(ctx) {
    var el = ctx.el;
    var msg = function (text, bad) {
      var m = el.querySelector('[data-msg]');
      if (m) { m.textContent = text; m.style.color = bad ? 'var(--shu)' : ''; }
    };
    var busy = function (btn, on) { if (btn) btn.disabled = on; };

    UI.$$(el, '[data-mode]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var emailInput = el.querySelector('[data-email]');
        if (emailInput && emailInput.value) codeEmail = emailInput.value.trim();
        mode = a.getAttribute('data-mode');
        SA.views.login(ctx);
      });
    });

    var login = el.querySelector('[data-login]');
    if (login) {
      var submit = function () {
        var email = el.querySelector('[data-email]').value.trim();
        var pw = el.querySelector('[data-password]').value;
        if (!email || !pw) { msg('メールアドレスとパスワードを入力してください。', true); return; }
        busy(login, true);
        msg('確認しています。');
        // 成功すると同期の状態が変わり、app.js がアプリの画面に切り替える
        Y.signInWithPassword(email, pw).catch(function () {
          busy(login, false);
          msg('メールアドレスかパスワードが違います。', true);
        });
      };
      login.addEventListener('click', submit);
      el.querySelector('[data-password]').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    }

    var send = el.querySelector('[data-send]');
    if (send) send.addEventListener('click', function () {
      var email = el.querySelector('[data-email]').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg('メールアドレスの形式が正しくありません。', true); return; }
      busy(send, true);
      Y.sendLoginEmail(email).then(function () {
        codeEmail = email;
        mode = 'code-verify';
        SA.views.login(ctx);
      }).catch(function (e) {
        busy(send, false);
        msg('メールを送れませんでした。登録しているメールアドレスか確かめてください（' + e.message + '）', true);
      });
    });

    var verify = el.querySelector('[data-verify]');
    if (verify) verify.addEventListener('click', function () {
      var code = el.querySelector('[data-code]').value.replace(/\s/g, '');
      if (!/^\d{6,10}$/.test(code)) { msg('確認コードは数字6〜10桁です。', true); return; }
      busy(verify, true);
      Y.verifyCode(codeEmail, code).then(function () {
        mode = 'password';
      }).catch(function () {
        busy(verify, false);
        msg('確認コードが違うか、期限が切れています。', true);
      });
    });
  }

  // ログアウトしたら、次はパスワードの画面から
  SA.views.resetLogin = function () { mode = 'password'; codeEmail = ''; };
})(window);
