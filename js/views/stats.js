/* 成績・復習: 正答率の推移、間違いの多い分野、復習キュー、カードの箱 */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, M = SA.model;
  var esc = UI.esc;

  // 直近14日分の正答率の棒グラフ（インラインSVG）
  function chart(days) {
    var data = days.slice(-14);
    if (!data.length) return '<p class="muted">まだ記録がありません。ドリルを解くと表示されます。</p>';
    var W = 360, H = 190, left = 34, bottom = 30, top = 18, plotH = H - top - bottom;
    var step = (W - left - 6) / data.length;
    var bw = Math.min(26, step * 0.7);
    var grid = [0, 50, 100].map(function (v) {
      var y = top + plotH * (1 - v / 100);
      return '<line x1="' + left + '" y1="' + y + '" x2="' + W + '" y2="' + y + '" class="chart-grid"/>' +
        '<text x="' + (left - 6) + '" y="' + (y + 4) + '" class="dg-ts" text-anchor="end">' + v + '%</text>';
    }).join('');
    var bars = data.map(function (d, i) {
      var h = Math.max(2, plotH * d.pct / 100);
      var x = left + i * step + (step - bw) / 2;
      var y = top + plotH - h;
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" class="chart-bar">' +
        '<title>' + d.date + ' 正答率 ' + d.pct + '%（' + d.correct + '/' + d.total + '問）</title></rect>' +
        (data.length <= 10 ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" class="dg-ts" text-anchor="middle">' + d.pct + '</text>' : '') +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 12) + '" class="dg-ts" text-anchor="middle">' + Number(d.date.slice(8)) + '</text>';
    }).join('');
    var summary = data.map(function (d) { return d.date + ' ' + d.pct + '%'; }).join('、');
    return '<svg class="dg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="acc-t acc-d">' +
      '<title id="acc-t">日ごとの正答率</title><desc id="acc-d">' + esc(summary) + '</desc>' + grid + bars + '</svg>' +
      '<p class="small muted">横軸は日付（日）。棒にカーソルを合わせると詳細が出ます。</p>';
  }

  SA.views.stats = function (ctx) {
    var course = ctx.course, cs = ctx.cstate, today = ctx.today;
    var base = '#/c/' + course.id;
    var log = cs.drill.log;
    var correct = log.filter(function (l) { return l.correct; }).length;
    var topics = M.byTopic(course, cs);
    var review = cs.drill.review;
    var rIds = Object.keys(review).filter(function (id) { return !review[id].done; }).sort(function (a, b) { return review[a].due < review[b].due ? -1 : 1; });
    var boxes = M.cardBoxes(course, cs);
    var dueN = M.dueDrillIds(course, cs, today).length;

    ctx.el.innerHTML =
      '<h1>成績・復習</h1>' +
      '<div class="stats">' +
      '<div class="stat"><div class="label">回答数</div><div class="value">' + log.length + '<small>問</small></div></div>' +
      '<div class="stat"><div class="label">正答率</div><div class="value">' + (log.length ? Math.round(correct / log.length * 100) : 0) + '<small>%</small></div></div>' +
      '<div class="stat"><div class="label">復習キュー</div><div class="value">' + rIds.length + '<small>問</small></div><div class="sub">今日 ' + dueN + '問</div></div>' +
      '<div class="stat"><div class="label">学習した日</div><div class="value">' + Object.keys(cs.activity).length + '<small>日</small></div></div>' +
      '</div>' +
      '<div class="card"><h2>正答率の推移</h2>' + chart(M.accuracyByDay(cs)) + '</div>' +
      '<div class="card"><h2>間違いの多い分野</h2>' +
      (topics.length ?
        '<table class="simple"><thead><tr><th>分野</th><th class="r">回答</th><th class="r">不正解</th><th class="r">正答率</th></tr></thead><tbody>' +
        topics.map(function (t) {
          return '<tr><td>' + esc(t.topic) + '<br><span class="small muted">第' + t.week + '週</span></td><td class="r num">' + t.total + '</td>' +
            '<td class="r num">' + t.wrong + '</td><td class="r num">' + t.pct + '%</td></tr>';
        }).join('') + '</tbody></table>' : '<p class="muted">まだ記録がありません。</p>') +
      '</div>' +
      '<div class="card"><h2>復習キュー</h2>' +
      (dueN ? '<a class="btn btn-primary" href="' + base + '/drill?mode=review">今日の復習を解く（' + dueN + '問）</a>' : '<p class="small muted">今日の復習はありません。</p>') +
      (rIds.length ? '<ul class="list">' + rIds.map(function (id) {
        var q = course.drillsById[id];
        if (!q) return '';
        var r = review[id];
        var st = M.status(course, cs, q);
        return '<li class="' + (st.inScope ? '' : 'is-out') + '"><a class="list-link" href="' + base + '/drill?q=' + esc(id) + '">' +
          '<div class="list-title">' + esc(q.text.length > 40 ? q.text.slice(0, 40) + '…' : q.text) + '</div>' +
          '<div class="list-meta">次回 ' + esc(r.due) + (r.due <= today ? '（今日）' : '') + ' ・ ' + (r.stage + 1) + '回目の復習' +
          (st.inScope ? '' : ' ・ 対象外（出題しない）') + '</div></a></li>';
      }).join('') + '</ul>' : '') +
      '</div>' +
      '<div class="card"><h2>フラッシュカードの箱</h2><div class="boxes">' +
      boxes.map(function (n, i) { return '<div><span class="small muted">箱' + (i + 1) + '</span><b>' + n + '</b></div>'; }).join('') +
      '</div><p class="small muted">まだ学習していないカード: ' + M.newCards(course, cs).length + '枚</p></div>';
  };
})(window);
