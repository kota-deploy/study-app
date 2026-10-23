/*
 * データの自動検証: node tests/validate-data.js
 *  - 仕訳: 借方合計＝貸方合計、科目がマスターにある、解説が空でない
 *  - すべての項目: ID の重複なし、source・level・appliesTo が正しい
 *  - 解説: 図解（SVG・title・desc）があり、例の仕訳も貸借一致
 *  - {{キー}} が設定データで解決できる
 *  - needsReview と「級未確認」の一覧を表示する
 */
'use strict';
const { load } = require('./load');

function validate(SA) {
  const errors = [];
  const report = { courses: [] };

  SA.courseList.forEach((course) => {
    const cfg = course.config;
    const err = (msg) => errors.push('[' + course.id + '] ' + msg);
    const editionIds = cfg.editions.map((e) => e.id);
    const appliesValues = editionIds.concat([cfg.allEditionsLabel]);
    const values = cfg.values || {};
    const ids = {};
    const needsReview = [];
    const unconfirmed = [];

    function checkCommon(kind, item) {
      const label = kind + ' ' + (item.id || item.name);
      if (item.id !== undefined) {
        if (!item.id) err(label + ': id が空です');
        else if (ids[item.id]) err(label + ': id が重複しています');
        else ids[item.id] = true;
      }
      if (!appliesValues.includes(item.appliesTo)) err(label + ': appliesTo が不正です（' + item.appliesTo + '）');
      // level は文字列か、版ごとのオブジェクト
      if (typeof item.level === 'string') {
        if (!cfg.levels.includes(item.level)) err(label + ': level が不正です（' + item.level + '）');
      } else if (item.level && typeof item.level === 'object') {
        const keys = Object.keys(item.level).sort();
        if (keys.join() !== editionIds.slice().sort().join()) err(label + ': level のキーが版と一致しません');
        keys.forEach((k) => { if (!cfg.levels.includes(item.level[k])) err(label + ': level.' + k + ' が不正です'); });
      } else {
        err(label + ': level がありません');
      }
      if (!Array.isArray(item.source) || item.source.length === 0) err(label + ': source が空です');
      else item.source.forEach((s) => {
        if (!s || !course.sources[s.ref]) err(label + ': source の参照先がありません（' + (s && s.ref) + '）');
      });
      if (SA.edition.levelValues(item).includes('級未確認')) unconfirmed.push(label);
      if (item.needsReview) needsReview.push(label);
    }

    function checkTemplate(label, text) {
      SA.util.templateKeys(text).forEach((k) => {
        if (!values[k]) err(label + ': {{' + k + '}} が設定データにありません');
      });
    }

    function balance(lines) { return lines.reduce((s, l) => s + l.amount, 0); }

    // 出典マスター
    Object.keys(course.sources).forEach((k) => {
      const s = course.sources[k];
      if (!s.title) err('出典 ' + k + ': title が空です');
      if (s.official && (!s.url || !s.retrieved)) err('出典 ' + k + ': 公式資料なのに URL か取得日がありません');
    });

    // 設定データの値にも出典が必要
    Object.keys(values).forEach((k) => {
      if (!Array.isArray(values[k].source) || !values[k].source.length) err('設定 ' + k + ': source がありません');
    });

    // 勘定科目マスター
    const accNames = {};
    course.accounts.forEach((a) => {
      if (accNames[a.name]) err('勘定科目 ' + a.name + ': 重複しています');
      accNames[a.name] = true;
      if (!cfg.accountGroups.includes(a.group)) err('勘定科目 ' + a.name + ': group が不正です');
      checkCommon('勘定科目', a);
    });

    // 解説
    course.lessons.forEach((l) => {
      checkCommon('解説', l);
      const lb = '解説 ' + l.id;
      ['title', 'summary', 'topic'].forEach((f) => { if (!l[f]) err(lb + ': ' + f + ' が空です'); });
      if (!Array.isArray(l.diagrams) || !l.diagrams.length) err(lb + ': 図解がありません');
      else l.diagrams.forEach((d, i) => {
        if (!/^<svg[\s>]/.test(d)) err(lb + ': 図解' + (i + 1) + ' が SVG ではありません');
        if (!/<title[\s>]/.test(d) || !/<desc[\s>]/.test(d)) err(lb + ': 図解' + (i + 1) + ' に title/desc がありません');
      });
      if (!Array.isArray(l.steps) || l.steps.length < 3 || l.steps.length > 5) err(lb + ': しくみは3〜5行にしてください');
      if (!l.example || !Array.isArray(l.example.text) || !l.example.text.length) err(lb + ': 例がありません');
      if (!Array.isArray(l.mistakes) || l.mistakes.length < 1 || l.mistakes.length > 2) err(lb + ': よくある間違いは1〜2つにしてください');
      if (!l.work || !l.work.text) err(lb + ': 仕事とのつながりがありません');
      (l.example && l.example.journal || []).forEach((jn, i) => {
        const d = jn.debit.reduce((s, x) => s + x[1], 0);
        const c = jn.credit.reduce((s, x) => s + x[1], 0);
        if (d !== c) err(lb + ': 例の仕訳' + (i + 1) + ' の貸借が一致しません（' + d + ' / ' + c + '）');
        jn.debit.concat(jn.credit).forEach((x) => { if (!accNames[x[0]]) err(lb + ': 例の科目がマスターにありません（' + x[0] + '）'); });
      });
      [l.summary].concat(l.steps || [], l.example ? l.example.text : []).forEach((t) => checkTemplate(lb, t));
    });

    // 問題
    const weeks = {};
    course.drills.forEach((q) => {
      checkCommon('問題', q);
      const lb = '問題 ' + q.id;
      if (!q.text) err(lb + ': 問題文が空です');
      if (!q.explanation || !q.explanation.trim()) err(lb + ': 解説が空です');
      if (!q.topic) err(lb + ': topic が空です');
      if (q.lessonId && !course.lessonsById[q.lessonId]) err(lb + ': 関連する解説がありません（' + q.lessonId + '）');
      if (!q.lessonId) err(lb + ': lessonId がありません');
      checkTemplate(lb, q.text);
      checkTemplate(lb, q.explanation || '');
      if (q.type === 'journal') {
        const all = q.answer.debit.concat(q.answer.credit);
        if (!q.answer.debit.length || !q.answer.credit.length) err(lb + ': 借方か貸方が空です');
        all.forEach((l) => {
          if (!accNames[l.account]) err(lb + ': 勘定科目がマスターにありません（' + l.account + '）');
          if (!Number.isInteger(l.amount) || l.amount <= 0) err(lb + ': 金額が不正です（' + l.amount + '）');
        });
        const d = balance(q.answer.debit), c = balance(q.answer.credit);
        if (d !== c) err(lb + ': 借方合計 ' + d + ' と貸方合計 ' + c + ' が一致しません');
      } else if (q.type === 'numeric') {
        if (typeof q.answer !== 'number') err(lb + ': 数値の答えがありません');
      } else if (q.type === 'choice') {
        if (!Array.isArray(q.choices) || q.choices.length < 2) err(lb + ': 選択肢が足りません');
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) err(lb + ': 正解の番号が不正です');
      } else {
        err(lb + ': type が不正です（' + q.type + '）');
      }
      weeks[q.week] = (weeks[q.week] || 0) + 1;
    });

    // カード
    course.cards.forEach((c) => {
      checkCommon('カード', c);
      if (!c.front || !c.back || !c.deck) err('カード ' + c.id + ': 表・裏・デッキのどれかが空です');
      checkTemplate('カード ' + c.id, c.back);
    });

    // 学習計画: 各週に解説が1つ以上
    course.plan.weeks.forEach((w) => {
      if (w.days.length !== 7) err('学習計画 第' + w.week + '週: 7日分ありません');
      if (!course.lessons.some((l) => l.week === w.week)) err('学習計画 第' + w.week + '週: 解説がありません');
      if (SA.util.addDays(w.start, 6) !== w.end) err('学習計画 第' + w.week + '週: 期間が7日ではありません');
    });

    report.courses.push({
      id: course.id,
      counts: { lessons: course.lessons.length, drills: course.drills.length, cards: course.cards.length, accounts: course.accounts.length },
      drillsByWeek: weeks,
      needsReview: needsReview,
      unconfirmed: unconfirmed
    });
  });

  return { errors: errors, report: report };
}

module.exports = { validate };

if (require.main === module) {
  const SA = load().SA;
  const { errors, report } = validate(SA);
  report.courses.forEach((c) => {
    console.log('コース: ' + c.id);
    console.log('  解説 ' + c.counts.lessons + ' / 問題 ' + c.counts.drills + ' / カード ' + c.counts.cards + ' / 勘定科目 ' + c.counts.accounts);
    console.log('  週ごとの問題数: ' + Object.keys(c.drillsByWeek).map((w) => 'W' + w + '=' + c.drillsByWeek[w]).join(' '));
    console.log('  needsReview: ' + c.needsReview.length + '件');
    c.needsReview.forEach((x) => console.log('    - ' + x));
    console.log('  級未確認: ' + c.unconfirmed.length + '件');
    c.unconfirmed.forEach((x) => console.log('    - ' + x));
  });
  if (errors.length) {
    console.log('\nエラー ' + errors.length + '件');
    errors.forEach((e) => console.log('  ✗ ' + e));
    process.exit(1);
  }
  console.log('\nデータ検証: OK');
}
