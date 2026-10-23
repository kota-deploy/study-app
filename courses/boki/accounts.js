/*
 * 勘定科目マスター（ドリルのプルダウンと採点に使う）
 * 標準・許容勘定科目表の「A欄（標準）」の科目だけを載せる。B欄（許容）は allowed に参考として持つ
 * contra: true は評価勘定（資産のマイナス）
 */
window.DATA_BOKI_ACCOUNTS = (function () {
  var BOTH = '両方';
  var K3 = [{ ref: 'kamoku2022', loc: '3級 A欄' }, { ref: 'kamoku2027', loc: '3級 A欄' }];
  var K2 = [{ ref: 'kamoku2022', loc: '2級 A欄' }, { ref: 'kamoku2027', loc: '2級 A欄' }];
  var K3_EACH = [{ ref: 'kamoku2022', loc: '3級 A欄「〜など（各勘定）」' }, { ref: 'kamoku2027', loc: '3級 A欄「（各勘定）」' }];

  var list = [];
  function add(group, names, opt) {
    names.forEach(function (n) {
      var name = typeof n === 'string' ? n : n.name;
      var extra = typeof n === 'string' ? {} : n;
      list.push({
        name: name,
        group: group,
        contra: !!extra.contra,
        allowed: extra.allowed || [],
        level: extra.level || opt.level,
        appliesTo: extra.appliesTo || opt.appliesTo || BOTH,
        source: extra.source || opt.source,
        needsReview: !!(extra.needsReview || opt.needsReview),
        note: extra.note || opt.note || ''
      });
    });
  }

  /* ---------- 3級（両方の版） ---------- */
  add('資産', [
    '現金', '小口現金',
    { name: '普通預金', allowed: ['銀行預金'] },
    { name: '当座預金', allowed: ['銀行預金'] },
    { name: '定期預金', allowed: ['銀行預金'] },
    '売掛金', 'クレジット売掛金', '電子記録債権',
    { name: '貸倒引当金', contra: true },
    '繰越商品', '貸付金',
    { name: '従業員貸付金', allowed: ['貸付金'] },
    { name: '役員貸付金', allowed: ['貸付金'] },
    '立替金',
    { name: '従業員立替金', allowed: ['立替金'] },
    { name: '前払金', allowed: ['前渡金'] },
    { name: '未収入金', allowed: ['未収金'] },
    '仮払金', '受取商品券', '差入保証金', '貯蔵品',
    { name: '仮払消費税', allowed: ['仮払金'] },
    { name: '仮払法人税等', allowed: ['仮払金'] },
    '建物',
    { name: '建物減価償却累計額', contra: true, allowed: ['減価償却累計額'] },
    '備品',
    { name: '備品減価償却累計額', contra: true, allowed: ['減価償却累計額'] },
    { name: '車両運搬具', allowed: ['車両', '運搬具'] },
    { name: '車両運搬具減価償却累計額', contra: true, allowed: ['車両減価償却累計額', '減価償却累計額'] },
    '土地'
  ], { level: '3級', source: K3 });

  // 経過勘定は「〜など（各勘定）」として示されている
  add('資産', [
    { name: '前払保険料', allowed: ['前払費用'] },
    { name: '前払家賃', allowed: ['前払費用'] },
    { name: '未収利息', allowed: ['未収収益'] },
    { name: '未収家賃', allowed: ['未収収益'] }
  ], { level: '3級', source: K3_EACH });

  add('負債', [
    '買掛金', '電子記録債務', '前受金',
    { name: '借入金', allowed: ['銀行借入金'] },
    { name: '役員借入金', allowed: ['借入金'] },
    { name: '当座借越', allowed: ['借入金'] },
    '未払金', '仮受金', '預り金',
    { name: '従業員預り金', allowed: ['預り金'] },
    { name: '所得税預り金', allowed: ['預り金'] },
    { name: '住民税預り金', allowed: ['預り金'] },
    { name: '社会保険料預り金', allowed: ['預り金'] },
    { name: '仮受消費税', allowed: ['仮受金'] },
    { name: '未払消費税', allowed: ['未払金'] },
    '未払法人税等', '未払配当金'
  ], { level: '3級', source: K3 });

  add('負債', [
    { name: '未払利息', allowed: ['未払費用'] },
    { name: '未払家賃', allowed: ['未払費用'] },
    { name: '未払給料', allowed: ['未払費用'] },
    { name: '前受家賃', allowed: ['前受収益'] },
    { name: '前受地代', allowed: ['前受収益'] },
    { name: '前受手数料', allowed: ['前受収益'] }
  ], { level: '3級', source: K3_EACH });

  add('純資産', ['資本金', '利益準備金', '繰越利益剰余金'], { level: '3級', source: K3 });

  add('収益', [
    '売上', '受取家賃', '受取地代', '受取手数料', '受取利息',
    { name: '雑益', allowed: ['雑収入', '雑収益'] },
    { name: '貸倒引当金戻入', allowed: ['貸倒引当金戻入益'] },
    '償却債権取立益',
    { name: '固定資産売却益', allowed: ['備品売却益', '土地売却益', '建物売却益'] }
  ], { level: '3級', source: K3 });

  add('費用', [
    '仕入', '売上原価',
    { name: '発送費', allowed: ['支払運賃', '発送運賃'] },
    { name: '給料', allowed: ['給料手当', '賃金給料'] },
    { name: '法定福利費', allowed: ['社会保険料'] },
    { name: '広告宣伝費', allowed: ['広告費', '広告料', '宣伝費'] },
    { name: '支払手数料', allowed: ['販売手数料'] },
    '支払利息',
    { name: '旅費交通費', allowed: ['旅費', '交通費'] },
    { name: '貸倒引当金繰入', allowed: ['貸倒引当金繰入額'] },
    '貸倒損失',
    { name: '減価償却費', allowed: ['建物減価償却費', '備品減価償却費'] },
    '通信費',
    { name: '消耗品費', allowed: ['事務用消耗品費'] },
    { name: '水道光熱費', allowed: ['光熱水費'] },
    { name: '支払家賃', note: '2022版はB欄に地代家賃など。2027版でB欄を削除' },
    { name: '支払地代', note: '2022版はB欄に地代家賃など。2027版でB欄を削除' },
    { name: '保険料', allowed: ['支払保険料', '火災保険料'] },
    { name: '租税公課', allowed: ['公租公課', '固定資産税', '印紙税'] },
    { name: '修繕費', allowed: ['(支払)修繕料', '修理費'] },
    '雑費',
    { name: '雑損', allowed: ['雑損失'] },
    { name: '固定資産売却損', allowed: ['備品売却損', '建物売却損', '土地売却損'] },
    { name: '保管費', allowed: ['保管料', '倉庫料'] },
    '諸会費',
    { name: '法人税、住民税及び事業税', allowed: ['法人税等'] }
  ], { level: '3級', source: K3 });

  add('その他', ['現金過不足', '損益'], { level: '3級', source: K3 });

  /* ---------- 版によって級が変わる科目 ---------- */
  add('資産', [{ name: '商品' }], {
    level: { '2022版': '2級', '2027版': '3級' },
    source: [{ ref: 'kamoku2022', loc: '2級 A欄' }, { ref: 'kamoku2027', loc: '3級 A欄（2級から移動）' }]
  });
  add('費用', [{ name: '固定資産除却損', allowed: ['固定資産廃棄損', '備品除却損', '建物除却損'] }], {
    level: { '2022版': '2級', '2027版': '3級' },
    source: [{ ref: 'kamoku2022', loc: '2級 A欄' }, { ref: 'kamoku2027', loc: '3級 A欄（新設）' }]
  });

  /* ---------- 2022版のみ（2027版で削除。紙の手形の廃止） ---------- */
  var T2022 = [{ ref: 'kamoku2022', loc: '3級 A欄' }, { ref: 'kaitei2027', loc: '第二 3．手形関連の規定はすべて削除' }];
  add('資産', [{ name: '受取手形' }, { name: '手形貸付金', allowed: ['貸付金'] }], { level: '3級', appliesTo: '2022版', source: T2022 });
  add('負債', [{ name: '支払手形' }, { name: '手形借入金', allowed: ['借入金'] }], { level: '3級', appliesTo: '2022版', source: T2022 });

  /* ---------- 2級（連結会計で使う） ---------- */
  add('資産', ['子会社株式', 'のれん'], { level: '2級', source: K2 });
  add('純資産', ['資本準備金', '資本剰余金', '利益剰余金', '非支配株主持分'], { level: '2級', source: K2 });
  add('収益', ['受取配当金'], { level: '2級', source: K2 });
  add('費用', ['のれん償却'], { level: '2級', source: K2 });
  add('その他', ['非支配株主に帰属する当期純利益'], { level: '2級', source: K2 });

  // 連結精算表の表示科目。勘定科目表には載っていない
  var CONSOL = [
    { ref: 'kubun2022', loc: '第六 4．連結会社間取引の処理' },
    { ref: 'kubun2027', loc: '第六 4．連結会社間取引の処理' },
    { ref: 'supplement', loc: '連結精算表で使う財務諸表の表示科目' }
  ];
  add('収益', [{ name: '売上高', note: '連結精算表の表示科目（個別の仕訳では「売上」）' }],
    { level: '2級', source: CONSOL, needsReview: true });
  add('純資産', [{ name: '剰余金の配当', note: '連結精算表（株主資本等変動計算書の部）の表示科目' }],
    { level: '2級', source: CONSOL, needsReview: true });

  return list;
})();
