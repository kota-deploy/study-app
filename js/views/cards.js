/* フラッシュカード: Leitner方式（箱1〜5）。復習待ち → 新しいカードの順に出す */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, M = SA.model, U = SA.util, R = SA.srs;
  var esc = UI.esc;

  var deck = '';
  var session = null; // { key, ids, i, shown }

  function decks(course) {
    return U.uniq(course.cards.map(function (c) { return c.deck; }));
  }

  function start(ctx) {
    var course = ctx.course, cs = ctx.cstate;
    var inDeck = function (c) { return !deck || c.deck === deck; };
    var due = M.dueCards(course, cs, ctx.today).filter(inDeck);
    var fresh = M.newCards(course, cs).filter(inDeck).slice(0, course.config.srs.newCardsPerSession.value);
    session = { key: deck + '|' + ctx.today + '|' + cs.examDate, ids: due.concat(fresh).map(function (c) { return c.id; }), i: 0, shown: false, due: due.length, fresh: fresh.length };
  }

  SA.views.cards = function (ctx) {
    if (!session || session.key !== deck + '|' + ctx.today + '|' + ctx.cstate.examDate) start(ctx);
    render(ctx);
  };

  function render(ctx) {
    var course = ctx.course, cs = ctx.cstate;
    var boxes = M.cardBoxes(course, cs);
    var head = '<h1>フラッシュカード</h1>' +
      '<div class="filters"><label class="field full">デッキ<select data-deck>' +
      UI.options([{ value: '', label: 'すべてのデッキ' }].concat(decks(course)), deck) + '</select></label></div>' +
      '<p class="small muted">今回は、復習待ち ' + session.due + '枚と新しいカード ' + session.fresh + '枚です。</p>';
    var foot = '<div class="card"><h3>箱ごとの枚数</h3><div class="boxes">' +
      boxes.map(function (n, i) {
        return '<div><span class="small muted">箱' + (i + 1) + '</span><b>' + n + '</b><span class="small muted">' + course.config.srs.leitnerDays.value[i] + '日後</span></div>';
      }).join('') + '</div></div>';

    if (session.i >= session.ids.length) {
      ctx.el.innerHTML = head + '<div class="card"><h2>今日の分は終わりです</h2><p>' +
        (session.ids.length ? session.ids.length + '枚を学習しました。' : '出すカードがありません。') + '</p>' +
        '<div class="btn-row"><button class="btn" data-more>新しいカードをさらに出す</button></div></div>' + foot;
      bindDeck(ctx);
      UI.$(ctx.el, '[data-more]').addEventListener('click', function () { start(ctx); render(ctx); });
      return;
    }

    var c = course.cardsById[session.ids[session.i]];
    var st = cs.cards[c.id];
    ctx.el.innerHTML = head +
      '<div class="card">' +
      '<div class="q-meta"><span class="q-count">' + (session.i + 1) + ' / ' + session.ids.length + '</span>' +
      '<span>' + esc(c.deck) + '</span><span>' + (st ? '箱' + st.box : '新しいカード') + '</span></div>' +
      UI.badges(course, cs, c) +
      '<div class="flash-wrap"><div class="flash" data-flash>' +
      '<div class="flash-face front"><span class="label">問い</span>' + UI.text(course, c.front) + '</div>' +
      '<div class="flash-face back" aria-hidden="true"><span class="label">答え</span>' + UI.text(course, c.back) + '</div>' +
      '</div></div>' +
      '<div class="btn-row stretch" data-show-row><button class="btn btn-primary" data-show>答えを見る</button></div>' +
      '<div class="rate-row hidden" data-rate-row>' +
      '<button class="btn rate-ng" data-rate="ng">' + R.RATINGS.ng + '<small>箱1へ</small></button>' +
      '<button class="btn" data-rate="unsure">' + R.RATINGS.unsure + '<small>同じ箱</small></button>' +
      '<button class="btn btn-primary" data-rate="ok">' + R.RATINGS.ok + '<small>次の箱へ</small></button></div>' +
      '<details class="small" style="margin-top:12px"><summary>出典</summary>' + UI.sources(course, c) + '</details>' +
      '</div>' + foot;

    bindDeck(ctx);
    var show = UI.$(ctx.el, '[data-show]');
    show.addEventListener('click', function () {
      session.shown = true;
      UI.$(ctx.el, '[data-flash]').classList.add('flipped');
      UI.$(ctx.el, '.flash-face.back').removeAttribute('aria-hidden');
      UI.$(ctx.el, '.flash-face.front').setAttribute('aria-hidden', 'true');
      UI.$(ctx.el, '[data-show-row]').classList.add('hidden');
      UI.$(ctx.el, '[data-rate-row]').classList.remove('hidden');
      UI.$(ctx.el, '[data-rate="ok"]').focus();
    });
    UI.$$(ctx.el, '[data-rate]').forEach(function (b) {
      b.addEventListener('click', function () {
        M.rateCard(course, cs, c, b.getAttribute('data-rate'), ctx.today);
        ctx.save();
        session.i++;
        session.shown = false;
        render(ctx);
      });
    });
  }

  function bindDeck(ctx) {
    UI.$(ctx.el, '[data-deck]').addEventListener('change', function (e) {
      deck = e.target.value;
      start(ctx);
      render(ctx);
    });
  }
})(window);
