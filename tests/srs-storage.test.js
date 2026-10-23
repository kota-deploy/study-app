/* 間隔反復・保存・学習計画の集計 */
'use strict';
const { suite, test, assert } = require('./harness');
const { load } = require('./load');

const SA = load().SA;
const course = SA.courses.boki;
const R = SA.srs, S = SA.storage, M = SA.model, U = SA.util;
const DAYS = course.config.srs.leitnerDays.value;
const OFF = course.config.srs.reviewOffsets.value;

suite('フラッシュカード（Leitner）', () => {
  test('新しいカードで「分かった」なら箱2', () => {
    const s = R.rateCard(null, 'ok', '2026-11-01', DAYS);
    assert.strictEqual(s.box, 2);
    assert.strictEqual(s.due, U.addDays('2026-11-01', DAYS[1]));
  });
  test('「あいまい」は箱そのまま', () => assert.strictEqual(R.rateCard({ box: 3 }, 'unsure', '2026-11-01', DAYS).box, 3));
  test('「分からない」は箱1に戻る', () => assert.strictEqual(R.rateCard({ box: 4 }, 'ng', '2026-11-01', DAYS).box, 1));
  test('箱5より上には行かない', () => assert.strictEqual(R.rateCard({ box: 5 }, 'ok', '2026-11-01', DAYS).box, 5));
});

suite('仕訳ドリルの復習キュー（翌日・3日後・7日後）', () => {
  test('間違えると翌日に出る', () => {
    const rv = {};
    assert.strictEqual(R.onDrillResult(rv, 'q', false, '2026-11-01', OFF), 'queued');
    assert.strictEqual(rv.q.due, '2026-11-02');
  });
  test('正解を続けると 3日後 → 7日後 → 卒業', () => {
    const rv = {};
    R.onDrillResult(rv, 'q', false, '2026-11-01', OFF);
    assert.strictEqual(R.onDrillResult(rv, 'q', true, '2026-11-02', OFF), 'advanced');
    assert.strictEqual(rv.q.due, '2026-11-04');
    assert.strictEqual(R.onDrillResult(rv, 'q', true, '2026-11-04', OFF), 'advanced');
    assert.strictEqual(rv.q.due, '2026-11-08');
    assert.strictEqual(R.onDrillResult(rv, 'q', true, '2026-11-08', OFF), 'graduated');
    assert.strictEqual(rv.q.done, true, '完了の印を残す（同期で他の端末に伝えるため）');
    assert.strictEqual(R.dueReviewIds(rv, '2026-12-31').length, 0, '完了した問題は出題しない');
  });
  test('完了した問題をまた間違えると、キューに戻る', () => {
    const rv = { q: { anchor: '2026-11-01', stage: 2, due: '2026-11-08', done: true, updatedAt: '2026-11-08T00:00:00Z' } };
    assert.strictEqual(R.onDrillResult(rv, 'q', false, '2026-11-20', OFF), 'queued');
    assert.strictEqual(rv.q.done, undefined);
    assert.strictEqual(rv.q.due, '2026-11-21');
  });
  test('復習で間違えたら、その日から数え直す', () => {
    const rv = {};
    R.onDrillResult(rv, 'q', false, '2026-11-01', OFF);
    R.onDrillResult(rv, 'q', true, '2026-11-02', OFF);
    R.onDrillResult(rv, 'q', false, '2026-11-04', OFF);
    assert.deepStrictEqual([rv.q.anchor, rv.q.stage, rv.q.due], ['2026-11-04', 0, '2026-11-05']);
  });
  test('期日前に正解しても段階は進まない', () => {
    const rv = {};
    R.onDrillResult(rv, 'q', false, '2026-11-01', OFF);
    assert.strictEqual(R.onDrillResult(rv, 'q', true, '2026-11-01', OFF), 'notDue');
    assert.strictEqual(rv.q.stage, 0);
  });
});

