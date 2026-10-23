/* 小さなテストの仕組み（外部ライブラリなし） */
'use strict';
const assert = require('assert');

const results = [];
let current = '';

function suite(name, fn) {
  current = name;
  fn();
}

function test(name, fn) {
  try {
    fn();
    results.push({ ok: true, name: current + ' > ' + name });
  } catch (e) {
    results.push({ ok: false, name: current + ' > ' + name, error: e });
  }
}

function summary() {
  results.forEach((r) => {
    console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.name);
    if (!r.ok) console.log('      ' + String(r.error && r.error.message).split('\n').join('\n      '));
  });
  const failed = results.filter((r) => !r.ok).length;
  console.log('\n' + (results.length - failed) + ' 件成功 / ' + failed + ' 件失敗');
  return failed;
}

module.exports = { suite, test, summary, assert };
