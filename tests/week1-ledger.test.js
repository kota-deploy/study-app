/* Week 1 の10問を記帳した検算（依頼書の数字と一致するか） */
'use strict';
const { suite, test, assert } = require('./harness');
const { load } = require('./load');

const SA = load().SA;
const course = SA.courses.boki;
const G = SA.grading;

const week1 = course.drills.filter((q) => q.week === 1);

// 各勘定の残高を「その科目が増える側をプラス」で集計する
function post(entries) {
  const bal = {};
  entries.forEach((e) => {
    e.debit.forEach((l) => { bal[l.account] = (bal[l.account] || 0) + l.amount; });
    e.credit.forEach((l) => { bal[l.account] = (bal[l.account] || 0) - l.amount; });
  });
  const out = {};
  Object.keys(bal).forEach((name) => {
    const acc = course.accountsByName[name];
    out[name] = (G.increaseSide(acc) === 'debit' ? bal[name] : -bal[name]) || 0;
  });
  return out;
}

function sumGroup(bal, group) {
  return Object.keys(bal).filter((n) => course.accountsByName[n].group === group).reduce((s, n) => s + bal[n], 0);
}

suite('Week 1 の検算', () => {
  const bal = post(week1.map((q) => q.answer));

  test('Week 1 は10問', () => assert.strictEqual(week1.length, 10));
  test('現金 365,000', () => assert.strictEqual(bal['現金'], 365000));
  test('普通預金 517,000', () => assert.strictEqual(bal['普通預金'], 517000));
  test('売掛金 250,000', () => assert.strictEqual(bal['売掛金'], 250000));
  test('借入金 700,000', () => assert.strictEqual(bal['借入金'], 700000));
  test('資本金 500,000', () => assert.strictEqual(bal['資本金'], 500000));
  test('買掛金 0', () => assert.strictEqual(bal['買掛金'], 0));
  test('費用合計 518,000', () => assert.strictEqual(sumGroup(bal, '費用'), 518000));
  test('収益 450,000', () => assert.strictEqual(sumGroup(bal, '収益'), 450000));
  test('当期純損失 68,000', () => assert.strictEqual(sumGroup(bal, '収益') - sumGroup(bal, '費用'), -68000));
  test('資産合計 1,132,000 ＝ 負債 700,000 ＋ 純資産 432,000', () => {
    const assets = sumGroup(bal, '資産');
    const liab = sumGroup(bal, '負債');
    const equity = sumGroup(bal, '純資産') + sumGroup(bal, '収益') - sumGroup(bal, '費用');
    assert.strictEqual(assets, 1132000);
    assert.strictEqual(liab, 700000);
    assert.strictEqual(equity, 432000);
    assert.strictEqual(assets, liab + equity);
  });
  test('残高試算表の合計 1,650,000（問題 w2-14 の答えと一致）', () => {
    const debitSide = sumGroup(bal, '資産') + sumGroup(bal, '費用');
    const creditSide = sumGroup(bal, '負債') + sumGroup(bal, '純資産') + sumGroup(bal, '収益');
    assert.strictEqual(debitSide, 1650000);
    assert.strictEqual(creditSide, 1650000);
    assert.strictEqual(course.drillsById['w2-14'].answer, debitSide);
  });
  test('10問の正解をそのまま入力すると、すべて正解になる', () => {
    week1.forEach((q) => {
      const toInput = (ls) => ls.map((l) => ({ account: l.account, amount: String(l.amount) }));
      const r = G.gradeJournal(q.answer, { debit: toInput(q.answer.debit), credit: toInput(q.answer.credit) }, course.accountsByName);
      assert.strictEqual(r.correct, true, q.id);
    });
  });
});
