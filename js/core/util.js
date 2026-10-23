/* 共通ユーティリティ: 日付、金額の書式、HTMLエスケープ、テンプレート展開 */
(function (root) {
  'use strict';
  var SA = root.SA = root.SA || {};
  var U = SA.util = {};

  // テストで「今日」を固定できるようにする
  U._fixedToday = null;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  U.toISODate = function (d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  U.today = function () {
    return U._fixedToday || U.toISODate(new Date());
  };

  U.isISODate = function (s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = U.parseDate(s);
    return U.toISODate(d) === s;
  };

  U.parseDate = function (iso) {
    var p = iso.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  };

  U.addDays = function (iso, n) {
    var d = U.parseDate(iso);
    d.setDate(d.getDate() + n);
    return U.toISODate(d);
  };

  // b - a の日数
  U.diffDays = function (a, b) {
    var ms = U.parseDate(b) - U.parseDate(a);
    return Math.round(ms / 86400000);
  };

  U.weekdayJa = function (iso) {
    return '日月火水木金土'.charAt(U.parseDate(iso).getDay());
  };

  U.isWeekend = function (iso) {
    var w = U.parseDate(iso).getDay();
    return w === 0 || w === 6;
  };

  U.shortDate = function (iso) {
    var p = iso.split('-');
    return Number(p[1]) + '/' + Number(p[2]) + '(' + U.weekdayJa(iso) + ')';
  };

  U.nowStamp = function () { return new Date().toISOString(); };

  // 金額は3桁区切り。小数は使わない前提
  U.fmtNum = function (n, decimals) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    return n.toLocaleString('ja-JP', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0
    });
  };

  // "1,000" や "１０００" を整数に。不正なら null
  U.parseAmount = function (s) {
    if (typeof s === 'number') return Number.isInteger(s) && s >= 0 ? s : null;
    if (typeof s !== 'string') return null;
    var t = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[,，\s円]/g, '');
    if (!/^\d+$/.test(t)) return null;
    return Number(t);
  };

  // 小数も許す数値入力（指標の計算問題用）
  U.parseDecimal = function (s) {
    if (typeof s !== 'string') return null;
    var t = s.replace(/[０-９．]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[,，\s%％円回]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
  };

  U.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // {{キー}} を設定データの値に置き換える
  U.fillTemplate = function (text, values) {
    return String(text).replace(/\{\{([^}]+)\}\}/g, function (m, key) {
      var v = values && values[key.trim()];
      if (!v) return m;
      return (typeof v.value === 'number' ? U.fmtNum(v.value, v.decimals) : v.value) + (v.unit || '');
    });
  };

  U.templateKeys = function (text) {
    var keys = [];
    String(text).replace(/\{\{([^}]+)\}\}/g, function (m, key) { keys.push(key.trim()); return m; });
    return keys;
  };

  U.shuffle = function (arr, rand) {
    var a = arr.slice();
    var r = rand || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  U.uniq = function (arr) {
    return arr.filter(function (v, i) { return arr.indexOf(v) === i; });
  };
})(typeof window !== 'undefined' ? window : this);
