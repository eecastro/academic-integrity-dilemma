(function () {
  'use strict';

  var cfg = window.DILEMMA_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'dilemma-teacher-passcode';
  var data = null;   // { submissions, reasons, settings }
  var pairs = [];    // derived pair objects
  var pass = '';
  var session = '';

  var MATTER_LABEL = {};
  cfg.MATTERED.forEach(function (m) { MATTER_LABEL[m.key] = m.label; });

  // ---------- Server calls ----------

  function post(body) {
    body.passcode = pass;
    return fetch(cfg.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function load() {
    return post({ action: 'dashboard' }).then(function (res) {
      if (!res.ok) throw new Error(res.error || 'Could not load data.');
      data = res;
      pairs = buildPairs(res.submissions);
      var list = sessionList();
      if (!session || list.indexOf(session) < 0) session = res.settings.session;
      $('login').hidden = true;
      $('app').hidden = false;
      renderAll();
    });
  }

  // ---------- Scoring ----------

  function outcomeOf(a, b) {
    if (a === 'silent' && b === 'silent') return 'Both stayed silent';
    if (a === 'blame' && b === 'blame') return 'Both blamed';
    return 'Split';
  }

  // Payoff for "me" given the partner's choice, using the Settings values.
  function points(me, partner) {
    var P = data.settings.payoffs;
    if (me === 'blame') return partner === 'silent' ? P.blame_silent : P.blame_blame;
    return partner === 'silent' ? P.silent_silent : P.silent_blame;
  }

  function buildPairs(subs) {
    var groups = {};
    var order = [];
    subs.forEach(function (s) {
      var k = s.session + '|' + s.round + '|' + s.pair;
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(s);
    });
    return order.map(function (k) {
      var g = groups[k];
      var first = g[0];
      var complete = g.length === 2;
      var status = complete ? 'complete' : (g.length > 2 ? 'check' : 'waiting');
      var outcome = complete ? outcomeOf(g[0].choice, g[1].choice)
        : (g.length > 2 ? 'Check: more than 2 responses' : 'Waiting for partner');
      return {
        session: first.session,
        round: first.round,
        pair: first.pair,
        status: status,
        outcome: outcome,
        members: g.map(function (me, i) {
          var partner = complete ? g[1 - i] : null;
          return {
            code: me.code,
            choice: me.choice,
            confidence: me.confidence,
            mattered: me.mattered,
            mattered_other: me.mattered_other,
            partnerChoice: partner ? partner.choice : null,
            points: partner ? points(me.choice, partner.choice) : null
          };
        })
      };
    });
  }

  function detailRows() {
    var rows = [];
    pairs.forEach(function (p) {
      p.members.forEach(function (m) {
        rows.push({
          session: p.session, round: p.round, pair: p.pair, code: m.code,
          choice: m.choice, partnerChoice: m.partnerChoice, confidence: m.confidence,
          points: m.points, outcome: p.outcome, status: p.status
        });
      });
    });
    return rows;
  }

  // ---------- Filters ----------

  function sessionList() {
    var list = [];
    if (data && data.settings.session) list.push(data.settings.session);
    data.submissions.forEach(function (s) {
      if (list.indexOf(s.session) < 0) list.push(s.session);
    });
    return list;
  }

  function roundFilter() { return $('round-filter').value; }

  function inSession(x) { return x.session === session; }

  function inScope(x) {
    var r = roundFilter();
    return x.session === session && (r === 'all' || x.round === Number(r));
  }

  function avg(arr) {
    if (!arr.length) return '–';
    var total = arr.reduce(function (a, b) { return a + b; }, 0);
    return (total / arr.length).toFixed(1);
  }

  function pct(n, d) { return d ? Math.round(100 * n / d) + '%' : '–'; }

  function roundsInSession() {
    var seen = {};
    data.submissions.forEach(function (s) { if (inSession(s)) seen[s.round] = true; });
    var list = Object.keys(seen).map(Number).sort();
    return list.length ? list : [1, 2];
  }

  // ---------- DOM helpers ----------

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function table(headers, rows) {
    var t = el('table', null, 'table');
    var thead = el('thead');
    var hr = el('tr');
    headers.forEach(function (h) { hr.appendChild(el('th', h)); });
    thead.appendChild(hr);
    t.appendChild(thead);
    var tb = el('tbody');
    if (!rows.length) {
      var empty = el('tr');
      var td = el('td', 'No data yet.');
      td.colSpan = headers.length;
      td.className = 'muted';
      empty.appendChild(td);
      tb.appendChild(empty);
    }
    rows.forEach(function (r) {
      var tr = el('tr');
      r.forEach(function (c) {
        var td = el('td');
        if (c instanceof Node) td.appendChild(c);
        else td.textContent = (c == null || c === '') ? '–' : String(c);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  function bar(p) {
    var wrap = el('div', null, 'bar');
    var fill = el('span');
    fill.style.width = (p || 0) + '%';
    wrap.appendChild(fill);
    return wrap;
  }

  function setPanel(id, node) {
    var c = $(id);
    c.innerHTML = '';
    c.appendChild(node);
  }

  function stat(label, value) {
    var box = el('div', null, 'stat');
    box.appendChild(el('div', String(value), 'stat-value'));
    box.appendChild(el('div', label, 'stat-label'));
    return box;
  }

  // ---------- Renderers ----------

  function renderAll() {
    renderSessionSelect();
    renderOverview();
    renderByRound();
    renderOutcomes();
    renderMattered();
    renderTrend();
    renderCredit();
    renderDetail();
    renderReasons();
    renderSettings();
  }

  function renderSessionSelect() {
    var sel = $('session-filter');
    sel.innerHTML = '';
    sessionList().forEach(function (s) {
      var o = el('option', s + (s === data.settings.session ? ' (current)' : ''));
      o.value = s;
      sel.appendChild(o);
    });
    sel.value = session;
  }

  function renderOverview() {
    var subs = data.submissions.filter(inScope);
    var scopePairs = pairs.filter(function (p) {
      var r = roundFilter();
      return p.session === session && (r === 'all' || p.round === Number(r));
    });
    var complete = scopePairs.filter(function (p) { return p.status === 'complete'; }).length;
    var box = $('overview');
    box.innerHTML = '';
    box.appendChild(stat('Responses', subs.length));
    box.appendChild(stat('Complete pairs', complete));
    box.appendChild(stat('Waiting for partner', scopePairs.length - complete));
    box.appendChild(stat('Current round', data.settings.session === session
      ? 'Round ' + data.settings.round : '–'));
    box.appendChild(stat('Responses open', data.settings.session === session
      ? (data.settings.accepting ? 'Yes' : 'No') : '–'));
  }

  function roundStats(r) {
    var subs = data.submissions.filter(function (s) { return inSession(s) && s.round === r; });
    var silent = subs.filter(function (s) { return s.choice === 'silent'; });
    var blame = subs.filter(function (s) { return s.choice === 'blame'; });
    var pp = pairs.filter(function (p) { return p.session === session && p.round === r; });
    var done = pp.filter(function (p) { return p.status === 'complete'; });
    var count = function (o) { return done.filter(function (p) { return p.outcome === o; }).length; };
    return {
      n: subs.length,
      silent: silent.length,
      blame: blame.length,
      confSilent: avg(silent.map(function (s) { return s.confidence; })),
      confBlame: avg(blame.map(function (s) { return s.confidence; })),
      pairs: pp.length,
      complete: done.length,
      bothSilent: count('Both stayed silent'),
      split: count('Split'),
      bothBlamed: count('Both blamed'),
      waiting: pp.length - done.length
    };
  }

  function renderByRound() {
    var rows = roundsInSession().map(function (r) {
      var s = roundStats(r);
      var blameCell = el('span', pct(s.blame, s.n) + ' ');
      var wrap = el('div');
      wrap.appendChild(blameCell);
      wrap.appendChild(bar(s.n ? Math.round(100 * s.blame / s.n) : 0));
      return [
        'Round ' + r, s.n, pct(s.silent, s.n), wrap,
        s.confSilent, s.confBlame
      ];
    });
    setPanel('by-round', table(
      ['Round', 'Responses', 'Stayed silent', 'Blamed partner',
        'Avg confidence partner stays silent (if you stayed silent)',
        'Avg confidence partner stays silent (if you blamed)'],
      rows));
  }

  function renderOutcomes() {
    var rows = roundsInSession().map(function (r) {
      var s = roundStats(r);
      return [
        'Round ' + r, s.complete, s.bothSilent + ' (' + pct(s.bothSilent, s.complete) + ')',
        s.split + ' (' + pct(s.split, s.complete) + ')',
        s.bothBlamed + ' (' + pct(s.bothBlamed, s.complete) + ')', s.waiting
      ];
    });
    setPanel('outcomes', table(
      ['Round', 'Complete pairs', 'Both stayed silent', 'Split', 'Both blamed', 'Waiting for partner'],
      rows));
  }

  function renderMattered() {
    var scoped = data.submissions.filter(inScope);
    var r1 = roundFilter();
    var rows = cfg.MATTERED.map(function (m) {
      var n = scoped.filter(function (s) { return s.mattered === m.key; }).length;
      var silent = scoped.filter(function (s) { return s.mattered === m.key && s.choice === 'silent'; }).length;
      return [m.label, n, pct(silent, n) === '–' ? '–' : silent + ' stayed silent, ' + (n - silent) + ' blamed', pct(n, scoped.length)];
    });
    setPanel('mattered', table(['What mattered most', 'Responses', 'By choice', 'Share'], rows));

    var others = scoped.filter(function (s) { return s.mattered === 'other' && s.mattered_other; });
    var list = $('other-list');
    list.innerHTML = '';
    if (!others.length) list.appendChild(el('li', 'None yet.', 'muted'));
    others.forEach(function (s) {
      list.appendChild(el('li', '"' + s.mattered_other + '" (Round ' + s.round + ')'));
    });
    if (r1 === 'all') { /* both rounds shown */ }
  }

  function renderTrend() {
    var list = [];
    data.submissions.forEach(function (s) { if (list.indexOf(s.session) < 0) list.push(s.session); });
    if (data.settings.session && list.indexOf(data.settings.session) < 0) list.push(data.settings.session);
    var rows = list.map(function (sess) {
      var cells = [sess];
      [1, 2].forEach(function (r) {
        var subs = data.submissions.filter(function (s) { return s.session === sess && s.round === r; });
        var blame = subs.filter(function (s) { return s.choice === 'blame'; }).length;
        cells.push(subs.length);
        cells.push(pct(blame, subs.length));
      });
      return cells;
    });
    setPanel('trend', table(['Session', 'Round 1 responses', 'Round 1 blame rate', 'Round 2 responses', 'Round 2 blame rate'], rows));
  }

  function creditRows() {
    var map = {};
    pairs.forEach(function (p) {
      if (p.session !== session) return;
      p.members.forEach(function (m) {
        var k = m.code.toLowerCase();
        if (!map[k]) map[k] = { code: m.code, pairs: [], rounds: {}, pending: false };
        var c = map[k];
        var label = 'R' + p.round + ': pair ' + p.pair;
        if (c.pairs.indexOf(label) < 0) c.pairs.push(label);
        if (p.status !== 'complete') c.pending = true;
        else c.rounds[p.round] = m.points;
      });
    });
    var cap = data.settings.cap;
    return Object.keys(map).sort().map(function (k) {
      var c = map[k];
      var total = 0;
      Object.keys(c.rounds).forEach(function (r) { total += c.rounds[r]; });
      var capped = Math.min(total, cap);
      var cells = [c.code, c.pairs.join(', ')];
      roundsInSession().slice(0, 2).forEach(function (r) {
        cells.push(c.rounds[r] != null ? c.rounds[r] : (c.pending ? 'pending' : '–'));
      });
      cells.push(c.pending ? 'pending' : capped + (total > cap ? ' (capped from ' + total + ')' : ''));
      return cells;
    });
  }

  function renderCredit() {
    var rounds = roundsInSession().slice(0, 2);
    var headers = ['Code', 'Pairs'].concat(rounds.map(function (r) { return 'Round ' + r + ' points'; }))
      .concat(['Total (capped)']);
    setPanel('credit', table(headers, creditRows()));
  }

  function renderDetail() {
    var rows = detailRows().filter(inScope).sort(function (a, b) {
      return a.round - b.round || a.pair - b.pair;
    }).map(function (d) {
      return [
        'Round ' + d.round, d.pair, d.code,
        d.choice === 'silent' ? 'Stayed silent' : 'Blamed partner',
        d.partnerChoice == null ? '–' : (d.partnerChoice === 'silent' ? 'Stayed silent' : 'Blamed partner'),
        d.confidence, d.points, d.outcome
      ];
    });
    setPanel('detail', table(
      ['Round', 'Pair', 'Code', 'Your choice', 'Partner choice', 'Confidence', 'Points', 'Outcome'], rows));
  }

  function renderReasons() {
    var box = $('reasons');
    box.innerHTML = '';
    var list = data.reasons.filter(function (x) {
      var r = roundFilter();
      return x.session === session && (r === 'all' || x.round === Number(r));
    });
    [['silent', 'Stayed silent'], ['blame', 'Blamed partner']].forEach(function (pair) {
      box.appendChild(el('h3', pair[1]));
      var items = list.filter(function (x) { return x.choice === pair[0]; });
      if (!items.length) { box.appendChild(el('p', 'None yet.', 'muted')); return; }
      items.forEach(function (x) {
        var q = el('blockquote');
        q.appendChild(el('div', x.reasoning));
        q.appendChild(el('small', 'Round ' + x.round, 'muted'));
        box.appendChild(q);
      });
    });
  }

  function renderSettings() {
    var s = data.settings;
    $('set-round').value = String(s.round);
    $('set-accepting').checked = !!s.accepting;
    $('set-session').value = s.session;
    $('del-round').value = String(s.round);
  }

  // ---------- Actions ----------

  function exportCsv() {
    var head = ['Session', 'Round', 'Pair', 'Code', 'Your choice', 'Partner choice', 'Confidence', 'Points', 'Outcome'];
    var lines = [head.join(',')];
    detailRows().filter(inScope).forEach(function (d) {
      var cells = [d.session, d.round, d.pair, d.code, d.choice, d.partnerChoice || '', d.confidence,
        d.points == null ? '' : d.points, d.outcome];
      lines.push(cells.map(function (c) {
        var s = String(c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(','));
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    var a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dilemma-' + session.replace(/\s+/g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function saveSettings(ev) {
    ev.preventDefault();
    var msg = $('settings-msg');
    msg.textContent = 'Saving…';
    post({
      action: 'set_settings',
      round: $('set-round').value,
      session: $('set-session').value.trim(),
      accepting: $('set-accepting').checked
    }).then(function (res) {
      if (!res.ok) throw new Error(res.error);
      msg.textContent = 'Saved.';
      session = '';
      return load();
    }).catch(function (err) { msg.textContent = err.message; });
  }

  function deleteRound() {
    var round = $('del-round').value;
    var sess = session;
    if (!window.confirm('Delete all responses for "' + sess + '", Round ' + round + '? This cannot be undone.')) return;
    var msg = $('settings-msg');
    msg.textContent = 'Deleting…';
    post({ action: 'delete_round', session: sess, round: Number(round) }).then(function (res) {
      if (!res.ok) throw new Error(res.error);
      msg.textContent = 'Deleted ' + res.removed + ' rows.';
      return load();
    }).catch(function (err) { msg.textContent = err.message; });
  }

  // ---------- Wiring ----------

  $('login-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    pass = $('passcode').value;
    $('login-error').textContent = '';
    $('login-btn').disabled = true;
    load().then(function () {
      try { sessionStorage.setItem(KEY, pass); } catch (e) { /* ignore */ }
    }).catch(function (err) {
      pass = '';
      $('login-error').textContent = err.message;
    }).then(function () { $('login-btn').disabled = false; });
  });

  $('session-filter').addEventListener('change', function () {
    session = $('session-filter').value;
    renderAll();
  });
  $('round-filter').addEventListener('change', renderAll);
  $('refresh').addEventListener('click', function () { load(); });
  $('export').addEventListener('click', exportCsv);
  $('settings-form').addEventListener('submit', saveSettings);
  $('delete-round').addEventListener('click', deleteRound);

  // Restore the passcode for this browser tab only.
  try {
    var saved = sessionStorage.getItem(KEY);
    if (saved) {
      pass = saved;
      load().catch(function () { pass = ''; sessionStorage.removeItem(KEY); });
    }
  } catch (e) { /* private window: ignore */ }
})();
