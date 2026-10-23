/*
 * 同期の設定のひな形。このファイルを config.js という名前でコピーし、値を書き換える
 * config.js は .gitignore に入っているので、リポジトリには入らない
 * GitHub Pages では、GitHub Actions がリポジトリの変数（Variables）から config.js を作る
 *
 * anon（publishable）キーは、ブラウザに渡すための公開キー。データは RLS で本人だけに守られる
 * service_role（secret）キーは、絶対にここに書かない
 */
window.STUDY_APP_CONFIG = {
  // true: 開いたときにログイン画面を出し、ログインするまでアプリを表示しない
  requireLogin: true,
  supabaseUrl: 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co',
  supabaseAnonKey: 'ここに anon（publishable）キー',
  // 公開したアプリのURL（ファイルを直接開いた版から、ログインのメールを送るときの戻り先）
  siteUrl: 'https://あなたのユーザー名.github.io/study-app/'
};
