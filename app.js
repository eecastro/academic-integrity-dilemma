(function () {
  'use strict';

  var cfg = window.DILEMMA_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var state = null;

  var ADJECTIVES = ['maple', 'river', 'copper', 'quiet', 'bright', 'swift', 'amber', 'cedar', 'harbor', 'meadow', 'silver', 'olive'];
  var NOUNS = ['fox', 'falcon', 'otter', 'lantern', 'comet', 'pine', 'tiger', 'kestrel', 'willow', 'summit'];

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function storageKey(s) { return 'dilemma-submitted-' + s.session + '-' + s.round; }

  function wasSubmitted(s) {
    try { return localStorage.getItem(storageKey(s)) === '1'; } catch (e) { return false; }
  }

  function markSubmitted(s) {
    try { localStorage.setItem(storageKey(s), '1'); } catch (e) { /* private window: ignore */ }
  }

  function setStatus(msg) {
    var s = $('status');
    s.textContent = msg || '';
    s.hidden = !msg;
  }

  function showError(msg) { $('error').textContent = msg || ''; }

  function labelled(parent, type, name, value, text) {
    var label = document.createElement('label');
    label.className = 'opt';
    var input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.value = value;
    input.required = false;
    var span = document.createElement('span');
    span.textContent = text;
    label.appendChild(input);
    label.appendChild(span);
    parent.appendChild(label);
    return input;
  }

  function loadStatus() {
    if (!cfg.APPS_SCRIPT_URL || cfg.APPS_SCRIPT_URL.indexOf('PASTE') === 0) {
      setStatus('This page is not connected to the class spreadsheet yet. Your teacher needs to add the Apps Script URL to config.js.');
      return;
    }
    fetch(cfg.APPS_SCRIPT_URL + '?action=status', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || 'Server error.');
        state = data;
        render();
      })
      .catch(function (err) {
        setStatus('Could not reach the server. Check your connection and reload the page. (' + err.message + ')');
      });
  }

  function render() {
    setStatus('');
    $('scenario').textContent = cfg.SCENARIO;
    $('round-note').textContent = cfg.ROUND_NOTES[state.round] || ('Round ' + state.round);
    $('scenario-card').hidden = false;

    if (cfg.SHOW_POINTS !== false) renderPoints();

    if (!state.accepting) {
      setStatus('Responses are closed right now. Ask your teacher.');
      return;
    }
    if (wasSubmitted(state)) {
      showDone(null, 'You already submitted for this round on this device. If that is a mistake, ask your teacher before trying again.');
      return;
    }
    buildForm();
    $('form').hidden = false;
  }

  function renderPoints() {
    var P = state.payoffs;
    var table = $('payoff-table');
    table.innerHTML = '';
    var head = document.createElement('tr');
    ['Outcome', 'Your points'].forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h;
      head.appendChild(th);
    });
    table.appendChild(head);
    [
      ['You blame, partner stays silent', P.blame_silent],
      ['Both stay silent', P.silent_silent],
      ['Both blame', P.blame_blame],
      ['You stay silent, partner blames', P.silent_blame]
    ].forEach(function (row) {
      var tr = document.createElement('tr');
      var a = document.createElement('td');
      a.textContent = row[0];
      var b = document.createElement('td');
      b.textContent = row[1];
      tr.appendChild(a);
      tr.appendChild(b);
      table.appendChild(tr);
    });
    $('cap-note').textContent = 'Each round is scored separately. Your total across both rounds is capped at ' + state.cap + ' points.';
    $('payoff-card').hidden = false;
  }

  function buildForm() {
    var pair = $('pair');
    pair.innerHTML = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose your pair number';
    pair.appendChild(placeholder);
    for (var p = 1; p <= cfg.PAIR_COUNT; p++) {
      var opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = String(p);
      pair.appendChild(opt);
    }

    var choices = $('choices');
    choices.innerHTML = '';
    cfg.CHOICES.forEach(function (c) {
      var input = labelled(choices, 'radio', 'choice', c.key, c.label + ': ' + c.detail);
      input.required = true;
    });

    var conf = $('confidence');
    conf.innerHTML = '';
    for (var k = 1; k <= 5; k++) {
      labelled(conf, 'radio', 'confidence', String(k), String(k));
    }

    var mattered = $('mattered');
    mattered.innerHTML = '';
    cfg.MATTERED.forEach(function (m) {
      labelled(mattered, 'radio', 'mattered', m.key, m.label);
    });
    mattered.addEventListener('change', function () {
      var chosen = document.querySelector('input[name="mattered"]:checked');
      var other = $('mattered-other');
      other.hidden = !(chosen && chosen.value === 'other');
      if (other.hidden) other.value = '';
    });

    $('code').value = '';
    $('suggest').onclick = function () {
      $('code').value = pick(ADJECTIVES) + '-' + pick(NOUNS) + '-' + (10 + Math.floor(Math.random() * 90));
    };
  }

  function checked(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function collect() {
    return {
      pair: $('pair').value,
      code: $('code').value.trim(),
      choice: checked('choice'),
      confidence: checked('confidence'),
      mattered: checked('mattered'),
      mattered_other: $('mattered-other').value.trim(),
      reasoning: $('reasoning').value.trim()
    };
  }

  function validate(d) {
    if (!d.pair) return 'Choose your pair number.';
    if (!/^[A-Za-z0-9-]{4,30}$/.test(d.code)) return 'Your code must be 4 to 30 letters, numbers, or dashes.';
    if (!d.choice) return 'Choose what you tell the teacher.';
    if (!d.confidence) return 'Choose a confidence from 1 to 5.';
    if (!d.reasoning) return 'Please explain your reasoning.';
    if (!d.mattered) return 'Choose what mattered most.';
    if (d.mattered === 'other' && !d.mattered_other) return 'Please describe what "Other" means.';
    return '';
  }

  function showDone(code, text) {
    $('form').hidden = true;
    $('done').hidden = false;
    var msg = $('done-text');
    msg.textContent = '';
    if (code) {
      msg.appendChild(document.createTextNode('Saved. Your code is '));
      var strong = document.createElement('strong');
      strong.textContent = code;
      msg.appendChild(strong);
      msg.appendChild(document.createTextNode('. Write it down. In Round 2, use the same code so your points can be added together.'));
    } else {
      msg.textContent = text;
    }
  }

  $('mattered-other').hidden = true;

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    showError('');
    var data = collect();
    var problem = validate(data);
    if (problem) {
      showError(problem);
      return;
    }

    var btn = $('submit');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    fetch(cfg.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: 'submit' }, data))
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Could not save.');
        markSubmitted(state);
        showDone(res.code, '');
      })
      .catch(function (err) {
        showError((err.message || 'Could not save.') +
          ' If this keeps happening, ask your teacher before trying again, because your response may already have saved.');
        btn.disabled = false;
        btn.textContent = 'Submit';
      });
  });

  loadStatus();
})();
