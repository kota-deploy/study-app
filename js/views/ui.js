/* 画面の共通部品: バッジ、出典、仕訳の表、金額 */
(function (root) {
  'use strict';
  var SA = root.SA;
  var U = SA.util, E = SA.edition, M = SA.model;
  var UI = SA.ui = {};
  SA.views = SA.views || {};

  var esc = U.esc;
  UI.esc = esc;

  // 本文: {{キー}} を設定値に置き換えてからエスケープする
  UI.text = function (course, s) {
    return esc(U.fillTemplate(s, course.config.values));
  };

  UI.yen = function (n) {
    return '<span class="num">' + U.fmtNum(n) + '</span>';
  };

  UI.badges = function (course, cstate, item, opt) {
    var o = opt || {};
    var cfg = course.config;
    var st = E.status(item, cfg, cstate.examDate);
    var lv = E.levelText(item, cfg, cstate.examDate);
    var out = [];
    var unconfirmed = E.levelValues(item).indexOf('級未確認') >= 0;
    out.push('<span class="badge ' + (unconfirmed ? 'badge-unconfirmed' : 'badge-level') + '">' + esc(lv) + '</span>');
    if (st.badge) out.push('<span class="badge ' + (st.inScope ? 'badge-edition' : 'badge-out') + '">' + esc(st.badge) + '</span>');
    if (item.needsReview) out.push('<span class="badge badge-review">要確認</span>');
    if (o.done) out.push('<span class="badge badge-done">' + esc(o.done) + '</span>');
    return '<div class="badges">' + out.join('') + '</div>';
  };

  UI.appliesText = function (course, item) {
    var cfg = course.config;
    if (item.appliesTo === cfg.allEditionsLabel) return cfg.editions.map(function (e) { return e.id; }).join('・') + '（両方）';
    return item.appliesTo + 'のみ';
  };

  UI.sourceItem = function (course, s) {
    var src = course.sources[s.ref];
    if (!src) return '<li>出典不明（' + esc(s.ref) + '）</li>';
    var parts = [];
    if (src.url) parts.push('<a href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">' + esc(src.title) + '</a>');
    else parts.push('<strong>' + esc(src.title) + '</strong>');
    if (s.loc) parts.push('<br><span class="muted">該当箇所: ' + esc(s.loc) + '</span>');
    var meta = [];
    if (src.publisher) meta.push(esc(src.publisher));
    if (src.retrieved) meta.push('取得日 ' + esc(src.retrieved));
    if (src.edition) meta.push('適用版 ' + esc(src.edition));
    if (meta.length) parts.push('<br><span class="muted">' + meta.join(' / ') + '</span>');
    return '<li>' + parts.join('') + '</li>';
  };

  UI.sources = function (course, item) {
    return '<ul class="sources">' + (item.source || []).map(function (s) { return UI.sourceItem(course, s); }).join('') + '</ul>';
  };

  // answer: { debit: [{account, amount}], credit: [...] }
  UI.journalTable = function (debit, credit) {
    var n = Math.max(debit.length, credit.length);
    var rows = '';
    for (var i = 0; i < n; i++) {
      var d = debit[i], c = credit[i];
      rows += '<tr><td>' + (d ? esc(d.account) : '') + '</td><td class="amt">' + (d ? UI.yen(d.amount) : '') + '</td>' +
        '<td>' + (c ? esc(c.account) : '') + '</td><td class="amt">' + (c ? UI.yen(c.amount) : '') + '</td></tr>';
    }
    return '<table class="jtable"><colgroup><col class="acc"><col class="amt"><col class="acc"><col class="amt"></colgroup>' +
      '<thead><tr><th>借方</th><th class="amt">金額</th><th>貸方</th><th class="amt">金額</th></tr></thead><tbody>' + rows + '</tbody></table>';
  };

  // 解説の例で使う形式 [[科目, 金額], ...]
  UI.pairsTable = function (j) {
    var f = function (p) { return { account: p[0], amount: p[1] }; };
    return UI.journalTable(j.debit.map(f), j.credit.map(f));
  };

  UI.progress = function (pct) {
    var p = Math.max(0, Math.min(100, pct));
    return '<div class="progress" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + p + '%"></span></div>';
  };

  UI.options = function (list, selected) {
    return list.map(function (o) {
      var v = typeof o === 'object' ? o.value : o;
      var l = typeof o === 'object' ? o.label : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(selected) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  };

  UI.weekOptions = function (course, selected) {
    return UI.options([{ value: '', label: 'すべての週' }].concat(course.plan.weeks.map(function (w) {
      return { value: w.week, label: '第' + w.week + '週 ' + w.theme };
    })), selected);
  };

  UI.topicOptions = function (items, selected) {
    return UI.options([{ value: '', label: 'すべての分野' }].concat(M.topics(items)), selected);
  };

  UI.examLine = function (course, cstate, today) {
    var info = M.examInfo(course, cstate, today);
    if (!info.examDate) {
      return '受験予定日: 未設定（両方の版を表示中） <a href="#/c/' + course.id + '/settings">設定する</a>';
    }
    var left = info.daysLeft >= 0 ? 'あと <strong class="num">' + info.daysLeft + '</strong> 日' : '受験日を過ぎています';
    return '受験予定日 <span class="num">' + esc(info.examDate) + '</span>（' + left + '）。' + esc(info.editionLabel);
  };

  // 線のアイコン（24×24、currentColor）
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
    plan: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3M8 17h6"/>',
    lessons: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7.5h8M8 11h6"/>',
    drill: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 7.5l3 3"/><path d="M12 20h8"/>',
    cards: '<rect x="6" y="3" width="14" height="17" rx="2"/><path d="M3.5 7v12.5A1.5 1.5 0 0 0 5 21h11"/><path d="M10 9h6M10 13h4"/>',
    stats: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  UI.icon = function (name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  };

  // 画面下に短い通知を出す（action: { label, run }）
  UI.toast = function (message, action) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + esc(message) + '</span>' + (action ? '<button type="button">' + esc(action.label) + '</button>' : '');
    document.body.appendChild(t);
    if (action) t.querySelector('button').addEventListener('click', function () { t.remove(); action.run(); });
    else setTimeout(function () { t.remove(); }, 3500);
  };

  UI.$ = function (el, sel) { return el.querySelector(sel); };
  UI.$$ = function (el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); };
})(window);
