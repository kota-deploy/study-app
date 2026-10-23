/* 採点: 仕訳（勘定科目と金額の完全一致、行の順序は問わない）、数値、選択 */
(function (root) {
  'use strict';
  var SA = root.SA = root.SA || {};
  var U = SA.util;
  var G = SA.grading = {};

  var SIDE_JA = { debit: '借方', credit: '貸方' };
  var OTHER = { debit: 'credit', credit: 'debit' };

  // そのグループが「増える」ときに書く側
  G.increaseSide = function (acc) {
    if (!acc) return null;
    var base = { '資産': 'debit', '費用': 'debit', '負債': 'credit', '純資産': 'credit', '収益': 'credit' }[acc.group];
    if (!base) return null;
    return acc.contra ? OTHER[base] : base;
  };

  G.groupLabel = function (acc) {
    if (!acc) return '不明';
    return acc.contra ? acc.group + 'のマイナス（評価勘定）' : acc.group;
  };

  // 空行を除き、入力の不備を集める
  G.cleanLines = function (lines) {
    var out = [], problems = [];
    (lines || []).forEach(function (l, i) {
      var hasAcc = !!(l && l.account);
      var amt = l ? U.parseAmount(l.amount === undefined ? '' : l.amount) : null;
      var hasAmtText = l && l.amount !== undefined && l.amount !== null && String(l.amount).trim() !== '';
      if (!hasAcc && !hasAmtText) return;
      if (!hasAcc) { problems.push((i + 1) + '行目: 勘定科目が未選択です'); return; }
      if (amt === null || amt === 0) { problems.push((i + 1) + '行目: 金額が正しく入力されていません'); return; }
      out.push({ account: l.account, amount: amt });
    });
    return { lines: out, problems: problems };
  };

  G.total = function (lines) {
    return lines.reduce(function (s, l) { return s + l.amount; }, 0);
  };

  function key(l) { return l.account + '|' + l.amount; }

  // 多重集合の差: a にあって b にないもの
  function diff(a, b) {
    var rest = b.map(key);
    var out = [];
    a.forEach(function (l) {
      var i = rest.indexOf(key(l));
      if (i >= 0) rest.splice(i, 1);
      else out.push(l);
    });
    return out;
  }

  /*
   * expected: { debit: [{account, amount}], credit: [...] }
   * input:    同じ形。amount は文字列でもよい
   * accounts: 勘定科目名 -> { group, contra }
   */
  G.gradeJournal = function (expected, input, accounts) {
    var d = G.cleanLines(input.debit);
    var c = G.cleanLines(input.credit);
    var user = { debit: d.lines, credit: c.lines };
    var res = {
      debitTotal: G.total(user.debit),
      creditTotal: G.total(user.credit),
      problems: d.problems.map(function (p) { return '借方 ' + p; })
        .concat(c.problems.map(function (p) { return '貸方 ' + p; })),
      missing: {}, extra: {}, hints: []
    };
    res.balanced = res.debitTotal === res.creditTotal && res.debitTotal > 0;
    ['debit', 'credit'].forEach(function (side) {
      res.missing[side] = diff(expected[side], user[side]);
      res.extra[side] = diff(user[side], expected[side]);
    });
    res.correct = res.problems.length === 0 &&
      res.missing.debit.length === 0 && res.missing.credit.length === 0 &&
      res.extra.debit.length === 0 && res.extra.credit.length === 0;
    if (!res.correct) res.hints = G.explain(expected, res, accounts);
    return res;
  };

  // 不正解の理由を、5つのグループの取り違えとして説明する
  G.explain = function (expected, res, accounts) {
    var hints = [];
    var usedMissing = { debit: [], credit: [] };

    function findExpected(side, account) {
      for (var i = 0; i < expected[side].length; i++) {
        if (expected[side][i].account === account) return expected[side][i];
      }
      return null;
    }
    function takeMissing(side, pred) {
      var list = res.missing[side];
      for (var i = 0; i < list.length; i++) {
        if (usedMissing[side].indexOf(i) < 0 && pred(list[i])) {
          usedMissing[side].push(i);
          return list[i];
        }
      }
      return null;
    }

    ['debit', 'credit'].forEach(function (side) {
      res.extra[side].forEach(function (l) {
        var acc = accounts[l.account];
        // 1) 借方と貸方の逆
        var opp = findExpected(OTHER[side], l.account);
        if (opp) {
          takeMissing(OTHER[side], function (m) { return m.account === l.account; });
          var inc = G.increaseSide(acc);
          var dir = inc ? (inc === OTHER[side] ? '増える' : '減る') : null;
          hints.push('「' + l.account + '」は' + G.groupLabel(acc) + 'です。' +
            (dir ? 'この取引では' + dir + 'ので' + SIDE_JA[OTHER[side]] + 'に書きます。' : SIDE_JA[OTHER[side]] + 'に書きます。'));
          return;
        }
        // 2) 同じ側の同じ金額で、科目を取り違えた
        var sameAmt = takeMissing(side, function (m) { return m.amount === l.amount; });
        if (sameAmt) {
          var eacc = accounts[sameAmt.account];
          if (acc && eacc && G.groupLabel(acc) !== G.groupLabel(eacc)) {
            hints.push(SIDE_JA[side] + 'の「' + l.account + '」（' + G.groupLabel(acc) + '）は、「' +
              sameAmt.account + '」（' + G.groupLabel(eacc) + '）の取り違えです。グループが違います。');
          } else {
            hints.push(SIDE_JA[side] + 'の「' + l.account + '」は、同じ' + G.groupLabel(eacc) +
              'の「' + sameAmt.account + '」の取り違えです。');
          }
          return;
        }
        // 3) 科目は合っていて金額が違う
        var sameAcc = takeMissing(side, function (m) { return m.account === l.account; });
        if (sameAcc) {
          hints.push(SIDE_JA[side] + 'の「' + l.account + '」の金額が違います（入力 ' +
            U.fmtNum(l.amount) + '）。');
          return;
        }
        hints.push(SIDE_JA[side] + 'の「' + l.account + '」' + U.fmtNum(l.amount) + ' は、この取引には不要です。');
      });
    });

    ['debit', 'credit'].forEach(function (side) {
      res.missing[side].forEach(function (m, i) {
        if (usedMissing[side].indexOf(i) >= 0) return;
        var acc = accounts[m.account];
        hints.push(SIDE_JA[side] + 'に「' + m.account + '」（' + G.groupLabel(acc) + '）が足りません。');
      });
    });

    if (!res.balanced && res.debitTotal + res.creditTotal > 0) {
      hints.push('借方合計と貸方合計が一致していません。');
    }
    return hints;
  };

  // 数値の問題: 指定の小数桁に丸めて比較する
  G.gradeNumeric = function (q, text) {
    var v = U.parseDecimal(String(text || ''));
    if (v === null) return { correct: false, problems: ['数値を入力してください'], value: null };
    var p = Math.pow(10, q.decimals || 0);
    var correct = Math.round(v * p) === Math.round(q.answer * p);
    return { correct: correct, problems: [], value: v };
  };

  G.gradeChoice = function (q, index) {
    if (index === null || index === undefined || index === '') return { correct: false, problems: ['選択肢を選んでください'] };
    return { correct: Number(index) === q.answer, problems: [] };
  };
})(typeof window !== 'undefined' ? window : this);
