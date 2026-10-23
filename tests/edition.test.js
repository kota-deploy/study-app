/* 受験予定日による版の切り替え */
'use strict';
const { suite, test, assert } = require('./harness');
const { load } = require('./load');

const SA = load().SA;
const course = SA.courses.boki;
const cfg = course.config;
const E = SA.edition;
const M = SA.model;
// vm の中で作ったオブジェクトは、プロトタイプが違うので素のオブジェクトにしてから比べる
const plain = (o) => JSON.parse(JSON.stringify(o));

const both = { appliesTo: '両方', level: '3級' };
const only22 = { appliesTo: '2022版', level: '3級' };
const only27 = { appliesTo: '2027版', level: '3級' };
const split = { appliesTo: '両方', level: { '2022版': '2級', '2027版': '3級' } };

suite('版の切り替え: 未設定', () => {
  test('版は決まらない', () => assert.strictEqual(E.active(cfg, null), null));
  test('両方の項目はバッジなしで対象', () => assert.deepStrictEqual(plain(E.status(both, cfg, null)), { inScope: true, badge: null }));
  test('2022版のみの項目は「2022版のみ」バッジ', () => assert.deepStrictEqual(plain(E.status(only22, cfg, null)), { inScope: true, badge: '2022版のみ' }));
  test('2027版のみの項目は「2027版のみ」バッジ', () => assert.deepStrictEqual(plain(E.status(only27, cfg, null)), { inScope: true, badge: '2027版のみ' }));
  test('版で級が違う項目は両方の級を表示', () => assert.strictEqual(E.levelText(split, cfg, null), '2022版 2級 / 2027版 3級'));
});

suite('版の切り替え: 2027-03-31', () => {
  const d = '2027-03-31';
  test('2022版になる', () => assert.strictEqual(E.active(cfg, d), '2022版'));
  test('2022版のみの項目は対象', () => assert.strictEqual(E.status(only22, cfg, d).inScope, true));
  test('2027版のみの項目は対象外', () => assert.deepStrictEqual(plain(E.status(only27, cfg, d)), { inScope: false, badge: '対象外' }));
  test('級は2022版の級', () => assert.strictEqual(E.levelText(split, cfg, d), '2級'));
});

suite('版の切り替え: 2027-04-01', () => {
  const d = '2027-04-01';
  test('2027版になる', () => assert.strictEqual(E.active(cfg, d), '2027版'));
  test('2027版のみの項目は対象', () => assert.strictEqual(E.status(only27, cfg, d).inScope, true));
  test('2022版のみの項目は対象外', () => assert.deepStrictEqual(plain(E.status(only22, cfg, d)), { inScope: false, badge: '対象外' }));
  test('級は2027版の級', () => assert.strictEqual(E.levelText(split, cfg, d), '3級'));
});

suite('版の切り替え: 学習データとの関係', () => {
  test('対象外の問題は、間違えても復習キューに入らない', () => {
    SA.storage.init();
    const cs = SA.storage.emptyCourseState();
    M.setExamDate(cs, '2027-04-01');
    const q = course.drillsById['w2-10']; // 手形（2022版のみ）
    const r = M.recordDrill(course, cs, q, false, '2026-11-01');
    assert.strictEqual(r, 'outOfScope');
    assert.strictEqual(cs.drill.review['w2-10'], undefined);
    assert.strictEqual(cs.drill.log.length, 1);
  });
  test('版を切り替えても、学習履歴と成績は消えない', () => {
    const cs = SA.storage.emptyCourseState();
    M.recordDrill(course, cs, course.drillsById['w2-10'], false, '2026-11-01');
    M.recordDrill(course, cs, course.drillsById['w1-01'], true, '2026-11-01');
    M.setExamDate(cs, '2027-04-01');
    assert.strictEqual(cs.drill.log.length, 2);
    assert.ok(cs.drill.review['w2-10'], '復習キューの記録は残す（対象外として表示しないだけ）');
    assert.deepStrictEqual(plain(M.dueDrillIds(course, cs, '2026-11-02')), []);
    M.setExamDate(cs, '2027-03-31');
    assert.deepStrictEqual(plain(M.dueDrillIds(course, cs, '2026-11-02')), ['w2-10']);
  });
  test('未学習の数は版で変わる（2022版のみの項目の数だけ差が出る）', () => {
    const cs = SA.storage.emptyCourseState();
    const unset = M.unlearned(course, cs).total;
    M.setExamDate(cs, '2027-04-01');
    const v27 = M.unlearned(course, cs).total;
    const only2022 = course.lessons.concat(course.drills, course.cards).filter((x) => x.appliesTo === '2022版').length;
    assert.strictEqual(unset - v27, only2022);
  });
  test('コードに版の名前を直接書いていない（設定データだけで切り替える）', () => {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, '..', 'js');
    const files = [];
    (function walk(d) {
      fs.readdirSync(d).forEach((f) => {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.js')) files.push(p);
      });
    })(dir);
    files.forEach((f) => {
      const src = fs.readFileSync(f, 'utf8');
      assert.ok(!/20(22|27)版/.test(src), path.relative(dir, f) + ' に版の名前が書かれています');
    });
  });
});
