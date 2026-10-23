/*
 * 新しいコースのひな形（このファイルは index.html から読み込まれていません）
 * 使い方は docs/ADD_COURSE.md を参照。DATA_TEMPLATE_ をコース名に置き換えて使う
 * 簿記コースのようにファイルを分けてもよい（データが増えたら分けるのがおすすめ）
 */

window.DATA_TEMPLATE_SOURCES = {
  main: {
    title: '公式資料の名前', publisher: '発行元', url: 'https://example.com/',
    retrieved: '2026-10-23', edition: '両方', official: true
  },
  supplement: { title: '補足（公式資料外）', publisher: null, url: null, retrieved: null, edition: '両方', official: false }
};

window.DATA_TEMPLATE_CONFIG = {
  // 版がないコースは、期間の制限なしの版を1つだけ書く
  editions: [{ id: '現行版', label: '現行の出題範囲', from: null, to: null, source: [{ ref: 'main' }] }],
  allEditionsLabel: '両方',
  levels: ['基礎', '応用', '範囲外', '級未確認'],
  values: {},
  srs: {
    leitnerDays: { value: [1, 2, 4, 8, 16], source: [{ ref: 'supplement' }] },
    reviewOffsets: { value: [1, 3, 7], source: [{ ref: 'supplement' }] },
    newCardsPerSession: { value: 20, source: [{ ref: 'supplement' }] }
  },
  study: {
    weekdayMinutes: { value: 60, source: [{ ref: 'supplement' }] },
    weekendMinutes: { value: 120, source: [{ ref: 'supplement' }] }
  },
  accountGroups: []
};

window.DATA_TEMPLATE_PLAN = {
  start: '2027-01-02', end: '2027-01-08',
  source: [{ ref: 'supplement' }],
  weeks: [{
    week: 1, start: '2027-01-02', end: '2027-01-08',
    theme: '第1週のテーマ', goal: 'その週のゴール',
    levels: [{ topic: '分野名', level: '基礎' }],
    days: [['タスク1'], ['タスク2'], ['タスク3'], ['タスク4'], ['タスク5'], ['タスク6'], ['タスク7']]
  }]
};

window.DATA_TEMPLATE_LESSONS = [{
  id: 't-l-01', week: 1, topic: '分野名', title: '解説のタイトル',
  level: '基礎', appliesTo: '両方', source: [{ ref: 'main', loc: '該当箇所' }],
  summary: '一言で（1〜2文）。',
  diagrams: ['<svg class="dg" viewBox="0 0 360 80" role="img" aria-labelledby="t1 d1" xmlns="http://www.w3.org/2000/svg"><title id="t1">図の題</title><desc id="d1">読み上げ用の説明</desc><rect x="10" y="10" width="340" height="60" rx="6" class="dg-neutral"/><text x="180" y="45" class="dg-tb" text-anchor="middle">図解</text></svg>'],
  steps: ['しくみ1', 'しくみ2', 'しくみ3'],
  example: { text: ['例（数字つき。検算して載せる）'] },
  mistakes: ['よくある間違い'],
  work: { text: '仕事とのつながり', official: false }
}];

window.DATA_TEMPLATE_DRILLS = [
  {
    id: 't-q-01', week: 1, topic: '分野名', type: 'choice', text: '問題文',
    choices: ['選択肢A', '選択肢B'], answer: 0,
    explanation: '解説', lessonId: 't-l-01', level: '基礎', appliesTo: '両方', source: [{ ref: 'main' }]
  },
  {
    id: 't-q-02', week: 1, topic: '分野名', type: 'numeric', text: '計算問題', answer: 12.5, unit: '%', decimals: 1,
    explanation: '解説', lessonId: 't-l-01', level: '基礎', appliesTo: '両方', source: [{ ref: 'main' }]
  }
];

window.DATA_TEMPLATE_CARDS = [
  { id: 't-c-01', deck: 'デッキ名', front: '表', back: '裏', level: '基礎', appliesTo: '両方', source: [{ ref: 'main' }] }
];
