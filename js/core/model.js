/* 画面に依存しない集計と更新（学習計画、進捗、復習、成績）。Node のテストからも使う */
(function (root) {
  'use strict';
  var SA = root.SA = root.SA || {};
  var U = SA.util, E = SA.edition, R = SA.srs, S = SA.storage;
  var M = SA.model = {};

  /* ---------- 版 ---------- */
  M.status = function (course, cstate, item) {
    return E.status(item, course.config, cstate.examDate);
  };
  M.inScope = function (course, cstate, item) {
    return E.inScope(item, course.config, cstate.examDate);
  };
  M.examInfo = function (course, cstate, today) {
    var ed = E.active(course.config, cstate.examDate);
    var edObj = ed ? E.editionById(course.config, ed) : null;
    return {
      examDate: cstate.examDate,
      daysLeft: cstate.examDate ? U.diffDays(today, cstate.examDate) : null,
      edition: ed,
      editionLabel: edObj ? edObj.label : '未設定（両方の版を表示）'
    };
  };
  M.setExamDate = function (cstate, date) {
    cstate.examDate = date || null;
    cstate.examDateUpdatedAt = U.nowStamp();
  };

  /* ---------- 学習計画 ---------- */
  M.planDays = function (course) {
    var days = [];
    course.plan.weeks.forEach(function (w) {
      w.days.forEach(function (tasks, i) {
        days.push({ date: U.addDays(w.start, i), week: w.week, tasks: tasks });
      });
    });
    return days;
  };

  M.weekOf = function (course, date) {
    var ws = course.plan.weeks;
    for (var i = 0; i < ws.length; i++) {
      if (date >= ws[i].start && date <= ws[i].end) return ws[i];
    }
    return null;
  };

  // 計画期間の前なら第1週、後なら最終週
  M.currentWeek = function (course, today) {
    var ws = course.plan.weeks;
    if (!ws.length) return null;
    if (today < ws[0].start) return ws[0];
    if (today > ws[ws.length - 1].end) return ws[ws.length - 1];
    return M.weekOf(course, today);
  };

  M.defaultTasks = function (course, date) {
    var w = M.weekOf(course, date);
    if (!w) return [];
    return (w.days[U.diffDays(w.start, date)] || []).map(function (t) { return { text: t, done: false }; });
  };

  M.dayEntry = function (course, cstate, date) {
    var saved = cstate.plan[date];
    return {
      tasks: saved && saved.tasks ? saved.tasks : M.defaultTasks(course, date),
      minutes: saved ? saved.minutes : 0,
      memo: saved ? saved.memo : ''
    };
  };

  M.saveDay = function (cstate, date, entry) {
    cstate.plan[date] = {
      tasks: entry.tasks.map(function (t) { return { text: String(t.text), done: !!t.done }; }),
      minutes: Math.max(0, Math.min(1440, Math.round(Number(entry.minutes) || 0))),
      memo: String(entry.memo || ''),
      updatedAt: U.nowStamp()
    };
  };

  M.targetMinutes = function (course, date) {
    var st = course.config.study;
    if (!st) return null;
    return U.isWeekend(date) ? st.weekendMinutes.value : st.weekdayMinutes.value;
  };

  M.weekProgress = function (course, cstate, week) {
    var done = 0, total = 0, minutes = 0, target = 0;
    for (var i = 0; i < 7; i++) {
      var d = U.addDays(week.start, i);
      var e = M.dayEntry(course, cstate, d);
      total += e.tasks.length;
      done += e.tasks.filter(function (t) { return t.done; }).length;
      minutes += e.minutes;
      target += M.targetMinutes(course, d) || 0;
    }
    return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0, minutes: minutes, targetMinutes: target };
  };

  /* ---------- 連続学習日数 ---------- */
  // 今日まだ学習していなければ、昨日までの連続日数を数える
  M.streak = function (cstate, today) {
    var act = cstate.activity;
    var d = act[today] ? today : U.addDays(today, -1);
    var n = 0;
    while (act[d]) { n++; d = U.addDays(d, -1); }
    return n;
  };

  /* ---------- 復習・未学習 ---------- */
  M.dueDrillIds = function (course, cstate, today) {
    return R.dueReviewIds(cstate.drill.review, today).filter(function (id) {
      var q = course.drillsById[id];
      return q && M.inScope(course, cstate, q);
    });
  };

  M.dueCards = function (course, cstate, today) {
    return course.cards.filter(function (c) {
      var st = cstate.cards[c.id];
      return st && st.due <= today && M.inScope(course, cstate, c);
    });
  };

  M.newCards = function (course, cstate) {
    return course.cards.filter(function (c) {
      return !cstate.cards[c.id] && M.inScope(course, cstate, c);
    });
  };

  M.answeredIds = function (cstate) {
    var seen = {};
    cstate.drill.log.forEach(function (l) { seen[l.qid] = true; });
    return seen;
  };

  M.unlearned = function (course, cstate) {
    var answered = M.answeredIds(cstate);
    var scope = function (x) { return M.inScope(course, cstate, x); };
    var lessons = course.lessons.filter(scope).filter(function (l) { return !cstate.lessons[l.id]; }).length;
    var drills = course.drills.filter(scope).filter(function (q) { return !answered[q.id]; }).length;
    var cards = course.cards.filter(scope).filter(function (c) { return !cstate.cards[c.id]; }).length;
    return { lessons: lessons, drills: drills, cards: cards, total: lessons + drills + cards };
  };

  /* ---------- 記録 ---------- */
  M.markLessonRead = function (course, cstate, lesson, today) {
    if (!cstate.lessons[lesson.id]) cstate.lessons[lesson.id] = today;
    S.markActivity(course.id);
  };

  // 対象外の問題は、間違えても復習キューに入れない
  M.recordDrill = function (course, cstate, q, correct, today) {
    cstate.drill.log.push({ qid: q.id, date: today, correct: !!correct, ts: U.nowStamp() });
    var result = 'outOfScope';
    if (M.inScope(course, cstate, q)) {
      result = R.onDrillResult(cstate.drill.review, q.id, !!correct, today, course.config.srs.reviewOffsets.value);
    }
    S.markActivity(course.id);
    return result;
  };

  M.rateCard = function (course, cstate, card, rating, today) {
    cstate.cards[card.id] = R.rateCard(cstate.cards[card.id], rating, today, course.config.srs.leitnerDays.value);
    S.markActivity(course.id);
    return cstate.cards[card.id];
  };

  /* ---------- 成績 ---------- */
  M.accuracyByDay = function (cstate) {
    var by = {};
    cstate.drill.log.forEach(function (l) {
      var d = by[l.date] || (by[l.date] = { date: l.date, total: 0, correct: 0 });
      d.total++;
      if (l.correct) d.correct++;
    });
    return Object.keys(by).sort().map(function (k) {
      var d = by[k];
      d.pct = Math.round(d.correct / d.total * 100);
      return d;
    });
  };

  M.byTopic = function (course, cstate) {
    var by = {};
    cstate.drill.log.forEach(function (l) {
      var q = course.drillsById[l.qid];
      if (!q) return;
      var key = q.topic;
      var t = by[key] || (by[key] = { topic: key, week: q.week, total: 0, wrong: 0 });
      t.total++;
      if (!l.correct) t.wrong++;
    });
    return Object.keys(by).map(function (k) {
      var t = by[k];
      t.pct = Math.round((t.total - t.wrong) / t.total * 100);
      return t;
    }).sort(function (a, b) { return b.wrong - a.wrong || a.pct - b.pct; });
  };

  M.cardBoxes = function (course, cstate) {
    var boxes = [0, 0, 0, 0, 0];
    course.cards.forEach(function (c) {
      var st = cstate.cards[c.id];
      if (st) boxes[st.box - 1]++;
    });
    return boxes;
  };

  M.topics = function (items) {
    return U.uniq(items.map(function (x) { return x.topic; }));
  };
})(typeof window !== 'undefined' ? window : this);
