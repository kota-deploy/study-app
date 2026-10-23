/* コースの登録。各コースの course.js が SA.registerCourse() を呼ぶ */
(function (root) {
  'use strict';
  var SA = root.SA = root.SA || {};
  SA.courseList = [];
  SA.courses = {};

  /*
   * def: {
   *   id, title, subtitle, mark,
   *   data: { config, sources, accounts, plan, lessons, drills, cards }
   * }
   */
  SA.registerCourse = function (def) {
    if (!def || !def.id) throw new Error('コースに id がありません');
    if (SA.courses[def.id]) throw new Error('コース id が重複しています: ' + def.id);
    var d = def.data || {};
    var course = {
      id: def.id,
      title: def.title,
      subtitle: def.subtitle || '',
      mark: def.mark || def.title.charAt(0),
      config: d.config,
      sources: d.sources || {},
      accounts: d.accounts || [],
      plan: d.plan || { weeks: [] },
      lessons: d.lessons || [],
      drills: d.drills || [],
      cards: d.cards || []
    };
    course.accountsByName = {};
    course.accounts.forEach(function (a) { course.accountsByName[a.name] = a; });
    course.lessonsById = {};
    course.lessons.forEach(function (l) { course.lessonsById[l.id] = l; });
    course.drillsById = {};
    course.drills.forEach(function (q) { course.drillsById[q.id] = q; });
    course.cardsById = {};
    course.cards.forEach(function (c) { course.cardsById[c.id] = c; });
    SA.courses[def.id] = course;
    SA.courseList.push(course);
    return course;
  };
})(typeof window !== 'undefined' ? window : this);
