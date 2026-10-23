/* 出典マスター。各データの source は [{ ref: 'ここのキー', loc: '該当箇所' }] で参照する */
window.DATA_BOKI_SOURCES = {
  examList: {
    title: '出題区分表等（商工会議所の検定試験 簿記）',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/bookkeeping/exam-list',
    retrieved: '2026-10-23',
    edition: '両方',
    official: true,
    note: '2026年度試験（〜2027-03-31）は2022年度版、2027年度試験（2027-04-01〜）は2027年度版を適用すると明記'
  },
  kubun2022: {
    title: '商工会議所簿記検定試験出題区分表「商業簿記・会計学」（2021年12月10日最終改定、2022年4月1日施行）',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/wp/wp-content/uploads/2024/12/shogyouboki_kubun.pdf',
    retrieved: '2026-10-23',
    edition: '2022版',
    official: true
  },
  kubun2027: {
    title: '商工会議所簿記検定試験出題区分表「商業簿記・会計学」【確定版】（2026年7月31日最終制定、2027年4月1日施行）',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/wp/wp-content/uploads/2014/10/2027kubunhyo_fixed.pdf',
    retrieved: '2026-10-23',
    edition: '2027版',
    official: true
  },
  kubunTrack2027: {
    title: '出題区分表「商業簿記・会計学」2022年度版からの変更箇所',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/wp/wp-content/uploads/2014/10/2027kubunhyo_track.pdf',
    retrieved: '2026-10-23',
    edition: '2027版',
    official: true
  },
  kamoku2022: {
    title: '商業簿記標準・許容勘定科目表（2021年12月10日改定、2022年4月1日施行）',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/wp/wp-content/uploads/2021/12/2022_kamoku.pdf',
    retrieved: '2026-10-23',
    edition: '2022版',
    official: true
  },
  kamoku2027: {
    title: '商業簿記標準・許容勘定科目表【確定版】（2026年7月31日最終改定、2027年4月1日施行）',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/wp/wp-content/uploads/2014/10/2027kamokuhyo_fixed.pdf',
    retrieved: '2026-10-23',
    edition: '2027版',
    official: true
  },
  kaitei2021: {
    title: '改定項目等の説明書（収益認識に関する会計基準等の適用にともなう出題区分表などの改定について）',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/wp/wp-content/uploads/2021/03/2021_kaitei_shushi.pdf',
    retrieved: '2026-10-23',
    edition: '2022版',
    official: true
  },
  kaitei2027: {
    title: '改定項目等の説明書【確定版】（紙媒体による手形・小切手の廃止およびリースに関する会計基準等の適用にともなう改定について）',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/wp/wp-content/uploads/2014/10/2027_kaitei_shushi_fixed.pdf',
    retrieved: '2026-10-23',
    edition: '2027版',
    official: true
  },
  class3Exam: {
    title: '簿記 3級 試験科目・注意事項',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/bookkeeping/class3/exam',
    retrieved: '2026-10-23',
    edition: '両方',
    official: true
  },
  haiten2027: {
    title: '【重要】2027年度以降の日商簿記３級試験問題の配点について（2026年9月25日）',
    publisher: '日本商工会議所',
    url: 'https://www.kentei.ne.jp/51504',
    retrieved: '2026-10-23',
    edition: '2027版',
    official: true,
    note: '2027年3月31日までの受験は従来の配点。従来の配点の内訳は、このページには記載なし'
  },
  nta6303: {
    title: 'タックスアンサー No.6303 消費税および地方消費税の税率',
    publisher: '国税庁',
    url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6303.htm',
    retrieved: '2026-10-23',
    edition: '両方',
    official: true
  },
  asbj22: {
    title: '企業会計基準第22号「連結財務諸表に関する会計基準」',
    publisher: '企業会計基準委員会（ASBJ）',
    url: 'https://www.asb-j.jp/jp/accounting_standards_system/details.html?topics_id=111',
    retrieved: '2026-10-23',
    edition: '両方',
    official: true
  },
  fsaCF: {
    title: '連結キャッシュ・フロー計算書等の作成基準（企業会計審議会）',
    publisher: '金融庁',
    url: 'https://www.fsa.go.jp/p_mof/singikai/kaikei/tosin/1a909b2.htm',
    retrieved: '2026-10-23',
    edition: '両方',
    official: true
  },
  request: {
    title: '依頼書の指定（学習計画・Week 1の問題・復習の間隔）',
    publisher: '利用者本人',
    url: null,
    retrieved: '2026-10-23',
    edition: '両方',
    official: false
  },
  supplement: {
    title: '補足（公式資料外）',
    publisher: null,
    url: null,
    retrieved: null,
    edition: '両方',
    official: false,
    note: '理解を助けるための例え・実務の話・一般的な指標の式など。試験の出題範囲の根拠ではありません'
  }
};
