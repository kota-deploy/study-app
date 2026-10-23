/*
 * GitHub Pages に公開するファイルを _site/ にまとめる: node scripts/build-site.js
 *  - アプリに必要なファイルだけをコピーする（テストや資料、ひな形は含めない）
 *  - 環境変数 SUPABASE_URL / SUPABASE_ANON_KEY / SITE_URL から config.js を作る
 *    公開版は常に requireLogin: true（ログインするまで中身を表示しない）。接続情報がなければ、ログイン画面に「準備ができていない」と出る
 *  - sw.js の版を、コミットごとに変える（新しい版を端末に届けるため）
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_site');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);

const copy = (rel) => fs.cpSync(path.join(ROOT, rel), path.join(OUT, rel), { recursive: true });
['index.html', 'manifest.webmanifest', 'css', 'js', 'icons'].forEach(copy);
fs.mkdirSync(path.join(OUT, 'courses'));
fs.readdirSync(path.join(ROOT, 'courses')).filter((n) => n !== '_template').forEach((n) => copy(path.join('courses', n)));

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';
const site = process.env.SITE_URL || '';
// 従来の JWT 形式のキーは、中身の role で判定する
function jwtRole(k) {
  const parts = k.split('.');
  if (parts.length !== 3) return null;
  try { return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role || null; } catch (e) { return null; }
}
if (/^sb_secret_/.test(key) || jwtRole(key) === 'service_role') {
  console.error('SUPABASE_ANON_KEY に secret（service_role）キーが入っています。公開用の anon（publishable）キーにしてください。');
  process.exit(1);
}
// 公開版は必ず入口でログインを求める。接続情報がまだなくても、中身は表示しない
const config = 'window.STUDY_APP_CONFIG = ' + JSON.stringify(
  url && key ? { requireLogin: true, supabaseUrl: url, supabaseAnonKey: key, siteUrl: site } : { requireLogin: true },
  null, 2) + ';\n';
fs.writeFileSync(path.join(OUT, 'config.js'), config);

// コミットが同じでも、公開をやり直すたびに版を変える（設定を変えて再実行したときも、端末が更新に気づけるように）
const version = process.env.GITHUB_SHA
  ? process.env.GITHUB_SHA.slice(0, 8) + '-' + (process.env.GITHUB_RUN_ID || '0') + '-' + (process.env.GITHUB_RUN_ATTEMPT || '1')
  : String(Date.now());
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').replace('__BUILD__', version);
fs.writeFileSync(path.join(OUT, 'sw.js'), sw);

fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log('_site を作りました（同期: ' + (url && key ? 'あり' : 'なし') + '、版: ' + version + '）');
