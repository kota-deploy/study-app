/* 簿記コースの登録。データファイル（DATA_BOKI_*）を読み込んだ後に実行する */
SA.registerCourse({
  id: 'boki',
  title: '簿記・会計',
  subtitle: '日商簿記3級を中心に、財務諸表分析と連結会計の入口まで',
  mark: '簿',
  data: {
    config: window.DATA_BOKI_CONFIG,
    sources: window.DATA_BOKI_SOURCES,
    accounts: window.DATA_BOKI_ACCOUNTS,
    plan: window.DATA_BOKI_PLAN,
    lessons: window.DATA_BOKI_LESSONS,
    drills: window.DATA_BOKI_DRILLS,
    cards: window.DATA_BOKI_CARDS
  }
});
