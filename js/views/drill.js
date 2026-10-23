/* ドリル: 仕訳（複数行・自動採点）、数値、選択。週・分野で絞り込み、順番・ランダム・復習 */
(function (root) {
  'use strict';
  var SA = root.SA;
  var UI = SA.ui, M = SA.model, U = SA.util, G = SA.grading, E = SA.edition;
  var esc = UI.esc;

  var filter = { week: '', topic: '', mode: 'order', includeOut: false };
  var session = null; // { key, ids, i, answered }

  var REVIEW_MSG = {
    queued: '復習キューに入れました（翌日・3日後・7日後に再出題します）。',
    advanced: '復習: 次の再出題日に進みました。',
    graduated: '復習: この問題は完了です。',
    notDue: '',
    none: '',
    outOfScope: '受験予定日の版では対象外のため、復習キューには入れません。'
  };

  function buildIds(ctx, q) {
    var course = ctx.course, cs = ctx.cstate;
    if (q.q) return course.drillsById[q.q] ? [q.q] : [];
    var mode = q.mode || filter.mode;
    if (mode === 'review') return M.dueDrillIds(course, cs, ctx.today);
    var list = course.drills.filter(function (d) {
      if (q.lesson && d.lessonId !== q.lesson) return false;
      if (filter.week && String(d.week) !== String(filter.week)) return false;
      if (filter.topic && d.topic !== filter.topic) return false;
      if (!filter.includeOut && !M.inScope(course, cs, d)) return false;
      return true;
    }).map(function (d) { return d.id; });
    return mode === 'random' ? U.shuffle(list) : list;
  }

  function startSession(ctx) {
    var key = JSON.stringify([ctx.query, filter]);
    session = { key: key, ids: buildIds(ctx, ctx.query), i: 0, answered: false };
  }

  SA.views.drill = function (ctx) {
    var key = JSON.stringify([ctx.query, filter]);
    if (!session || session.key !== key) startSession(ctx);
    render(ctx);
  };

  function accountOptions(course, cs) {
    var cfg = course.config;
    return '<option value="">勘定科目を選択</option>' + cfg.accountGroups.map(function (g) {
      var accs = course.accounts.filter(function (a) { return a.group === g && M.inScope(course, cs, a); });
      if (!accs.length) return '';
      return '<optgroup label="' + esc(g) + '">' + accs.map(function (a) {
        var st = E.status(a, cfg, cs.examDate);
        return '<option value="' + esc(a.name) + '">' + esc(a.name) + (st.badge ? '（' + esc(st.badge) + '）' : '') + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  function lineRow(opts) {
    return '<div class="line-row">' +
      '<select data-acc aria-label="勘定科目">' + opts + '</select>' +
      '<input type="text" inputmode="numeric" autocomplete="off" data-amt placeholder="金額" aria-label="金額">' +
      '<button class="btn btn-icon" data-rm aria-label="この行を削除">×</button></div>';
  }

  function render(ctx) {
    var course = ctx.course, cs = ctx.cstate;
    var base = '#/c/' + course.id;
    var q = ctx.query;
    var fixed = q.q || q.lesson || q.mode === 'review';

    var head = '<h1>ドリル</h1>';
    if (q.mode === 'review') head += '<p class="small muted">今日の復習（' + session.ids.length + '問）。 <a href="' + base + '/drill">通常の出題に戻る</a></p>';
    else if (q.lesson) head += '<p class="small muted">解説「' + esc((course.lessonsById[q.lesson] || {}).title || '') + '」の問題。 <a href="' + base + '/drill">すべての問題に戻る</a></p>';
    else if (q.q) head += '<p class="small muted"><a href="' + base + '/drill">すべての問題に戻る</a></p>';

    var filters = fixed ? '' :
      '<div class="filters">' +
      '<label class="field">週<select data-f="week">' + UI.weekOptions(course, filter.week) + '</select></label>' +
      '<label class="field">分野<select data-f="topic">' + UI.topicOptions(course.drills, filter.topic) + '</select></label>' +
      '<label class="field">出題順<select data-f="mode">' + UI.options([
        { value: 'order', label: '順番' }, { value: 'random', label: 'ランダム' }, { value: 'review', label: '復習待ちだけ' }
      ], filter.mode) + '</select></label>' +
      '<label class="check" style="align-self:end"><input type="checkbox" data-f="includeOut"' + (filter.includeOut ? ' checked' : '') + '>対象外も出す</label>' +
      '</div>';

    if (!session.ids.length) {
      ctx.el.innerHTML = head + filters + '<div class="card"><p>' +
        (filter.mode === 'review' || q.mode === 'review' ? '今日の復習はありません。' : '条件に合う問題がありません。') + '</p></div>';
      bindFilters(ctx);
      return;
    }
    if (session.i >= session.ids.length) {
      ctx.el.innerHTML = head + filters + '<div class="card"><h2>おつかれさまでした</h2><p>' + session.ids.length + '問を解きました。</p>' +
        '<div class="btn-row"><button class="btn btn-primary" data-restart>もう一度</button><a class="btn" href="' + base + '/stats">成績を見る</a></div></div>';
      bindFilters(ctx);
      UI.$(ctx.el, '[data-restart]').addEventListener('click', function () { startSession(ctx); render(ctx); });
      return;
    }

    var item = course.drillsById[session.ids[session.i]];
    var body;
    if (item.type === 'journal') {
      var opts = accountOptions(course, cs);
      body = '<div class="t-entry">' + ['debit', 'credit'].map(function (side) {
        return '<div class="side" data-side="' + side + '"><div class="side-title"><span>' + (side === 'debit' ? '借方' : '貸方') + '</span></div>' +
          '<div data-lines>' + lineRow(opts) + lineRow(opts) + '</div>' +
          '<button class="btn btn-small" data-addline>＋ 行</button></div>';
      }).join('') + '</div><div class="totals" data-totals></div>';
    } else if (item.type === 'numeric') {
      body = '<div class="numeric-row"><input type="text" inputmode="decimal" autocomplete="off" data-num aria-label="答え"><span>' + esc(item.unit || '') + '</span></div>';
    } else {
      body = item.choices.map(function (c, i) {
        return '<label class="choice"><input type="radio" name="choice" value="' + i + '"><span>' + esc(c) + '</span></label>';
      }).join('');
    }

    ctx.el.innerHTML = head + filters +
      '<div class="card">' +
      '<div class="q-meta"><span class="q-count">' + (session.i + 1) + ' / ' + session.ids.length + '</span>' +
      '<span>第' + item.week + '週</span><span>' + esc(item.topic) + '</span>' +
      '<span>' + ({ journal: '仕訳', numeric: '計算', choice: '選択' })[item.type] + '</span></div>' +
      UI.badges(course, cs, item) +
      '<p class="q-text">' + UI.text(course, item.text) + '</p>' +
      '<div data-answer>' + body + '</div>' +
      '<div class="btn-row stretch"><button class="btn btn-primary" data-grade>採点する</button>' +
      '<button class="btn" data-skip>とばす</button></div>' +
      '<div data-result></div>' +
      '</div>';

    bindFilters(ctx);
    bindQuestion(ctx, item);
  }

  function bindFilters(ctx) {
    UI.$$(ctx.el, '[data-f]').forEach(function (el) {
      el.addEventListener('change', function () {
        var k = el.getAttribute('data-f');
        filter[k] = el.type === 'checkbox' ? el.checked : el.value;
        startSession(ctx);
        render(ctx);
      });
    });
  }

  function readLines(sideEl) {
    return UI.$$(sideEl, '.line-row').map(function (r) {
      return { account: UI.$(r, '[data-acc]').value, amount: UI.$(r, '[data-amt]').value };
    });
  }

  function bindQuestion(ctx, item) {
    var course = ctx.course, cs = ctx.cstate;
    var el = ctx.el;
    var graded = false;

    if (item.type === 'journal') {
      var opts = accountOptions(course, cs);
      var updateTotals = function () {
        var d = G.total(G.cleanLines(readLines(UI.$(el, '[data-side="debit"]'))).lines);
        var c = G.total(G.cleanLines(readLines(UI.$(el, '[data-side="credit"]'))).lines);
        var ok = d === c && d > 0;
        UI.$(el, '[data-totals]').innerHTML =
          '<span>' + UI.yen(d) + '</span><span>' + UI.yen(c) + '</span>' +
          '<span class="state ' + (ok ? 'ok' : 'ng') + '">' + (ok ? '貸借一致' : (d + c > 0 ? '差額 ' + UI.yen(Math.abs(d - c)) : '合計')) + '</span>';
      };
      var bindRow = function (row) {
        var amt = UI.$(row, '[data-amt]');
        amt.addEventListener('input', updateTotals);
        amt.addEventListener('blur', function () {
          var v = U.parseAmount(amt.value);
          if (v !== null && amt.value !== '') amt.value = U.fmtNum(v);
        });
        UI.$(row, '[data-acc]').addEventListener('change', updateTotals);
        UI.$(row, '[data-rm]').addEventListener('click', function () {
          var parent = row.parentNode;
          if (parent.children.length > 1) parent.removeChild(row);
          else { UI.$(row, '[data-acc]').value = ''; amt.value = ''; }
          updateTotals();
        });
      };
      UI.$$(el, '.line-row').forEach(bindRow);
      UI.$$(el, '[data-addline]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var wrap = btn.parentNode.querySelector('[data-lines]');
          var tmp = document.createElement('div');
          tmp.innerHTML = lineRow(opts);
          var row = tmp.firstChild;
          wrap.appendChild(row);
          bindRow(row);
        });
      });
      updateTotals();
    }

    UI.$(el, '[data-skip]').addEventListener('click', function () { next(ctx); });

    UI.$(el, '[data-grade]').addEventListener('click', function () {
      if (graded) return;
      var res;
      if (item.type === 'journal') {
        res = G.gradeJournal(item.answer, {
          debit: readLines(UI.$(el, '[data-side="debit"]')),
          credit: readLines(UI.$(el, '[data-side="credit"]'))
        }, course.accountsByName);
        if (res.problems.length && res.debitTotal + res.creditTotal === 0) {
          UI.$(el, '[data-result]').innerHTML = '<p class="small" style="color:var(--ng)">' + res.problems.map(esc).join('<br>') + '</p>';
          return;
        }
      } else if (item.type === 'numeric') {
        res = G.gradeNumeric(item, UI.$(el, '[data-num]').value);
        if (res.value === null) { UI.$(el, '[data-result]').innerHTML = '<p class="small" style="color:var(--ng)">数値を入力してください。</p>'; return; }
      } else {
        var sel = UI.$(el, 'input[name="choice"]:checked');
        if (!sel) { UI.$(el, '[data-result]').innerHTML = '<p class="small" style="color:var(--ng)">選択肢を選んでください。</p>'; return; }
        res = G.gradeChoice(item, sel.value);
      }
      graded = true;
      var reviewResult = M.recordDrill(course, cs, item, res.correct, ctx.today);
      ctx.save();
      UI.$(el, '[data-grade]').disabled = true;
      UI.$(el, '[data-skip]').textContent = '次の問題へ';
      UI.$(el, '[data-skip]').classList.add('btn-primary');
      UI.$(el, '[data-result]').innerHTML = resultHtml(ctx, item, res, reviewResult);
    });
  }

  function resultHtml(ctx, item, res, reviewResult) {
    var course = ctx.course;
    var base = '#/c/' + course.id;
    var html = '<div class="result ' + (res.correct ? 'correct' : 'wrong') + '"><div class="result-title">' + (res.correct ? '正解' : '不正解') + '</div>';
    if (item.type === 'journal') {
      html += '<p class="small">借方合計 ' + UI.yen(res.debitTotal) + ' ・ 貸方合計 ' + UI.yen(res.creditTotal) + ' ・ ' +
        (res.balanced ? '一致しています' : '一致していません') + '</p>';
      if (!res.correct) {
        html += '<h3>正しい仕訳</h3>' + UI.journalTable(item.answer.debit, item.answer.credit);
        if (res.problems.length) html += '<ul class="small">' + res.problems.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>';
        if (res.hints.length) html += '<h3>どこが違うか</h3><ul>' + res.hints.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>';
      }
    } else if (item.type === 'numeric') {
      html += '<p>正解: <span class="num">' + esc(U.fmtNum(item.answer, item.decimals)) + '</span> ' + esc(item.unit || '') + '</p>';
    } else {
      html += '<p>正解: ' + esc(item.choices[item.answer]) + '</p>';
    }
    html += '<h3>解説</h3><p>' + UI.text(course, item.explanation) + '</p>';
    var lesson = course.lessonsById[item.lessonId];
    if (lesson) html += '<p><a href="' + base + '/lessons/' + esc(lesson.id) + '">関連する解説「' + esc(lesson.title) + '」を読む</a></p>';
    if (REVIEW_MSG[reviewResult]) html += '<p class="small muted">' + esc(REVIEW_MSG[reviewResult]) + '</p>';
    return html + '</div>';
  }

  function next(ctx) {
    session.i++;
    render(ctx);
    ctx.el.scrollIntoView({ block: 'start' });
  }
})(window);