suite('保存', () => {
  test('localStorage がないときはメモリで動く', () => {
    const r = S.init();
    assert.strictEqual(r.persistent, false);
    S.course('boki').examDate = '2027-01-10';
    S.save();
    assert.strictEqual(S.get().courses.boki.examDate, '2027-01-10');
  });
  test('localStorage に1つのキーで保存し、読み戻せる', () => {
    const mem = {};
    const ls = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
    const ctx = load({ localStorage: ls });
    const S2 = ctx.SA.storage;
    assert.strictEqual(S2.init().persistent, true);
    S2.course('boki').lessons['l-bs'] = '2026-10-24';
    S2.save();
    assert.deepStrictEqual(Object.keys(mem), ['studyApp']);
    assert.strictEqual(JSON.parse(mem.studyApp).schemaVersion, 2);
    S2.init();
    assert.strictEqual(S2.get().courses.boki.lessons['l-bs'], '2026-10-24');
  });
  test('書き出したJSONを読み込める', () => {
    S.init();
    const cs = S.course('boki');
    M.recordDrill(course, cs, course.drillsById['w1-01'], false, '2026-10-24');
    const json = S.exportJSON();
    S.clearAll();
    assert.strictEqual(S.get().courses.boki, undefined);
    assert.strictEqual(S.importJSON(json).ok, true);
    assert.strictEqual(S.get().courses.boki.drill.log.length, 1);
  });
  test('Phase 1 の形式（schemaVersion 1）を読み込むと、v2 に移行される', () => {
    S.init();
    const v1 = {
      schemaVersion: 1, updatedAt: '2026-10-23T00:00:00Z',
      courses: { boki: Object.assign(S.emptyCourseState(), {
        drill: { log: [{ qid: 'w1-01', date: '2026-10-24', correct: true }, { qid: 'w1-02', date: '2026-10-24', correct: false }],
          review: { 'w1-02': { anchor: '2026-10-24', stage: 0, due: '2026-10-25', updatedAt: '2026-10-24T01:00:00Z' } } }
      }) }
    };
    const r = S.importJSON(JSON.stringify(v1));
    assert.strictEqual(r.ok, true, r.errors.join(' / '));
    const st = S.get();
    assert.strictEqual(st.schemaVersion, 2);
    assert.strictEqual(st.resetAt, null);
    const ts = st.courses.boki.drill.log.map((l) => l.ts);
    assert.ok(ts.every(Boolean));
    assert.notStrictEqual(ts[0], ts[1], '同じ日の記録でも時刻が重ならない');
  });
  test('全削除すると resetAt が記録される（同期で他の端末からも消すため）', () => {
    S.init();
    S.clearAll();
    assert.ok(S.get().resetAt);
  });
  test('不正なJSONは拒否し、今のデータを変えない', () => {
    S.init();
    S.course('boki').examDate = '2027-02-01';
    const bad = [
      'これはJSONではない',
      JSON.stringify({ schemaVersion: 99, courses: {} }),
      JSON.stringify({ schemaVersion: 1 }),
      JSON.stringify({ schemaVersion: 1, courses: { boki: { examDate: '2027/02/01' } } }),
      JSON.stringify({ schemaVersion: 1, courses: { boki: Object.assign(S.emptyCourseState(), { cards: { x: { box: 9, due: '2026-11-01' } } }) } })
    ];
    bad.forEach((b) => {
      const r = S.importJSON(b);
      assert.strictEqual(r.ok, false, b);
      assert.ok(r.errors.length > 0);
    });
    assert.strictEqual(S.get().courses.boki.examDate, '2027-02-01');
  });
});

suite('学習計画とホームの集計', () => {
  test('6週間・42日、10/24（土）から12/04（金）', () => {
    const days = M.planDays(course);
    assert.strictEqual(days.length, 42);
    assert.strictEqual(days[0].date, '2026-10-24');
    assert.strictEqual(days[41].date, '2026-12-04');
  });
  test('平日2時間、週末4時間で週18時間', () => {
    const w = course.plan.weeks[0];
    const cs = S.emptyCourseState();
    assert.strictEqual(M.weekProgress(course, cs, w).targetMinutes, 18 * 60);
  });
  test('タスクを編集・チェックすると進捗率が変わる', () => {
    const cs = S.emptyCourseState();
    const w = course.plan.weeks[0];
    const e = M.dayEntry(course, cs, '2026-10-24');
    e.tasks[0].done = true;
    e.tasks.push({ text: '自分で追加したタスク', done: true });
    M.saveDay(cs, '2026-10-24', e);
    const p = M.weekProgress(course, cs, w);
    assert.strictEqual(p.done, 2);
    const tasks = M.dayEntry(course, cs, '2026-10-24').tasks;
    assert.strictEqual(tasks[tasks.length - 1].text, '自分で追加したタスク');
  });
  test('連続学習日数', () => {
    const cs = S.emptyCourseState();
    cs.activity = { '2026-10-24': 1, '2026-10-25': 3, '2026-10-26': 1 };
    assert.strictEqual(M.streak(cs, '2026-10-26'), 3);
    assert.strictEqual(M.streak(cs, '2026-10-27'), 3, '今日まだなら昨日まで');
    assert.strictEqual(M.streak(cs, '2026-10-28'), 0);
  });
  test('受験予定日までの残り日数', () => {
    const cs = S.emptyCourseState();
    M.setExamDate(cs, '2026-12-13');
    const info = M.examInfo(course, cs, '2026-10-23');
    assert.strictEqual(info.daysLeft, 51);
    assert.strictEqual(info.edition, course.config.editions[0].id);
  });
});
