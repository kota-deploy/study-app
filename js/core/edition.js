/* 版（edition）の判定。コースの設定データ（editions）だけで決まり、版ごとの分岐は書かない */
(function (root) {
  'use strict';
  var SA = root.SA = root.SA || {};
  var E = SA.edition = {};

  // 受験予定日から、適用される版のIDを返す。未設定なら null
  E.active = function (config, examDate) {
    if (!examDate) return null;
    for (var i = 0; i < config.editions.length; i++) {
      var ed = config.editions[i];
      if ((!ed.from || examDate >= ed.from) && (!ed.to || examDate <= ed.to)) return ed.id;
    }
    return null;
  };

  E.editionById = function (config, id) {
    for (var i = 0; i < config.editions.length; i++) {
      if (config.editions[i].id === id) return config.editions[i];
    }
    return null;
  };

  /*
   * 項目の表示状態
   *  inScope: 出題対象か（復習キューに入れてよいか）
   *  badge:   表示するバッジ（null ならなし）
   */
  E.status = function (item, config, examDate) {
    var all = config.allEditionsLabel;
    if (item.appliesTo === all) return { inScope: true, badge: null };
    var act = E.active(config, examDate);
    if (!act || item.appliesTo === act) return { inScope: true, badge: item.appliesTo + 'のみ' };
    return { inScope: false, badge: '対象外' };
  };

  E.inScope = function (item, config, examDate) {
    return E.status(item, config, examDate).inScope;
  };

  // 級の表示。版ごとに級が違う項目は、版が決まっていればその版の級を、未設定なら両方を出す
  E.levelText = function (item, config, examDate) {
    var lv = item.level;
    if (typeof lv === 'string') return lv;
    var act = E.active(config, examDate);
    if (act && lv[act]) return lv[act];
    return config.editions.map(function (ed) { return ed.id + ' ' + lv[ed.id]; }).join(' / ');
  };

  // 項目が取りうる級の一覧（集計・検証用）
  E.levelValues = function (item) {
    var lv = item.level;
    if (typeof lv === 'string') return [lv];
    return Object.keys(lv).map(function (k) { return lv[k]; });
  };
})(typeof window !== 'undefined' ? window : this);
