/* すべてのテストを実行: node tests/run-all.js */
'use strict';
const { load } = require('./load');
const { validate } = require('./validate-data');
const { suite, test, summary, assert } = require('./harness');

suite('データ検証（validate-data.js）', () => {
  const { errors, report } = validate(load().SA);
  test('エラーなし', () => assert.deepStrictEqual(errors, []));
  const c = report.courses.find((x) => x.id === 'boki');
  test('問題は60問以上', () => assert.ok(c.counts.drills >= 60, String(c.counts.drills)));
  test('Week 2〜6 は各10問以上', () => {
    [2, 3, 4, 5, 6].forEach((w) => assert.ok(c.drillsByWeek[w] >= 10, 'W' + w + '=' + c.drillsByWeek[w]));
  });
  test('カードは80枚以上', () => assert.ok(c.counts.cards >= 80, String(c.counts.cards)));
});

suite('コースのひな形', () => {
  test('courses/_template を登録しても検証を通る', () => {
    const fs = require('fs');
    const path = require('path');
    const vm = require('vm');
    const ctx = load();
    ['data.js', 'course.js'].forEach((f) => {
      const p = path.join(__dirname, '..', 'courses', '_template', f);
      vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
    });
    assert.ok(ctx.SA.courses.template);
    assert.deepStrictEqual(validate(ctx.SA).errors, []);
  });
});

require('./coverage.test');
require('./grading.test');
require('./week1-ledger.test');
require('./edition.test');
require('./srs-storage.test');
require('./merge.test');

require('./sync-client.test')().then(() => {
  process.exit(summary() ? 1 : 0);
});
