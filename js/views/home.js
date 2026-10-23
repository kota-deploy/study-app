/* ホーム（コース一覧）と「コースを追加」の案内 */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, M = SA.model, S = SA.storage, U = SA.util;
  var esc = UI.esc;

  var HIDE_INSTALL_KEY = 'studyApp.hideInstallHint';

  function installHint() {
    var hidden = false;
    try { hidden = localStorage.getItem(HIDE_INSTALL_KEY) === '1'; } catch (e) { /* 何もしない */ }
    if (hidden || !SA.pwa || SA.pwa.isStandalone()) return '';
    var how;
    if (SA.pwa.canPrompt()) {
      how = '<button class="btn btn-primary btn-small" data-install>ホーム画面に追加</button>';
    } else if (SA.pwa.isIOS()) {
      how = '<ol class="small"><li>Safari の共有ボタン（四角から上向きの矢印）を押す</li><li>「ホーム画面に追加」を選ぶ</li></ol>';
    } else if (location.protocol === 'file:') {
      return '';
    } else {
      how = '<p class="small">ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選んでください。</p>';
    }
    return '<div class="card install-card"><div class="card-head"><h2>ホーム画面に追加</h2>' +
      '<button class="btn btn-icon btn-small" data-hide-install aria-label="この案内を閉じる">×</button></div>' +
      '<p class="small">アイコンから開くと、アプリのように全画面で使えます。オフラインでも開けます。</p>' + how + '</div>';
  }

  SA.views.home = function (ctx) {
    var cards = SA.courseList.map(function (course) {
      var cs = S.course(course.id);
      var today = ctx.today;
      var week = M.currentWeek(course, today);
      var prog = week ? M.weekProgress(course, cs, week) : null;
      var due = M.dueDrillIds(course, cs, today).length + M.dueCards(course, cs, today).length;
      var info = M.examInfo(course, cs, today);
      return '<a class="course-card" href="#/c/' + esc(course.id) + '">' +
        '<div class="course-mark" aria-hidden="true">' + esc(course.mark) + '</div>' +
        '<div><h2>' + esc(course.title) + '</h2><p>' + esc(course.subtitle) + '</p>' +
        '<div class="course-facts">' +
        (prog ? '<span>今週 <b>' + prog.pct + '%</b></span>' : '') +
        '<span>復習待ち <b>' + due + '</b></span>' +
        '<span>' + (info.examDate ? '受験まで <b>' + info.daysLeft + '</b>日' : '受験日は未設定') + '</span>' +
        '</div></div></a>';
    }).join('');

    ctx.el.innerHTML =
      '<div class="page-title"><h1>学習コース</h1><span class="date">' + esc(U.shortDate(ctx.today)) + '</span></div>' +
      installHint() +
      '<div class="course-grid">' + cards +
      '<a class="course-card add" href="#/add-course"><div class="course-mark" aria-hidden="true">＋</div>' +
      '<div><h2>コースを追加</h2><p>簿記以外の学習内容を追加する手順</p></div></a>' +
      '</div>';

    var hide = UI.$(ctx.el, '[data-hide-install]');
    if (hide) hide.addEventListener('click', function () {
      try { localStorage.setItem(HIDE_INSTALL_KEY, '1'); } catch (e) { /* 何もしない */ }
      ctx.rerender();
    });
    var inst = UI.$(ctx.el, '[data-install]');
    if (inst) inst.addEventListener('click', function () { SA.pwa.prompt().then(ctx.rerender); });
  };

  SA.views.addCourse = function (ctx) {
    ctx.el.innerHTML =
      '<h1>コースを追加する</h1>' +
      '<div class="card"><p>このアプリは、ブラウザの制約でフォルダの中身を自動では読み込めません。コースは次の手順で追加します。</p>' +
      '<ol class="steps-list">' +
      '<li><code>courses/_template/</code> フォルダをコピーし、<code>courses/新しいID/</code> という名前にします（例: <code>courses/english/</code>）。</li>' +
      '<li>コピーした各ファイルの <code>DATA_TEMPLATE_</code> を、コースごとの名前（例: <code>DATA_ENGLISH_</code>）に置き換えます。</li>' +
      '<li><code>course.js</code> の <code>id</code>・<code>title</code> と、<code>data.js</code> の版の定義（<code>editions</code>）を書き換えます。版がないコースは、版を1つだけ定義します。</li>' +
      '<li>解説・問題・カード・学習計画のデータを書きます。問題の形式は「仕訳」「数値」「選択」の3つが使えます。</li>' +
      '<li><code>index.html</code> の「コース」の欄に、簿記と同じ形で <code>&lt;script&gt;</code> タグを追加します。<code>course.js</code> を最後に置きます。</li>' +
      '<li><code>sw.js</code> の <code>APP_FILES</code> にも同じファイルを追加し、<code>CACHE_VERSION</code> を1つ上げます（オフラインで開けるように）。</li>' +
      '<li><code>node tests/validate-data.js</code> でデータを検証し、ブラウザを再読み込みします。</li>' +
      '</ol>' +
      '<p class="small muted">詳しくは <code>docs/ADD_COURSE.md</code> を見てください。学習記録はコースごとに分けて保存され、他のコースには影響しません。</p></div>' +
      '<a class="btn" href="#/">ホームに戻る</a>';
  };
})(window);
