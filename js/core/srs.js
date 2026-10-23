/* 間隔反復: フラッシュカードの Leitner 方式と、仕訳ドリルの復習キュー */
(function (root) {
  'use strict';
  var SA = root.SA = root.SA || {};
  var U = SA.util;
  var R = SA.srs = {};

  R.RATINGS = { ok: '分かった', unsure: 'あいまい', ng: '分からない' };

  /*
   * カードの評価
   *  分かった: 箱を1つ進める（最大5）
   *  あいまい: 箱はそのまま
   *  分からない: 箱1に戻す
   * days[箱-1] 日後に再出題する
   */
  R.rateCard = function (prev, rating, today, days) {
    var box = prev ? prev.box : 1;
    if (rating === 'ok') box = Math.min(5, box + 1);
    else if (rating === 'ng') box = 1;
    else if (rating !== 'unsure') throw new Error('unknown rating: ' + rating);
    return { box: box, due: U.addDays(today, days[box - 1]), updatedAt: U.nowStamp() };
  };

  R.isCardDue = function (st, today) {
    return !st || st.due <= today;
  };

  /*
   * 仕訳ドリルの復習キュー
   *  間違えた日を起点（anchor）に、offsets 日後（例: 1, 3, 7日後）に再出題する
   *  復習で正解すると次の段階へ。最後の段階で正解したら完了（done）にする
   *  復習で間違えたら、その日を起点にやり直す
   * 戻り値: 'queued' | 'advanced' | 'graduated' | 'notDue' | 'none'
   */
  R.onDrillResult = function (review, qid, correct, today, offsets) {
    var cur = review[qid];
    if (!correct) {
      review[qid] = { anchor: today, stage: 0, due: U.addDays(today, offsets[0]), updatedAt: U.nowStamp() };
      return 'queued';
    }
    if (!cur || cur.done) return 'none';
    if (cur.due > today) return 'notDue';
    var next = cur.stage + 1;
    if (next >= offsets.length) {
      // 消さずに完了の印を付ける（同期で他の端末に「完了」を伝えるため）
      review[qid] = { anchor: cur.anchor, stage: cur.stage, due: cur.due, done: true, updatedAt: U.nowStamp() };
      return 'graduated';
    }
    var due = U.addDays(cur.anchor, offsets[next]);
    if (due <= today) due = U.addDays(today, 1);
    review[qid] = { anchor: cur.anchor, stage: next, due: due, updatedAt: U.nowStamp() };
    return 'advanced';
  };

  R.dueReviewIds = function (review, today) {
    return Object.keys(review).filter(function (q) { return !review[q].done && review[q].due <= today; });
  };
})(typeof window !== 'undefined' ? window : this);
