/* 簿記コースの設定データ。版の切り替え日・税率・復習の間隔などの数値と名称は、ここに出典つきで置く */
window.DATA_BOKI_CONFIG = {
  // 版の定義。受験予定日がどの期間に入るかで、適用する版が決まる
  editions: [
    {
      id: '2022版',
      label: '2022年度版の区分表（2026年度試験まで）',
      from: null,
      to: '2027-03-31',
      source: [{ ref: 'examList', loc: '「2026年度試験（〜2027年3月31日まで）には…2022年度版の区分表が適用されます」' }]
    },
    {
      id: '2027版',
      label: '2027年度版の区分表（2027年度試験から）',
      from: '2027-04-01',
      to: null,
      source: [{ ref: 'kaitei2027', loc: '1. 基本的な考え方「適用は2027年4月1日から」' }]
    }
  ],
  // 両方の版に共通する項目の appliesTo
  allEditionsLabel: '両方',

  levels: ['3級', '2級', '1級', '範囲外', '級未確認'],

  // 本文中の {{キー}} は、この値に置き換えて表示する
  values: {
    '消費税率': {
      value: 10, unit: '%',
      note: '標準税率。国税7.8%と地方消費税2.2%の合計',
      source: [{ ref: 'nta6303' }]
    },
    '軽減税率': {
      value: 8, unit: '%',
      note: '飲食料品などに適用',
      source: [{ ref: 'nta6303' }]
    },
    '3級の試験時間': {
      value: 60, unit: '分',
      source: [{ ref: 'class3Exam' }]
    },
    '3級の合格基準': {
      value: 70, unit: '%以上',
      source: [{ ref: 'class3Exam' }]
    },
    '3級の大問数': {
      value: '3題以内', unit: '',
      source: [{ ref: 'class3Exam' }]
    },
    '2027配点_第1問': { value: 45, unit: '点', source: [{ ref: 'haiten2027' }] },
    '2027配点_第2問': { value: 25, unit: '点', source: [{ ref: 'haiten2027' }] },
    '2027配点_第3問': { value: 30, unit: '点', source: [{ ref: 'haiten2027' }] },
    '版の切替日': {
      value: '2027-04-01', unit: '',
      source: [{ ref: 'examList' }]
    }
  },

  srs: {
    // Leitner方式: 箱1〜5の出題間隔（日）
    leitnerDays: { value: [1, 2, 4, 8, 16], source: [{ ref: 'supplement', loc: 'Leitner方式の一般的な間隔（倍々）' }] },
    // 仕訳ドリルで間違えた問題を出す日（間違えた日から）
    reviewOffsets: { value: [1, 3, 7], source: [{ ref: 'request', loc: '翌日、3日後、7日後に再出題' }] },
    // 1回のカード学習で出す新しいカードの上限
    newCardsPerSession: { value: 20, source: [{ ref: 'supplement' }] }
  },

  study: {
    weekdayMinutes: { value: 120, source: [{ ref: 'request', loc: '平日2時間' }] },
    weekendMinutes: { value: 240, source: [{ ref: 'request', loc: '週末4時間' }] }
  },

  // 勘定科目の5つのグループ（＋その他）。表示順
  accountGroups: ['資産', '負債', '純資産', '収益', '費用', 'その他']
};
