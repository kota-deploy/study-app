/*
 * 同期（Phase 2）: Supabase に1行（user_state）で保存し、PCとスマホで進捗を合わせる
 *  - ローカルが正。オンラインでログインしているときだけ送受信する
 *  - 競合は SA.merge（項目ごとに更新時刻が新しい方）で解決する
 *  - 設定（config.js）がない、またはログインしていない間は、Phase 1 と同じ動作
 *  - 学習データ・メールアドレス・トークンは、コンソールに出力しない
 */
(function (root) {
  'use strict';
  var SA = root.SA;
  var S = SA.storage, G = SA.merge;
  var Y = SA.sync = {};

  // 公開から2週間以上たった版に固定。integrity で中身の改ざんを検出する
  Y.LIB_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
  Y.LIB_INTEGRITY = 'sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok';
  var TABLE = 'user_state';

  var LABELS = {
    unconfigured: '同期なし',
    loading: '準備中',
    signedOut: '未ログイン',
    syncing: '同期中',
    synced: '同期済み',
    offline: 'オフライン',
    error: '同期エラー'
  };

  var client = null;
  var user = null;
  var status = { state: 'unconfigured', message: '', lastSyncedAt: null };
  var listeners = [];
  var running = false, again = false, timer = null;

  function setState(state, message) {
    status.state = state;
    status.message = message || '';
    listeners.forEach(function (fn) { fn(status); });
  }

  Y.status = function () { return status; };
  Y.label = function (state) { return LABELS[state] || state; };
  Y.onStatus = function (fn) { listeners.push(fn); };
  Y.user = function () { return user ? { email: user.email } : null; };
  Y.config = function () {
    var c = root.STUDY_APP_CONFIG;
    return c && c.supabaseUrl && c.supabaseAnonKey ? c : null;
  };

  function loadLibrary() {
    if (root.supabase && root.supabase.createClient) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = Y.LIB_URL;
      s.integrity = Y.LIB_INTEGRITY;
      s.crossOrigin = 'anonymous';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('同期用のライブラリを読み込めませんでした')); };
      document.head.appendChild(s);
    });
  }

  Y.init = function () {
    var cfg = Y.config();
    if (!cfg) { setState('unconfigured'); return; }
    setState('loading');
    loadLibrary().then(function () {
      client = root.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: AUTH_KEY }
      });
      client.auth.onAuthStateChange(function (event, session) {
        var was = user && user.id;
        user = session ? session.user : null;
        if (!user) { setState('signedOut'); return; }
        if (was !== user.id || event === 'SIGNED_IN') Y.syncNow();
      });
      return client.auth.getSession();
    }).then(function (res) {
      if (!res) return;
      user = res.data && res.data.session ? res.data.session.user : null;
      if (user) Y.syncNow();
      else setState(navigator.onLine ? 'signedOut' : 'offline');
    }).catch(function (e) {
      setState(navigator.onLine ? 'error' : 'offline', e && e.message);
    });

    S.onChange(function (source) {
      if (source === 'sync' || !user) return;
      clearTimeout(timer);
      timer = setTimeout(Y.syncNow, 1500);
    });
    root.addEventListener('online', function () { if (user) Y.syncNow(); });
    root.addEventListener('offline', function () { if (client) setState('offline'); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && user) Y.syncNow();
    });
  };

  // サーバーから取得 → 統合 → 必要ならローカルとサーバーを更新
  Y.syncNow = function () {
    if (!client || !user) return Promise.resolve();
    if (!navigator.onLine) { setState('offline'); return Promise.resolve(); }
    if (running) { again = true; return Promise.resolve(); }
    running = true;
    setState('syncing');
    return client.from(TABLE).select('data').eq('user_id', user.id).maybeSingle()
      .then(function (res) {
        if (res.error) throw new Error('サーバーから読み込めませんでした（' + res.error.message + '）');
        var remote = null;
        if (res.data && res.data.data) {
          var parsed = S.parseState(res.data.data);
          if (!parsed.ok) throw new Error('サーバーのデータの形式が正しくありません');
          remote = parsed.state;
        }
        var local = S.get();
        var merged = G.merge(local, remote);
        if (!G.sameContent(merged, local)) S.replace(merged, 'sync');
        if (remote && G.sameContent(merged, remote)) return null;
        return client.from(TABLE).upsert({ user_id: user.id, data: merged, updated_at: new Date().toISOString() });
      })
      .then(function (res) {
        if (res && res.error) throw new Error('サーバーに保存できませんでした（' + res.error.message + '）');
        status.lastSyncedAt = new Date().toISOString();
        setState('synced');
      })
      .catch(function (e) {
        setState(navigator.onLine ? 'error' : 'offline', e && e.message);
      })
      .then(function () {
        running = false;
        if (again) { again = false; Y.syncNow(); }
      });
  };

  /* ---------- 入口のログイン（ログインするまでアプリを表示しない） ---------- */

  // ログイン情報（Supabase のセッション）の保存先。学習データ（studyApp）とは別のキー
  var AUTH_KEY = 'studyApp.auth';

  // config.js で requireLogin が true のとき、入口でログインを求める
  Y.gateRequired = function () {
    var c = root.STUDY_APP_CONFIG;
    return !!(c && c.requireLogin);
  };

  // この端末に保存されたログイン情報（オフラインでも開けるようにするため。中身は表示しない）
  Y.hasStoredSession = function () {
    try {
      var raw = root.localStorage.getItem(AUTH_KEY);
      var s = raw ? JSON.parse(raw) : null;
      return !!(s && s.user && s.user.id);
    } catch (e) { return false; }
  };

  // 入口を通ってよいか
  //  - ログイン済み
  //  - または、まだ確認中・オフライン・通信エラーで、この端末に一度ログインした記録がある
  Y.unlocked = function () {
    if (!Y.gateRequired()) return true;
    if (user) return true;
    var waiting = ['loading', 'offline', 'error', 'syncing'].indexOf(status.state) >= 0;
    return waiting && Y.hasStoredSession();
  };

  // メールアドレスとパスワードでログインする
  Y.signInWithPassword = function (email, password) {
    if (!client) return Promise.reject(new Error('ログインの準備ができていません'));
    return client.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) { if (res.error) throw new Error(res.error.message); });
  };

  // パスワードを変える（ログイン中のみ）
  Y.updatePassword = function (password) {
    return client.auth.updateUser({ password: password })
      .then(function (res) { if (res.error) throw new Error(res.error.message); });
  };

  // ログイン用のメールを送る（確認コードとマジックリンク）。パスワードを忘れたとき用
  // アカウントは管理画面で作るので、ここでは新しいユーザーを作らない
  Y.sendLoginEmail = function (email) {
    if (!client) return Promise.reject(new Error('ログインの準備ができていません'));
    var cfg = Y.config();
    var here = location.protocol === 'file:' ? (cfg.siteUrl || undefined) : location.origin + location.pathname;
    return client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: here, shouldCreateUser: false } })
      .then(function (res) { if (res.error) throw new Error(res.error.message); });
  };

  // メールに書かれた確認コードでログインする（ホーム画面のアプリで使う）
  Y.verifyCode = function (email, code) {
    return client.auth.verifyOtp({ email: email, token: code, type: 'email' })
      .then(function (res) { if (res.error) throw new Error(res.error.message); });
  };

  Y.signOut = function () {
    if (!client) return Promise.resolve();
    return client.auth.signOut().then(function () { user = null; setState('signedOut'); });
  };

  Y.isReady = function () { return !!client; };
})(window);
