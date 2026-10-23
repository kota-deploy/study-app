/* 出典一覧: 資料ごとの利用件数、設定データの数値、要確認と級未確認の一覧 */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, E = SA.edition;
  var esc = UI.esc;

  SA.views.sources = function (ctx) {
    var course = ctx.course, cs = ctx.cstate;
    var base = '#/c/' + course.id;
    var items = []
      .concat(course.lessons.map(function (x) { return { kind: '解説', item: x, href: base + '/lessons/' + x.id, label: x.title }; }))
      .concat(course.drills.map(function (x) { return { kind: '問題', item: x, href: base + '/drill?q=' + x.id, label: x.text }; }))
      .concat(course.cards.map(function (x) { return { kind: 'カード', item: x, href: null, label: x.front }; }))
      .concat(course.accounts.map(function (x) { return { kind: '勘定科目', item: x, href: null, label: x.name }; }));

    var usage = {};
    items.forEach(function (e) {
      (e.item.source || []).forEach(function (s) { usage[s.ref] = (usage[s.ref] || 0) + 1; });
    });

    var groups = [
      { title: '公式資料（日本商工会議所）', keys: [] },
      { title: '公的機関の資料', keys: [] },
      { title: '公式資料以外', keys: [] }
    ];
    Object.keys(course.sources).forEach(function (k) {
      var s = course.sources[k];
      var g = !s.official ? 2 : (s.publisher === '日本商工会議所' ? 0 : 1);
      groups[g].keys.push(k);
    });

    var srcHtml = groups.map(function (g) {
      return '<h2>' + esc(g.title) + '</h2><div class="card"><ul class="sources">' + g.keys.map(function (k) {
        var s = course.sources[k];
        return '<li>' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title) + '</a>' : '<strong>' + esc(s.title) + '</strong>') +
          '<br><span class="muted">' + [s.publisher, s.retrieved ? '取得日 ' + s.retrieved : '', s.edition ? '適用版 ' + s.edition : '']
            .filter(Boolean).map(esc).join(' / ') + ' ・ 参照 ' + (usage[k] || 0) + '件</span>' +
          (s.note ? '<br><span class="small muted">' + esc(s.note) + '</span>' : '') + '</li>';
      }).join('') + '</ul></div>';
    }).join('');

    var values = course.config.values || {};
    var valHtml = '<h2>設定データの数値</h2><div class="card"><table class="simple"><thead><tr><th>項目</th><th>値</th><th>出典</th></tr></thead><tbody>' +
      Object.keys(values).map(function (k) {
        var v = values[k];
        return '<tr><td>' + esc(k) + (v.note ? '<br><span class="small muted">' + esc(v.note) + '</span>' : '') + '</td>' +
          '<td class="num">' + esc(String(v.value) + (v.unit || '')) + '</td>' +
          '<td class="small">' + v.source.map(function (s) { return esc((course.sources[s.ref] || {}).title || s.ref); }).join('<br>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    var listOf = function (pred) {
      var found = items.filter(function (e) { return pred(e.item); });
      if (!found.length) return '<p class="muted">ありません。</p>';
      return '<ul class="list">' + found.map(function (e) {
        var inner = '<div class="list-title">' + esc(e.kind) + ': ' + esc(e.label.length > 50 ? e.label.slice(0, 50) + '…' : e.label) + '</div>' +
          '<div class="list-meta">級: ' + esc(E.levelText(e.item, course.config, cs.examDate)) + '</div>';
        return '<li>' + (e.href ? '<a class="list-link" href="' + esc(e.href) + '">' + inner + '</a>' : '<div class="list-link">' + inner + '</div>') + '</li>';
      }).join('') + '</ul>';
    };

    ctx.el.innerHTML =
      '<h1>出典一覧</h1>' +
      '<p class="small muted">問題・解説・カードは、下の資料をもとにオリジナルで作っています。公式資料にない補足や例えは「補足（公式資料外）」と示しています。</p>' +
      srcHtml + valHtml +
      '<h2>要確認（needsReview）</h2><div class="card"><p class="small muted">内容に確信が持てないため、公式資料での確認をおすすめする項目です。</p>' +
      listOf(function (x) { return x.needsReview; }) + '</div>' +
      '<h2>級未確認</h2><div class="card"><p class="small muted">区分表で級を確認できなかった項目です。</p>' +
      listOf(function (x) { return E.levelValues(x).indexOf('級未確認') >= 0; }) + '</div>';
  };
})(window);
