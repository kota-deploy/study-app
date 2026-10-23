/* 起動とルーティング（#/ で始まるハッシュ）。file:// でも動く */
(function (root) {
  'use strict';
  var SA = root.SA;
  var S = SA.storage, U = SA.util, UI = SA.ui, Y = SA.sync;
  var esc = UI.esc;

  var TABS = [
    { page: '', label: 'ホーム', icon: 'home' },
    { page: 'plan', label: '計画', icon: 'plan' },
    { page: 'lessons', label: '解説', icon: 'lessons' },
    { page: 'drill', label: 'ドリル', icon: 'drill' },
    { page: 'cards', label: 'カード', icon: 'cards' },
    { page: 'stats', label: '成績', icon: 'stats' }
  ];

  var PAGES = {
    '': { view: 'courseHome', title: 'ホーム' },
    plan: { view: 'plan', title: '学習計画' },
    lessons: { view: 'lessons', title: '解説' },
    drill: { view: 'drill', title: 'ドリル' },
    cards: { view: 'cards', title: 'カード' },
    stats: { view: 'stats', title: '成績・復習' },
    sources: { view: 'sources', title: '出典一覧' },
    settings: { view: 'settings', title: '設定' }
  };

  function parseHash() {
    var h = location.hash.replace(/^#/, '') || '/';
    var qi = h.indexOf('?');
    var path = qi >= 0 ? h.slice(0, qi) : h;
    var query = {};
    if (qi >= 0) {
      h.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
    }
    return { parts: path.split('/').filter(Boolean), query: query };
  }

  var el = document.getElementById('view');
  var tabbar = document.getElementById('tabbar');
  var crumb = document.getElementById('crumb');
  var settingsLink = document.getElementById('settings-link');
  var syncChip = document.getElementById('sync-chip');
  var lastPath = null;
  settingsLink.innerHTML = UI.icon('settings');

  function route() {
    var r = parseHash();
    var p = r.parts;
    var ctx = {
      el: el,
      params: {},
      query: r.query,
      today: U.today(),
      course: null,
      cstate: null,
      save: function () { S.save(); },
      rerender: route
    };

    // 入口のログイン: ログインするまで、アプリの中身（学習記録を含む）を表示しない
    document.body.classList.toggle('locked', !Y.unlocked());
    if (!Y.unlocked()) {
      tabbar.hidden = true;
      crumb.textContent = '';
      document.title = 'ログイン - 学習ノート';
      SA.views.login(ctx);
      return;
    }

    var viewName, title = '';
    if (!p.length) viewName = 'home';
    else if (p[0] === 'add-course') { viewName = 'addCourse'; title = 'コースを追加'; }
    else if (p[0] === 'settings') { viewName = 'settings'; title = '設定'; }
    else if (p[0] === 'c' && SA.courses[p[1]]) {
      ctx.course = SA.courses[p[1]];
      ctx.cstate = S.course(ctx.course.id);
      var page = PAGES[p[2] || ''];
      if (!page) { location.hash = '#/c/' + ctx.course.id; return; }
      viewName = page.view;
      title = ctx.course.title + (p[2] ? '／' + page.title : '');
      if (p[2] === 'lessons' && p[3]) ctx.params.lessonId = p[3];
    } else {
      location.hash = '#/';
      return;
    }

    if (ctx.course) {
      var base = '#/c/' + ctx.course.id;
      tabbar.hidden = false;
      tabbar.innerHTML = TABS.map(function (t) {
        var current = (p[2] || '') === t.page;
        return '<a href="' + base + (t.page ? '/' + t.page : '') + '"' + (current ? ' aria-current="page"' : '') + '>' +
          UI.icon(t.icon) + '<span>' + esc(t.label) + '</span></a>';
      }).join('');
      settingsLink.href = base + '/settings';
      syncChip.href = base + '/settings';
    } else {
      tabbar.hidden = true;
      settingsLink.href = '#/settings';
      syncChip.href = '#/settings';
    }
    crumb.textContent = title;
    document.title = (title ? title + ' - ' : '') + '学習ノート';

    SA.views[viewName](ctx);

    var path = p.join('/');
    if (path !== lastPath) {
      window.scrollTo(0, 0);
      lastPath = path;
    }
  }

  function showSync(st) {
    syncChip.setAttribute('data-state', st.state);
    syncChip.textContent = Y.label(st.state);
    syncChip.title = st.message || '';
  }

  var warning = document.getElementById('storage-warning');
  var st = S.init();
  if (!st.persistent) warning.hidden = false;
  S.onChange(function (source) {
    // 途中で保存できなくなった場合（容量不足など）も警告を出す
    if (!S.isPersistent()) warning.hidden = false;
    // 他の端末の変更を取り込んだら、画面を描き直す（入力中のときは描き直さない）
    if (source === 'sync') {
      var active = document.activeElement;
      var typing = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
      if (!typing) route();
    }
  });
  // 入口の状態（通れるか、ログイン画面の準備ができたか）が変わったときだけ描き直す
  function gateKey() { return Y.unlocked() + '|' + Y.isReady() + '|' + (Y.status().state === 'loading'); }
  var lastGate = gateKey();
  Y.onStatus(function (s) {
    showSync(s);
    var g = gateKey();
    if (g !== lastGate) {
      var wasUnlocked = lastGate.indexOf('true') === 0;
      lastGate = g;
      if (!Y.unlocked() || !wasUnlocked) {
        if (!Y.unlocked() && SA.views.resetLogin) SA.views.resetLogin();
        route();
        return;
      }
    }
    if (SA.views.updateSyncBox) SA.views.updateSyncBox();
  });
  showSync(Y.status());

  window.addEventListener('hashchange', route);
  route();
  Y.init();
  SA.pwa.register(function (activate) {
    UI.toast('新しい版があります', { label: '更新する', run: activate });
  });
})(window);
