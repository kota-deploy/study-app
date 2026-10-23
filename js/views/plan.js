/* 学習計画: 6週間。日ごとのタスクのチェック・編集、学習時間（分）、メモ */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, M = SA.model, U = SA.util, S = SA.storage;
  var esc = UI.esc;

  // 開いている週を覚えておく（再描画しても閉じないように）
  var openWeeks = null;

  SA.views.plan = function (ctx) {
    var course = ctx.course, cs = ctx.cstate, today = ctx.today;
    if (!openWeeks) {
      openWeeks = {};
      var cw = M.currentWeek(course, today);
      if (cw) openWeeks[cw.week] = true;
    }

    var html = '<h1>学習計画</h1><p class="small muted">平日2時間・週末4時間が目安です。タスクの文は自由に編集できます。</p>';
    course.plan.weeks.forEach(function (w) {
      var p = M.weekProgress(course, cs, w);
      html += '<details class="week" data-week="' + w.week + '"' + (openWeeks[w.week] ? ' open' : '') + '>' +
        '<summary><span class="week-no" aria-label="第' + w.week + '週">' + w.week + '</span>' +
        '<span><span class="week-theme">' + esc(w.theme) + '</span><br><span class="week-dates">' + esc(w.start.slice(5).replace('-', '/')) + '〜' + esc(w.end.slice(5).replace('-', '/')) + '</span></span>' +
        '<span class="week-pct" data-progress="' + w.week + '">' + p.pct + '%</span></summary>' +
        '<div class="week-body">' +
        '<div class="week-goal"><span class="small muted">その週のゴール</span><br>' + esc(w.goal) + '</div>' +
        '<div class="badges">' + w.levels.map(function (l) { return '<span class="badge badge-level">' + esc(l.topic) + ' ' + esc(l.level) + '</span>'; }).join('') + '</div>' +
        UI.progress(p.pct) +
        '<p class="small muted" data-summary="' + w.week + '">タスク ' + p.done + ' / ' + p.total + ' ・ 学習時間 ' + p.minutes + '分 / 目標 ' + p.targetMinutes + '分</p>';
      for (var i = 0; i < 7; i++) {
        var d = U.addDays(w.start, i);
        var e = M.dayEntry(course, cs, d);
        html += '<div class="day' + (d === today ? ' is-today' : '') + '" data-date="' + d + '">' +
          '<div class="day-head"><span>' + esc(U.shortDate(d)) + (d === today ? ' <span class="badge badge-level">今日</span>' : '') + '</span>' +
          '<span class="small muted">目標 ' + (M.targetMinutes(course, d) / 60) + '時間</span></div>' +
          e.tasks.map(function (t, k) {
            return '<div class="task' + (t.done ? ' done' : '') + '">' +
              '<input type="checkbox" data-k="' + k + '" aria-label="完了"' + (t.done ? ' checked' : '') + '>' +
              '<input type="text" data-k="' + k + '" value="' + esc(t.text) + '" aria-label="タスク">' +
              '<button class="btn btn-icon" data-del="' + k + '" aria-label="このタスクを削除">×</button></div>';
          }).join('') +
          '<button class="btn btn-small" data-add>＋ タスクを追加</button>' +
          '<div class="day-fields">' +
          '<label class="field">学習時間（分）<input type="number" min="0" max="1440" step="5" inputmode="numeric" data-minutes value="' + e.minutes + '"></label>' +
          '<label class="field">メモ<textarea data-memo rows="2">' + esc(e.memo) + '</textarea></label>' +
          '</div></div>';
      }
      html += '</div></details>';
    });
    ctx.el.innerHTML = html;

    UI.$$(ctx.el, 'details.week').forEach(function (det) {
      det.addEventListener('toggle', function () { openWeeks[det.getAttribute('data-week')] = det.open; });
    });

    function refreshSummary(date) {
      var w = M.weekOf(course, date);
      var p = M.weekProgress(course, cs, w);
      UI.$(ctx.el, '[data-progress="' + w.week + '"]').textContent = p.pct + '%';
      UI.$(ctx.el, '[data-summary="' + w.week + '"]').textContent = 'タスク ' + p.done + ' / ' + p.total + ' ・ 学習時間 ' + p.minutes + '分 / 目標 ' + p.targetMinutes + '分';
      var bar = UI.$(ctx.el, 'details[data-week="' + w.week + '"] .progress > span');
      if (bar) bar.style.width = p.pct + '%';
    }

    UI.$$(ctx.el, '.day').forEach(function (dayEl) {
      var date = dayEl.getAttribute('data-date');
      function update(fn, rerender) {
        var e = M.dayEntry(course, cs, date);
        fn(e);
        M.saveDay(cs, date, e);
        ctx.save();
        if (rerender) ctx.rerender();
        else refreshSummary(date);
      }
      UI.$$(dayEl, 'input[type="checkbox"]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          update(function (e) { e.tasks[Number(cb.getAttribute('data-k'))].done = cb.checked; });
          cb.parentNode.classList.toggle('done', cb.checked);
          if (cb.checked) { S.markActivity(course.id); ctx.save(); }
        });
      });
      UI.$$(dayEl, 'input[type="text"]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          update(function (e) { e.tasks[Number(inp.getAttribute('data-k'))].text = inp.value.trim(); });
        });
      });
      UI.$$(dayEl, '[data-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          update(function (e) { e.tasks.splice(Number(btn.getAttribute('data-del')), 1); }, true);
        });
      });
      UI.$(dayEl, '[data-add]').addEventListener('click', function () {
        update(function (e) { e.tasks.push({ text: '新しいタスク', done: false }); }, true);
      });
      UI.$(dayEl, '[data-minutes]').addEventListener('change', function (ev) {
        var v = Number(ev.target.value);
        update(function (e) { e.minutes = isFinite(v) ? v : 0; });
        if (v > 0) { S.markActivity(course.id); ctx.save(); }
      });
      UI.$(dayEl, '[data-memo]').addEventListener('change', function (ev) {
        update(function (e) { e.memo = ev.target.value; });
      });
    });
  };
})(window);
