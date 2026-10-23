/*
 * テスト用ローダー: index.html の script タグを順に読み、画面に依存しないファイル（js/core と courses）を vm で実行する
 * ブラウザと同じ順序・同じファイルで検証するため
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function scriptList() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const re = /<script\s+src="([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function load(opts) {
  const o = opts || {};
  const ctx = { console: console };
  if (o.localStorage) ctx.localStorage = o.localStorage;
  ctx.window = ctx;
  vm.createContext(ctx);
  scriptList()
    .filter((src) => src.startsWith('js/core/') || src.startsWith('courses/'))
    .forEach((src) => {
      const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
      vm.runInContext(code, ctx, { filename: src });
    });
  return ctx;
}

module.exports = { load, scriptList, ROOT };
