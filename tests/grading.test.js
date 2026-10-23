/* 採点ロジックの単体テスト */
'use strict';
const { suite, test, assert } = require('./harness');
const { load } = require('./load');

const SA = load().SA;
const course = SA.courses.boki;
const acc = course.accountsByName;
const G = SA.grading;

function lines(pairs) { return pairs.map((p) => ({ account: p[0], amount: String(p[1]) })); }
const q10 = course.drillsById['w1-10'].answer; // 借入金300,000・支払利息3,000 / 普通預金303,000

suite('仕訳の採点', () => {
  test('正解', () => {
    const r = G.gradeJournal(course.drillsById['w1-01'].answer, { debit: lines([['現金', 500000]]), credit: lines([['資本金', 500000]]) }, acc);
    assert.strictEqual(r.correct, true);
    assert.strictEqual(r.balanced, true);
    assert.strictEqual(r.debitTotal, 500000);
  });

  test('行の順序が違っても正解（複合仕訳）', () => {
    const r = G.gradeJournal(q10, { debit: lines([['支払利息', 3000], ['借入金', 300000]]), credit: lines([['普通預金', 303000]]) }, acc);
    assert.strictEqual(r.correct, true);
  });

  test('3桁区切りや全角数字の金額も読める', () => {
    const r = G.gradeJournal(q10, { debit: lines([['借入金', '300,000'], ['支払利息', '３，０００']]), credit: lines([['普通預金', '303,000']]) }, acc);
    assert.strictEqual(r.correct, true);
  });

  test('空行は無視する', () => {
    const r = G.gradeJournal(q10, {
      debit: [{ account: '', amount: '' }].concat(lines([['借入金', 300000], ['支払利息', 3000]])),
      credit: lines([['普通預金', 303000]]).concat([{ account: '', amount: '' }])
    }, acc);
    assert.strictEqual(r.correct, true);
  });

  test('金額違いは不正解', () => {
    const r = G.gradeJournal(q10, { debit: lines([['借入金', 300000], ['支払利息', 30000]]), credit: lines([['普通預金', 303000]]) }, acc);
    assert.strictEqual(r.correct, false);
    assert.strictEqual(r.balanced, false);
    assert.ok(r.hints.some((h) => h.includes('支払利息') && h.includes('金額')), r.hints.join(' / '));
  });

  test('科目違いは不正解。グループの取り違えを説明する', () => {
    const r = G.gradeJournal(course.drillsById['w1-08'].answer, { debit: lines([['備品', 15000]]), credit: lines([['現金', 15000]]) }, acc);
    assert.strictEqual(r.correct, false);
    assert.strictEqual(r.balanced, true);
    assert.ok(r.hints.some((h) => h.includes('備品') && h.includes('資産') && h.includes('消耗品費') && h.includes('費用')), r.hints.join(' / '));
  });

  test('借方と貸方の逆を説明する', () => {
    const r = G.gradeJournal(course.drillsById['w1-06'].answer, { debit: lines([['現金', 120000]]), credit: lines([['給料', 120000]]) }, acc);
    assert.strictEqual(r.correct, false);
    assert.ok(r.hints.some((h) => h.includes('「現金」は資産') && h.includes('減る') && h.includes('貸方')), r.hints.join(' / '));
    assert.ok(r.hints.some((h) => h.includes('「給料」は費用') && h.includes('増える') && h.includes('借方')), r.hints.join(' / '));
  });

  test('複合仕訳で1行足りないと不正解', () => {
    const r = G.gradeJournal(q10, { debit: lines([['借入金', 300000]]), credit: lines([['普通預金', 303000]]) }, acc);
    assert.strictEqual(r.correct, false);
    assert.strictEqual(r.balanced, false);
    assert.ok(r.hints.some((h) => h.includes('支払利息') && h.includes('足りません')), r.hints.join(' / '));
  });

  test('同じ科目を2行に分けても、完全一致でなければ不正解', () => {
    const r = G.gradeJournal(q10, { debit: lines([['借入金', 300000], ['支払利息', 3000]]), credit: lines([['普通預金', 300000], ['普通預金', 3000]]) }, acc);
    assert.strictEqual(r.correct, false);
    assert.strictEqual(r.balanced, true);
  });

  test('評価勘定（減価償却累計額）の向きを説明できる', () => {
    const ans = course.drillsById['w3-02'].answer;
    const r = G.gradeJournal(ans, { debit: lines([['建物減価償却累計額', 100000]]), credit: lines([['減価償却費', 100000]]) }, acc);
    assert.ok(r.hints.some((h) => h.includes('資産のマイナス') && h.includes('貸方')), r.hints.join(' / '));
  });

  test('金額の入力ミスは problems に出る', () => {
    const r = G.gradeJournal(q10, { debit: [{ account: '借入金', amount: 'abc' }], credit: lines([['普通預金', 303000]]) }, acc);
    assert.strictEqual(r.correct, false);
    assert.strictEqual(r.problems.length, 1);
  });
});

suite('数値・選択の採点', () => {
  const q = course.drillsById['w5-06']; // 1.33回
  test('小数第2位で一致すれば正解', () => {
    assert.strictEqual(G.gradeNumeric(q, '1.33').correct, true);
    assert.strictEqual(G.gradeNumeric(q, '1.3').correct, false);
  });
  test('% や 3桁区切りを含む入力も読める', () => {
    assert.strictEqual(G.gradeNumeric(course.drillsById['w5-01'], '150%').correct, true);
    assert.strictEqual(G.gradeNumeric(course.drillsById['w5-13'], '300,000').correct, true);
  });
  test('選択問題', () => {
    const c = course.drillsById['w5-10'];
    assert.strictEqual(G.gradeChoice(c, 1).correct, true);
    assert.strictEqual(G.gradeChoice(c, 0).correct, false);
  });
});
