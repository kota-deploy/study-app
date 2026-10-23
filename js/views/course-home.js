/*
 * コースのホーム。T字勘定のかたちで、左（借方）に今日やること、右（貸方）に残高を置く
 * 今日のタスク、今週の進捗率、連続学習日数、復習待ち、受験予定日までの残り日数、未学習の項目数
 */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, M = SA.model, U = SA.util;
  var esc = UI.esc;

  SA.views.courseHome = function (ctx) {
    var course = ctx.course, cs = ctx.cstate, today = ctx.today;
    var base = '#/c/' + course.id;
    var week = M.currentWeek(course, today);
    var prog = week ? M.weekProgress(course, cs, week) : { pct: 0, done: 0, total: 0, minutes: 0, targetMinutes: 0 };
    var dueD = M.dueDrillIds(course, cs, today).length;
    var dueC = M.dueCards(course, cs, today).length;
    var info = M.examInfo(course, cs, today);
    var un = M.unlearned(course, cs);
    var inPlan = !!M.weekOf(course, today);
    var taskDate = inPlan ? today : (today < course.plan.start ? course.plan.start : null);

    var tasksHtml;
    if (taskDate) {
      var entry = M.dayEntry(course, cs, taskDate);
      tasksHtml = (inPlan ? '' : '<p class="small muted">' + esc(U.shortDate(course.plan.start)) + 'から始まります</p>') +
        entry.tasks.map(function (t, i) {
          return '<label class="today-task' + (t.done ? ' done' : '') + '"><input type="checkbox" data-task="' + i + '"' + (t.done ? ' checked' : '') + '>' +
            '<span>' + esc(t.text) + '</span></label>';
        }).join('') +
        (entry.tasks.length ? '' : '<p class="small muted">タスクはありません</p>');
    } else {
      tasksHtml = '<p class="small">6週間の計画は終わりました。復習とカードを続けましょう。</p>';
    }

    var balance = function (k, v, unit, s) {
      return '<div class="balance"><span class="k">' + k + '</span><span class="v">' + v + (unit ? '<small>' + unit + '</small>' : '') + '</span>' +
        (s ? '<span class="s">' + s + '</span>' : '') + '</div>';
    };

    ctx.el.innerHTML =
      '<section class="ledger" aria-label="今日の学習">' +
      '<div class="ledger-head">' +
      (week ? '<div class="ledger-week">第' + week.week + '週 ' + esc(week.start.slice(5).replace('-', '/')) + '〜' + esc(week.end.slice(5).replace('-', '/')) + '</div>' +
        '<p class="ledger-title">' + esc(week.theme) + '</p>' : '<p class="ledger-title">' + esc(course.title) + '</p>') +
      '</div>' +
      '<div class="ledger-body">' +
      '<div class="ledger-side"><div class="ledger-label"><span>今日やること</span><span>' + esc(U.shortDate(taskDate || today)) + '</span></div>' + tasksHtml + '</div>' +
      '<div class="ledger-side"><div class="ledger-label"><span>残高</span></div>' +
      balance('復習待ち', dueD + dueC, '件', 'ドリル ' + dueD + '、カード ' + dueC) +
      balance('連続学習', M.streak(cs, today), '日', '') +
      (info.examDate ?
        balance('受験まで', info.daysLeft >= 0 ? info.daysLeft : 0, '日', esc(info.edition) + 'の範囲') :
        '<div class="balance"><span class="k">受験まで</span><a class="small" href="' + base + '/settings">受験予定日を設定</a></div>') +
      '</div></div>' +
      '<div class="ledger-foot"><span>今週 <b class="num">' + prog.pct + '%</b></span>' + UI.progress(prog.pct) +
      '<span class="muted">' + prog.done + '/' + prog.total + '</span></div>' +
      '</section>' +

      '<div class="quick">' +
      '<a class="primary" href="' + base + '/drill?mode=review"><strong>ドリルの復習</strong><span>今日の分 ' + dueD + '問</span></a>' +
      '<a href="' + base + '/cards"><strong>フラッシュカード</strong><span>復習待ち ' + dueC + '枚</span></a>' +
      '<a href="' + base + '/plan"><strong>学習計画</strong><span>時間とメモを記録</span></a>' +
      '<a href="' + base + '/lessons"><strong>解説を読む</strong><span>未読 ' + un.lessons + '項目</span></a>' +
      '</div>' +

      (week ? '<div class="card"><div class="card-head"><h2>今週のゴール</h2></div>' +
        '<p>' + esc(week.goal) + '</p>' +
        '<div class="badges">' + week.levels.map(function (l) { return '<span class="badge badge-level">' + esc(l.topic) + ' ' + esc(l.level) + '</span>'; }).join('') + '</div>' +
        '<div class="kv"><span class="muted">学習時間</span><span><b class="num">' + prog.minutes + '</b> / ' + prog.targetMinutes + '分</span></div></div>' : '') +

      '<div class="card"><div class="card-head"><h2>まだ手を付けていない項目</h2><span class="small muted">' + (info.edition ? esc(info.edition) + 'の範囲' : '両方の版') + '</span></div>' +
      '<div class="kv"><span>解説</span><b class="num">' + un.lessons + '</b></div>' +
      '<div class="kv"><span>問題</span><b class="num">' + un.drills + '</b></div>' +
      '<div class="kv"><span>カード</span><b class="num">' + un.cards + '</b></div></div>' +

      '<p class="small muted">' + UI.examLine(course, cs, today) + '　<a href="' + base + '/sources">出典一覧</a></p>';

    UI.$$(ctx.el, 'input[data-task]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var e = M.dayEntry(course, cs, taskDate);
        e.tasks[Number(cb.getAttribute('data-task'))].done = cb.checked;
        M.saveDay(cs, taskDate, e);
        if (cb.checked) SA.storage.markActivity(course.id);
        ctx.save();
        ctx.rerender();
      });
    });
  };
})(window);
