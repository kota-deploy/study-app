/*
 * 同期のための統合（マージ）。ローカルとサーバーのデータを、項目ごとに「更新時刻が新しい方」を採用して1つにする
 *  - 学習計画の日・カード・復習キュー・受験予定日: updatedAt が新しい方
 *  - ドリルの記録: 両方を合わせる（qid と ts が同じものは1つ）
 *  - 読んだ解説: 両方を合わせる（早い日付）
 *  - 学習した日: 日ごとに多い方の回数
 *  - 全削除（resetAt）: 新しい方の時刻より前の記録は、どちらの側からも消す
 * 画面にも通信にも依存しない（Node のテストから使う）
 */
(function (root) {
  'use strict';
  var SA = root.SA = root.SA || {};
  var S = SA.storage;
  var G = SA.merge = {};

  function t(v) { var n = v ? Date.parse(v) : NaN; return isNaN(n) ? -Infinity : n; }
  function newer(a, b) { return t(b && b.updatedAt) > t(a && a.updatedAt) ? b : a; }
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function maxStamp(a, b) { return t(b) > t(a) ? b : a; }

  // resetAt より前の記録を落とす
  function afterReset(c, resetAt) {
    if (!resetAt) return c;
    var r = t(resetAt);
    var day = resetAt.slice(0, 10);
    var out = S.emptyCourseState();
    if (t(c.examDateUpdatedAt) >= r) { out.examDate = c.examDate; out.examDateUpdatedAt = c.examDateUpdatedAt; }
    Object.keys(c.plan).forEach(function (d) { if (t(c.plan[d].updatedAt) >= r) out.plan[d] = c.plan[d]; });
    out.drill.log = c.drill.log.filter(function (l) { return t(l.ts) >= r; });
    Object.keys(c.drill.review).forEach(function (q) { if (t(c.drill.review[q].updatedAt) >= r) out.drill.review[q] = c.drill.review[q]; });
    Object.keys(c.cards).forEach(function (id) { if (t(c.cards[id].updatedAt) >= r) out.cards[id] = c.cards[id]; });
    Object.keys(c.lessons).forEach(function (id) { if (c.lessons[id] >= day) out.lessons[id] = c.lessons[id]; });
    Object.keys(c.activity).forEach(function (d) { if (d >= day) out.activity[d] = c.activity[d]; });
    return out;
  }

  function byNewer(a, b) {
    var out = {};
    Object.keys(a).concat(Object.keys(b)).forEach(function (k) {
      if (out[k]) return;
      if (!a[k]) out[k] = b[k];
      else if (!b[k]) out[k] = a[k];
      else out[k] = newer(a[k], b[k]);
    });
    return out;
  }

  G.mergeCourse = function (a, b) {
    var out = S.emptyCourseState();
    var ex = t(b.examDateUpdatedAt) > t(a.examDateUpdatedAt) ? b : a;
    out.examDate = ex.examDate;
    out.examDateUpdatedAt = ex.examDateUpdatedAt;
    out.plan = byNewer(a.plan, b.plan);
    out.cards = byNewer(a.cards, b.cards);
    out.drill.review = byNewer(a.drill.review, b.drill.review);

    var seen = {};
    out.drill.log = a.drill.log.concat(b.drill.log).filter(function (l) {
      var key = l.qid + '|' + l.ts;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (x, y) { return t(x.ts) - t(y.ts); });

    Object.keys(a.lessons).concat(Object.keys(b.lessons)).forEach(function (id) {
      var x = a.lessons[id], y = b.lessons[id];
      out.lessons[id] = !x ? y : (!y ? x : (x < y ? x : y));
    });
    Object.keys(a.activity).concat(Object.keys(b.activity)).forEach(function (d) {
      out.activity[d] = Math.max(a.activity[d] || 0, b.activity[d] || 0);
    });
    return out;
  };

  // a, b: 検証済みの保存データ（どちらかが null でもよい）
  G.merge = function (a, b) {
    if (!a && !b) return S.emptyState();
    if (!a) return clone(b);
    if (!b) return clone(a);
    var resetAt = maxStamp(a.resetAt, b.resetAt) || null;
    var out = { schemaVersion: S.SCHEMA_VERSION, updatedAt: maxStamp(a.updatedAt, b.updatedAt), resetAt: resetAt, courses: {} };
    var ids = Object.keys(a.courses).concat(Object.keys(b.courses));
    ids.forEach(function (id) {
      if (out.courses[id]) return;
      var ca = a.courses[id] ? afterReset(clone(a.courses[id]), resetAt) : S.emptyCourseState();
      var cb = b.courses[id] ? afterReset(clone(b.courses[id]), resetAt) : S.emptyCourseState();
      out.courses[id] = G.mergeCourse(ca, cb);
    });
    return out;
  };

  // 内容が同じか（updatedAt は比べない）。キーの順序に左右されないように並べ替えて比べる
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v === undefined ? null : v);
  }
  G.sameContent = function (a, b) {
    if (!a || !b) return a === b;
    return stable({ r: a.resetAt, c: a.courses }) === stable({ r: b.resetAt, c: b.courses });
  };
})(typeof window !== 'undefined' ? window : this);
