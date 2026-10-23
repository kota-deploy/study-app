/* 保存: localStorage のキーは1つ（studyApp）。使えない環境ではメモリ上で動く */
(function (root) {
  'use strict';
  var SA = root.SA = root.SA || {};
  var U = SA.util;
  var S = SA.storage = {};

  S.KEY = 'studyApp';
  // 2: 同期のため、ドリルの記録に時刻（ts）、復習の完了印（done）、全削除の時刻（resetAt）を追加
  S.SCHEMA_VERSION = 2;

  var state = null;
  var persistent = false;
  var listeners = [];

  function getLS() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  function probe() {
    var ls = getLS();
    if (!ls) return false;
    try {
      ls.setItem('__studyApp_probe', '1');
      ls.removeItem('__studyApp_probe');
      return true;
    } catch (e) {
      return false;
    }
  }

  S.emptyState = function () {
    return { schemaVersion: S.SCHEMA_VERSION, updatedAt: U.nowStamp(), resetAt: null, courses: {} };
  };

  S.emptyCourseState = function () {
    return {
      examDate: null,
      examDateUpdatedAt: null,
      plan: {},        // 日付 -> { tasks: [{text, done}], minutes, memo, updatedAt }
      drill: {
        log: [],       // [{ qid, date, correct, ts }]
        review: {}     // qid -> { anchor, stage, due, done?, updatedAt }
      },
      cards: {},       // cardId -> { box, due, updatedAt }
      lessons: {},     // lessonId -> 初めて読んだ日
      activity: {}     // 日付 -> 学習操作の回数
    };
  };

  /* ---------- 古い形式からの移行 ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  S.migrate = function (obj) {
    if (!obj || typeof obj !== 'object') return obj;
    var o = clone(obj);
    if (o.schemaVersion === 1) {
      Object.keys(o.courses || {}).forEach(function (id) {
        var c = o.courses[id];
        if (c && c.drill && Array.isArray(c.drill.log)) {
          // 時刻がないので、日付の正午に、並び順でずらした時刻を付ける
          c.drill.log.forEach(function (l, i) {
            if (l && !l.ts && U.isISODate(l.date)) {
              var ms = String(i % 1000);
              while (ms.length < 3) ms = '0' + ms;
              l.ts = l.date + 'T12:00:00.' + ms + 'Z';
            }
          });
        }
      });
      o.resetAt = null;
      o.schemaVersion = 2;
    }
    return o;
  };

  /* ---------- スキーマ検証 ---------- */

  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function isStamp(v) { return v == null || (typeof v === 'string' && !isNaN(Date.parse(v))); }

  function validateCourse(c, path, errors) {
    function err(msg) { errors.push(path + ': ' + msg); }
    if (!isObj(c)) { err('オブジェクトではありません'); return; }
    if (c.examDate !== null && !U.isISODate(c.examDate)) err('examDate が日付ではありません');
    if (!isStamp(c.examDateUpdatedAt)) err('examDateUpdatedAt が不正です');

    if (!isObj(c.plan)) err('plan がありません');
    else Object.keys(c.plan).forEach(function (d) {
      var p = c.plan[d];
      if (!U.isISODate(d)) err('plan のキー ' + d + ' が日付ではありません');
      if (!isObj(p)) { err('plan.' + d + ' が不正です'); return; }
      if (p.tasks !== undefined) {
        if (!Array.isArray(p.tasks)) err('plan.' + d + '.tasks が配列ではありません');
        else p.tasks.forEach(function (t, i) {
          if (!isObj(t) || typeof t.text !== 'string' || typeof t.done !== 'boolean') err('plan.' + d + '.tasks[' + i + '] が不正です');
        });
      }
      if (typeof p.minutes !== 'number' || p.minutes < 0 || p.minutes > 1440) err('plan.' + d + '.minutes が不正です');
      if (typeof p.memo !== 'string') err('plan.' + d + '.memo が不正です');
      if (!isStamp(p.updatedAt)) err('plan.' + d + '.updatedAt が不正です');
    });

    if (!isObj(c.drill) || !Array.isArray(c.drill.log) || !isObj(c.drill.review)) err('drill が不正です');
    else {
      c.drill.log.forEach(function (l, i) {
        if (!isObj(l) || typeof l.qid !== 'string' || !U.isISODate(l.date) || typeof l.correct !== 'boolean' ||
          typeof l.ts !== 'string' || isNaN(Date.parse(l.ts))) err('drill.log[' + i + '] が不正です');
      });
      Object.keys(c.drill.review).forEach(function (q) {
        var r = c.drill.review[q];
        if (!isObj(r) || !U.isISODate(r.anchor) || !U.isISODate(r.due) || !Number.isInteger(r.stage) || r.stage < 0 ||
          (r.done !== undefined && typeof r.done !== 'boolean') || !isStamp(r.updatedAt)) err('drill.review.' + q + ' が不正です');
      });
    }

    if (!isObj(c.cards)) err('cards が不正です');
    else Object.keys(c.cards).forEach(function (id) {
      var s = c.cards[id];
      if (!isObj(s) || !Number.isInteger(s.box) || s.box < 1 || s.box > 5 || !U.isISODate(s.due) || !isStamp(s.updatedAt)) err('cards.' + id + ' が不正です');
    });

    if (!isObj(c.lessons)) err('lessons が不正です');
    else Object.keys(c.lessons).forEach(function (id) {
      if (!U.isISODate(c.lessons[id])) err('lessons.' + id + ' が不正です');
    });

    if (!isObj(c.activity)) err('activity が不正です');
    else Object.keys(c.activity).forEach(function (d) {
      if (!U.isISODate(d) || typeof c.activity[d] !== 'number') err('activity.' + d + ' が不正です');
    });
  }

  S.validate = function (obj) {
    var errors = [];
    if (!isObj(obj)) return { ok: false, errors: ['JSONのトップがオブジェクトではありません'] };
    if (obj.schemaVersion !== S.SCHEMA_VERSION) errors.push('schemaVersion が ' + S.SCHEMA_VERSION + ' ではありません（' + obj.schemaVersion + '）');
    if (!isStamp(obj.resetAt)) errors.push('resetAt が不正です');
    if (!isObj(obj.courses)) errors.push('courses がありません');
    else Object.keys(obj.courses).forEach(function (id) { validateCourse(obj.courses[id], 'courses.' + id, errors); });
    return { ok: errors.length === 0, errors: errors };
  };

  // 移行してから検証する。成功したら移行後のデータを返す
  S.parseState = function (obj) {
    var m = S.migrate(obj);
    var v = S.validate(m);
    return v.ok ? { ok: true, state: m, errors: [] } : { ok: false, state: null, errors: v.errors };
  };

  /* ---------- 読み書き ---------- */

  S.init = function () {
    persistent = probe();
    state = null;
    if (persistent) {
      var raw = null;
      try { raw = getLS().getItem(S.KEY); } catch (e) { raw = null; }
      if (raw) {
        try {
          var r = S.parseState(JSON.parse(raw));
          if (r.ok) state = r.state;
        } catch (e) { /* 壊れたデータは下で退避する */ }
        if (!state) {
          // 壊れたデータは消さずに退避しておく
          try { getLS().setItem(S.KEY + '.broken', raw); } catch (e) { /* 何もしない */ }
        }
      }
    }
    if (!state) state = S.emptyState();
    return { persistent: persistent };
  };

  S.isPersistent = function () { return persistent; };

  S.get = function () {
    if (!state) S.init();
    return state;
  };

  S.course = function (courseId) {
    var st = S.get();
    if (!st.courses[courseId]) st.courses[courseId] = S.emptyCourseState();
    return st.courses[courseId];
  };

  // source: 変更の出どころ（'sync' のときは同期の送信をしない）
  S.save = function (source) {
    var st = S.get();
    st.updatedAt = U.nowStamp();
    if (persistent) {
      try {
        getLS().setItem(S.KEY, JSON.stringify(st));
      } catch (e) {
        persistent = false;
      }
    }
    listeners.forEach(function (fn) { fn(source || 'local'); });
  };

  S.onChange = function (fn) { listeners.push(fn); };

  // 検証済みのデータで置き換える（同期・読み込み用）
  S.replace = function (newState, source) {
    state = newState;
    S.save(source);
  };

  // 学習したことを記録（連続学習日数に使う）
  S.markActivity = function (courseId) {
    var c = S.course(courseId);
    var t = U.today();
    c.activity[t] = (c.activity[t] || 0) + 1;
  };

  S.exportJSON = function () {
    return JSON.stringify(S.get(), null, 2);
  };

  S.importJSON = function (text) {
    var parsed;
    try { parsed = JSON.parse(text); } catch (e) {
      return { ok: false, errors: ['JSONとして読み込めません'] };
    }
    var r = S.parseState(parsed);
    if (!r.ok) return r;
    S.replace(r.state);
    return { ok: true, errors: [] };
  };

  // 全削除。同期している場合は、この時刻より前の記録を他の端末からも消す
  S.clearAll = function () {
    state = S.emptyState();
    state.resetAt = U.nowStamp();
    if (persistent) {
      try { getLS().removeItem(S.KEY); } catch (e) { /* 何もしない */ }
    }
    S.save();
  };
})(typeof window !== 'undefined' ? window : this);
