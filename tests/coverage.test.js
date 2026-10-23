/*
 * 網羅性のチェック: 出題区分表の3級の項目（2022年度版・2027年度版）が、どの解説・問題・カードで扱われているか
 * 区分表の項目を追加・変更したら、この表も更新する
 */
'use strict';
const { suite, test, assert } = require('./harness');
const { load } = require('./load');

const SA = load().SA;
const course = SA.courses.boki;

// [区分表の項目, 適用版, 解説ID の一覧]
const KUBUN_3 = [
  ['第一 1．基礎概念（資産・負債・資本、収益・費用、PLとBSの関係）', '両方', ['l-overview', 'l-bs']],
  ['第一 2．取引（意義と種類、8要素と結合関係）', '両方', ['l-dr-cr']],
  ['第一 3．勘定（分類、記入法則、仕訳、貸借平均の原理）', '両方', ['l-dr-cr', 'l-tb']],
  ['第一 4．帳簿（主要簿、補助簿）', '両方', ['l-books']],
  ['第一 5．証ひょうと伝票（入金・出金・振替伝票、集計・管理）', '両方', ['l-slips']],
  ['第二 1．現金、現金出納帳、現金過不足', '両方', ['l-cash', 'l-books']],
  ['第二 1．普通預金・当座預金・その他の預貯金、当座預金出納帳', '両方', ['l-cash', 'l-books']],
  ['第二 1．小口現金、小口現金出納帳', '両方', ['l-petty']],
  ['第二 3．売掛金・買掛金、売掛金元帳・買掛金元帳', '両方', ['l-receivables', 'l-books']],
  ['第二 3．電子記録債権・電子記録債務', '両方', ['l-receivables']],
  ['第二 3．クレジット売掛金', '両方', ['l-receivables']],
  ['第二 4．貸付金・借入金、未収入金・未払金、前払金・前受金、立替金・預り金、仮払金・仮受金、受取商品券、差入保証金※', '両方', ['l-other-claims']],
  ['第二 5．手形（振出・受入・取立・支払、記入帳、手形貸付金・借入金）', '2022版', ['l-tegata']],
  ['第二 引当金 ア．貸倒引当金（実績法）', '両方', ['l-allowance']],
  ['第二 商品の売買 ア．3分法、エ．返品、カ．仕入帳と売上帳', '両方', ['l-sanbunpo', 'l-books']],
  ['第二 商品の売買 イ．販売のつど売上原価勘定に振り替える方法（2027版で3級）', '両方', ['l-taiwritsu']],
  ['第二 商品の売買 キ．商品有高帳（先入先出法、移動平均法）', '両方', ['l-inventory-ledger']],
  ['第二 有形固定資産 ア．取得、イ．売却、オ．減価償却（間接法・定額法）、ク．固定資産台帳', '両方', ['l-depr', 'l-books']],
  ['第二 有形固定資産 ウ．除却・廃棄、定率法※（2027版で3級）', '両方', ['l-teiritsu']],
  ['第二 収益と費用（受取手数料・給料・法定福利費・貸倒損失・償却債権取立益など）', '両方', ['l-dr-cr', 'l-allowance', 'l-tax']],
  ['第二 税金（固定資産税など、法人税・住民税・事業税※、消費税（税抜方式））', '両方', ['l-tax']],
  ['第三 1．試算表の作成', '両方', ['l-tb']],
  ['第三 2．精算表（8桁）', '両方', ['l-closing']],
  ['第三 3．決算整理（当座借越、商品棚卸、貸倒見積り、減価償却、貯蔵品、経過勘定、月次決算※）', '両方', ['l-closing', 'l-accrual', 'l-allowance', 'l-depr', 'l-sanbunpo']],
  ['第三 4．決算整理後残高試算表', '両方', ['l-closing']],
  ['第三 5．収益と費用の損益勘定への振替、6．繰越利益剰余金への振替', '両方', ['l-fs']],
  ['第三 8．帳簿の締切（英米式決算法）', '両方', ['l-closing-books']],
  ['第三 9．損益計算書と貸借対照表の作成（勘定式）', '両方', ['l-fs', 'l-closing']],
  ['第四 1．資本金（設立、増資）', '両方', ['l-equity']],
  ['第四 3．利益剰余金（利益準備金、繰越利益剰余金）', '両方', ['l-equity']],
  ['第四 4．剰余金の配当※', '両方', ['l-equity']]
];

suite('網羅性（区分表3級 → 解説・問題）', () => {
  KUBUN_3.forEach(([item, applies, lessonIds]) => {
    test(item, () => {
      lessonIds.forEach((id) => assert.ok(course.lessonsById[id], '解説がありません: ' + id));
      const lessons = lessonIds.map((id) => course.lessonsById[id]);
      if (applies !== '両方') assert.ok(lessons.some((l) => l.appliesTo === applies), applies + ' の解説がありません');
      const practice = course.drills.filter((q) => lessonIds.includes(q.lessonId));
      assert.ok(practice.length > 0, '練習問題がありません');
    });
  });
});

module.exports = { KUBUN_3 };
