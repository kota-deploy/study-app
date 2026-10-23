/* 解説: 一覧（週・分野で絞り込み）と詳細（7つの節） */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, M = SA.model;
  var esc = UI.esc;

  var filter = { week: '', topic: '' };

  SA.views.lessons = function (ctx) {
    if (ctx.params.lessonId) return detail(ctx);
    var course = ctx.course, cs = ctx.cstate;
    var base = '#/c/' + course.id;
    var list = course.lessons.filter(function (l) {
      return (!filter.week || String(l.week) === String(filter.week)) && (!filter.topic || l.topic === filter.topic);
    });

    ctx.el.innerHTML =
      '<h1>解説</h1>' +
      '<div class="filters">' +
      '<label class="field">週<select data-f="week">' + UI.weekOptions(course, filter.week) + '</select></label>' +
      '<label class="field">分野<select data-f="topic">' + UI.topicOptions(course.lessons, filter.topic) + '</select></label>' +
      '</div>' +
      '<div class="card"><ul class="list">' +
      (list.length ? list.map(function (l) {
        var st = M.status(course, cs, l);
        return '<li class="' + (st.inScope ? '' : 'is-out') + '"><a class="list-link" href="' + base + '/lessons/' + esc(l.id) + '">' +
          '<div class="list-title">' + esc(l.title) + '</div>' +
          '<div class="list-meta">第' + l.week + '週 ・ ' + esc(l.topic) + '</div>' +
          UI.badges(course, cs, l, { done: cs.lessons[l.id] ? '読んだ' : '' }) + '</a></li>';
      }).join('') : '<li class="muted">該当する解説がありません。</li>') +
      '</ul></div>';

    UI.$$(ctx.el, 'select[data-f]').forEach(function (s) {
      s.addEventListener('change', function () {
        filter[s.getAttribute('data-f')] = s.value;
        ctx.rerender();
      });
    });
  };

  function detail(ctx) {
    var course = ctx.course, cs = ctx.cstate;
    var base = '#/c/' + course.id;
    var l = course.lessonsById[ctx.params.lessonId];
    if (!l) { ctx.el.innerHTML = '<p>解説が見つかりません。</p><a class="btn" href="' + base + '/lessons">一覧へ</a>'; return; }

    M.markLessonRead(course, cs, l, ctx.today);
    ctx.save();

    var idx = course.lessons.indexOf(l);
    var prev = course.lessons[idx - 1], next = course.lessons[idx + 1];
    var related = course.drills.filter(function (q) { return q.lessonId === l.id; });
    var st = M.status(course, cs, l);
    var t = function (s) { return UI.text(course, s); };
    var ex = l.example || { text: [] };

    ctx.el.innerHTML =
      '<article class="lesson">' +
      '<p class="small muted">第' + l.week + '週 ・ ' + esc(l.topic) + '</p>' +
      '<h1>' + esc(l.title) + '</h1>' +
      UI.badges(course, cs, l) +
      (st.inScope ? '' : '<p class="small muted">受験予定日の版では、この項目は出題対象外です。</p>') +
      '<section><h2>一言で</h2><p class="summary">' + t(l.summary) + '</p></section>' +
      '<section><h2>図解</h2><div class="figure">' + l.diagrams.join('') + '</div></section>' +
      '<section><h2>しくみ</h2><ol>' + l.steps.map(function (s) { return '<li>' + t(s) + '</li>'; }).join('') + '</ol></section>' +
      '<section><h2>例</h2>' + ex.text.map(function (s) { return '<p>' + t(s) + '</p>'; }).join('') +
      (ex.journal || []).map(UI.pairsTable).join('') + '</section>' +
      '<section><h2>よくある間違い</h2><ul>' + l.mistakes.map(function (s) { return '<li>' + t(s) + '</li>'; }).join('') + '</ul></section>' +
      '<section><h2>仕事とのつながり' + (l.work.official ? '' : '<span class="note-label">補足（公式資料外）</span>') + '</h2><p>' + t(l.work.text) + '</p></section>' +
      '<section><h2>出典と適用版</h2>' +
      '<p class="small">適用版: ' + esc(UI.appliesText(course, l)) + ' ・ 級: ' + esc(SA.edition.levelText(l, course.config, null)) + '</p>' +
      UI.sources(course, l) + '</section>' +
      (related.length ? '<section><h2>この解説の問題（' + related.length + '問）</h2>' +
        '<a class="btn btn-primary" href="' + base + '/drill?lesson=' + esc(l.id) + '">この解説の問題を解く</a></section>' : '') +
      '</article>' +
      '<hr class="closing-rule">' +
      '<nav class="lesson-nav" aria-label="前後の解説">' +
      (prev ? '<a class="btn" href="' + base + '/lessons/' + esc(prev.id) + '"><span><span class="small muted">前へ</span><br>' + esc(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a class="btn next" href="' + base + '/lessons/' + esc(next.id) + '"><span><span class="small muted">次へ</span><br>' + esc(next.title) + '</span></a>' : '<span></span>') +
      '</nav>' +
      '<p><a href="' + base + '/lessons">解説の一覧へ</a></p>';
  }
})(window);
