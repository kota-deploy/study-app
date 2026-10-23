/* 新しいコースの登録（ひな形）。data.js の後に読み込む */
SA.registerCourse({
  id: 'template',
  title: '新しいコース',
  subtitle: 'コースの説明',
  mark: '新',
  data: {
    config: window.DATA_TEMPLATE_CONFIG,
    sources: window.DATA_TEMPLATE_SOURCES,
    accounts: [],
    plan: window.DATA_TEMPLATE_PLAN,
    lessons: window.DATA_TEMPLATE_LESSONS,
    drills: window.DATA_TEMPLATE_DRILLS,
    cards: window.DATA_TEMPLATE_CARDS
  }
});
