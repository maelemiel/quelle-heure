/* Maison du Temps(tm) - client logic.
 * Purchases, vault ledger, and the real casino games:
 * 24-card deck (hour), slot machine (minutes), croupier's dice (seconds),
 * fortune wheel (loot), city roulette (overlay). Vanilla JS, no build. */
(function () {
  'use strict';

  var CFG = window.TRN_CONFIG || { prices: {}, paymentLinks: {} };
  var PRICES = CFG.prices || {};
  var LINKS = CFG.paymentLinks || {};
  var STORE_KEY = 'trn_state_v1';

  var ITEMS = {
    hour:      { label: 'The Deck of 24' },
    minutes:   { label: 'The Slot Machine' },
    seconds:   { label: "The Croupier's Dice" },
    pack:      { label: 'The Complete Hand' },
    city:      { label: 'The City Roulette' },
    refresh:   { label: 'The Time Refresh' },
    unlimited: { label: 'Unlimited Time (subscription)' },
    roulette:  { label: 'The Wheel of Fortune' }
  };

  var JOKES = {
    hour:    'Card drawn. Whatever you picked, it was your hour. The house is generous like that.',
    minutes: 'Reels settled. They did not decide your minutes. They merely presented them. Beautifully.',
    seconds: 'Dice rolled. Fresh seconds, as promised. The croupier bows.',
    pack:    'The Complete Hand, dealt. Hour, minutes, seconds: you know everything that is for sale.',
    refresh: 'Time updated. The previous hand keeps sentimental value.',
    unlimited: 'Subscription active. The time now flows. Allegedly. Refreshes are included.'
  };

  var FALLBACK_ZONES = [
    'Europe/Paris','Europe/London','Europe/Lisbon','Europe/Madrid','Europe/Berlin','Europe/Rome',
    'Europe/Amsterdam','Europe/Brussels','Europe/Vienna','Europe/Prague','Europe/Warsaw','Europe/Stockholm',
    'Europe/Oslo','Europe/Copenhagen','Europe/Helsinki','Europe/Tallinn','Europe/Riga','Europe/Vilnius',
    'Europe/Kyiv','Europe/Bucharest','Europe/Athens','Europe/Istanbul','Europe/Moscow','Atlantic/Reykjavik',
    'Africa/Casablanca','Africa/Lagos','Africa/Cairo','Africa/Nairobi','Africa/Johannesburg','Asia/Jerusalem',
    'Asia/Dubai','Asia/Karachi','Asia/Kolkata','Asia/Kathmandu','Asia/Dhaka','Asia/Bangkok','Asia/Shanghai',
    'Asia/Hong_Kong','Asia/Taipei','Asia/Singapore','Asia/Seoul','Asia/Tokyo','Australia/Perth','Australia/Sydney',
    'Pacific/Auckland','Pacific/Fiji','America/Sao_Paulo','America/Argentina/Buenos_Aires','America/Bogota',
    'America/Lima','America/Mexico_City','America/Chicago','America/New_York','America/Toronto',
    'America/Vancouver','America/Los_Angeles','America/Anchorage','Pacific/Honolulu'
  ];

  var ZONES;
  try {
    ZONES = (typeof Intl.supportedValuesOf === 'function') ? Intl.supportedValuesOf('timeZone') : FALLBACK_ZONES;
  } catch (e) { ZONES = FALLBACK_ZONES; }
  ZONES = ZONES.filter(function (z) { return z.indexOf('Etc/') !== 0 && z !== 'UTC'; });

  function tzLabel(tz) {
    var parts = tz.split('/');
    var city = parts[parts.length - 1].replace(/_/g, ' ');
    var region = parts.length >= 3 ? parts[1].replace(/_/g, ' ') : parts[0];
    return { tz: tz, city: city, region: region, label: city + ', ' + region };
  }

  var dtfCache = {};
  function partsIn(tz, date) {
    var f = dtfCache[tz];
    if (!f) {
      f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
      dtfCache[tz] = f;
    }
    var o = {};
    f.formatToParts(date).forEach(function (p) { if (p.type !== 'literal') o[p.type] = p.value; });
    return { h: o.hour || '--', m: o.minute || '--', s: o.second || '--' };
  }

  /* ---------- State (localStorage) ---------- */

  function blank() { return { owned: {}, drawn: {}, instant: null, tz: null, prefTz: null, daily: null }; }
  var state = blank();
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) state = Object.assign(blank(), JSON.parse(raw));
  } catch (e) { /* storage unavailable: volatile session */ }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- Small helpers ---------- */

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function priceOf(k) { return PRICES[k] || '1.00'; }
  function fmtPrice(k) { return '€' + priceOf(k); }
  function randomZone() { return ZONES[Math.floor(Math.random() * ZONES.length)]; }
  var osReduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function motionOff() {
    if (osReduceMotion) return true;
    try { return localStorage.getItem('trn_noanim') === '1'; } catch (e) { return false; }
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 4500);
  }

  /* ---------- Game components (vanilla, keyboard-usable, reduced-motion safe) ---------- */

  /* Wheel: conic rotor + rotated labels + pointer at top. spinTo(index) lands it under the pointer. */
  function makeWheel(container, labels) {
    var n = labels.length;
    var seg = 360 / n;
    var rotor = el('div', 'wheel-rotor');
    var stops = [];
    for (var i = 0; i < n; i++) {
      stops.push((i % 2 ? '#8C2F26' : '#41110C') + ' ' + (i * seg) + 'deg ' + ((i + 1) * seg) + 'deg');
    }
    rotor.style.background = 'conic-gradient(' + stops.join(',') + ')';
    labels.forEach(function (lb, i) {
      var s = el('span', 'wlabel', lb);
      var angle = i * seg + seg / 2;
      s.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg) translateY(-' + (17) + 'vw)';
      s.style.left = '50%';
      s.style.top = '50%';
      rotor.appendChild(s);
    });
    container.appendChild(rotor);
    var angle = 0;
    return {
      spinTo: function (index, done) {
        var target = -(index * seg + seg / 2);
        var delta = (target - (angle % 360) + 360) % 360;
        angle += 5 * 360 + delta;
        rotor.style.transform = 'rotate(' + angle + 'deg)';
        setTimeout(done || function () {}, motionOff() ? 50 : 4600);
      }
    };
  }

  /* Slot machine: n reels, each cycling glyphs then settling. */
  function makeSlot(container, reels) {
    var els = [];
    for (var i = 0; i < reels; i++) {
      var r = el('div', 'reel', '?');
      container.appendChild(r);
      els.push(r);
    }
    return {
      run: function (finals, glyphs, done) {
        if (motionOff()) {
          els.forEach(function (r, i) { r.textContent = finals[i]; });
          if (done) done();
          return;
        }
        els.forEach(function (r) { r.classList.remove('settled'); });
        var stopped = 0;
        els.forEach(function (r, i) {
          var iv = setInterval(function () {
            r.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
          }, 70);
          setTimeout(function () {
            clearInterval(iv);
            r.textContent = finals[i];
            r.classList.add('settled');
            stopped++;
            if (stopped === els.length && done) done();
          }, 900 + i * 550);
        });
      }
    };
  }

  /* Croupier's dice: tens die (0-5) + units die (0-9). */
  function makeDice(container) {
    var d1 = el('div', 'die', '-');
    var d2 = el('div', 'die', '-');
    container.appendChild(d1);
    container.appendChild(d2);
    return {
      roll: function (tens, units, done) {
        if (motionOff()) {
          d1.textContent = tens;
          d2.textContent = units;
          if (done) done();
          return;
        }
        d1.classList.add('rolling');
        d2.classList.add('rolling');
        var iv = setInterval(function () {
          d1.textContent = Math.floor(Math.random() * 6);
          d2.textContent = Math.floor(Math.random() * 10);
        }, 80);
        setTimeout(function () {
          clearInterval(iv);
          d1.classList.remove('rolling');
          d2.classList.remove('rolling');
          d1.textContent = tens;
          d2.textContent = units;
          if (done) setTimeout(done, 450);
        }, 1400);
      }
    };
  }

  /* Deck of 24: fan of face-down cards, any pick reveals the hour. */
  function makeCardFan(container, hour, onDraw) {
    var fan = el('div', 'fan');
    var announced = false;
    for (var i = 0; i < 24; i++) {
      (function (idx) {
        var c = el('button', 'card');
        c.type = 'button';
        c.setAttribute('aria-label', 'Card ' + (idx + 1) + ' of 24, face down');
        var face = el('span', 'face', hour);
        c.appendChild(face);
        c.addEventListener('click', function () {
          if (c.classList.contains('flipped')) return;
          $$('.card', fan).forEach(function (o) {
            if (o !== c) { o.classList.add('dim'); o.disabled = true; }
          });
          c.classList.add('flipped');
          c.disabled = true;
          if (!announced) {
            announced = true;
            if (!motionOff()) setTimeout(onDraw, 600); else onDraw();
          }
        });
        fan.appendChild(c);
      })(i);
    }
    container.appendChild(fan);
  }

  /* ---------- Daily gamble (free: no stake, expires at midnight) ---------- */

  var DAILY_COVERS = { hour: ['hour'], hm: ['hour', 'minutes'], pack: ['hour', 'minutes', 'seconds'] };
  var DAILY_TOKENS = { hour: 'H', hm: 'H+M', pack: 'H+M+S' };
  var DAILY_JOKES = {
    hour:  'Daily win: the hour, free, until midnight. Spend it wisely.',
    hm:    'Daily win: hour and minutes until midnight. Respectable precision.',
    pack:  'Daily win: the COMPLETE HAND until midnight. Tonight, you are horological aristocracy.',
    none:  'The reels say: nothing. The time remains €1.00. See you tomorrow, player.',
    used:  'One free pull per day. Time is limited; your appetite for it is not.'
  };

  function todayStr() { return new Date().toDateString(); }
  function dailyActive() { return !!(state.daily && state.daily.d === todayStr() && state.daily.prize); }
  function effectiveOwned(key) {
    if (state.owned[key]) return true;
    if (!dailyActive()) return false;
    var covers = DAILY_COVERS[state.daily.prize];
    return !!covers && covers.indexOf(key) >= 0;
  }

  function weightedPrize() {
    var r = Math.random();
    if (r < 0.50) return null;
    if (r < 0.75) return 'hour';
    if (r < 0.90) return 'hm';
    return 'pack';
  }

  var dailySlot = null;

  function renderDailyStatus() {
    var status = $('#daily-status');
    if (!status) return;
    if (state.daily && state.daily.d === todayStr()) {
      status.textContent = state.daily.prize
        ? 'Won today: ' + DAILY_TOKENS[state.daily.prize] + ', free until midnight. Next pull tomorrow.'
        : 'Free pull used today. It was nothing. Next pull tomorrow, midnight sharp.';
    } else {
      status.textContent = 'published odds, because we are honest people: 50% nothing · 25% the hour · 15% hour + minutes · 10% the complete hand. winnings expire at midnight, like everything.';
    }
  }

  function initDaily() {
    var stage = $('#daily-reels');
    if (!stage) return;
    dailySlot = makeSlot(stage, 3);
    if (state.daily && state.daily.d === todayStr() && state.daily.prize) {
      var t = DAILY_TOKENS[state.daily.prize];
      var g = t.indexOf('S') >= 0 ? ['H', 'M', 'S'] : (t.indexOf('M') >= 0 ? ['H', 'M', 'M'] : ['H', 'H', 'H']);
      $$('.reel', stage).forEach(function (r, i) { r.textContent = g[i]; });
    }
    var btn = $('#daily-spin');
    if (btn) btn.addEventListener('click', spinDaily);
  }

  function spinDaily() {
    if (state.daily && state.daily.d === todayStr()) { toast(DAILY_JOKES.used); return; }
    var prize = weightedPrize();
    var glyphs = ['?', 'H', 'M', 'S', '∅'];
    var finalGlyph = prize === 'pack' ? 'S' : (prize === 'hm' ? 'M' : (prize ? 'H' : '∅'));

    function settle() {
      state.daily = { d: todayStr(), prize: prize };
      if (prize) {
        if (!state.instant) {
          state.instant = new Date().toISOString();
          if (state.owned.city && state.prefTz) state.tz = state.prefTz;
          else state.tz = randomZone();
        }
        save();
        render();
        toast(DAILY_JOKES[prize]);
      } else {
        save();
        render();
        toast(DAILY_JOKES.none);
      }
      renderDailyStatus();
    }

    dailySlot.run([finalGlyph, finalGlyph, finalGlyph], glyphs, settle);
  }

  /* ---------- Vault (your table) ---------- */

  var GAME_META = {
    hour:    { action: 'DRAW A CARD',    aria: 'Draw one of the 24 cards to reveal your hour' },
    minutes: { action: 'PULL THE LEVER', aria: 'Pull the lever to reveal your minutes' },
    seconds: { action: 'ROLL THE DICE',  aria: 'Roll the dice to reveal your seconds' }
  };

  function runGame(key) {
    var stage = $('#game-stage');
    if (!stage) return;
    stage.textContent = '';
    var tp = partsIn(state.tz, new Date(state.instant));

    if (key === 'hour') {
      makeCardFan(stage, tp.h, function () {
        state.drawn.hour = true;
        save();
        render();
        toast(JOKES.hour);
      });
    } else if (key === 'minutes') {
      var slot = makeSlot(stage, 2);
      slot.run([tp.m.charAt(0), tp.m.charAt(1)], ['0','1','2','3','4','5','6','7','8','9'], function () {
        setTimeout(function () {
          state.drawn.minutes = true;
          save();
          render();
          toast(JOKES.minutes);
        }, 700);
      });
    } else if (key === 'seconds') {
      var dice = makeDice(stage);
      var tens = parseInt(tp.s.charAt(0), 10) || 0;
      var units = parseInt(tp.s.charAt(1), 10) || 0;
      dice.roll(tens, units, function () {
        state.drawn.seconds = true;
        save();
        render();
        toast(JOKES.seconds);
      });
    }
  }

  function render() {
    var box = $('#coffre-body');
    if (!box) return;
    box.textContent = '';
    var anyTime = !!(effectiveOwned('hour') || effectiveOwned('minutes') || effectiveOwned('seconds'));

    if (!anyTime) {
      box.appendChild(el('p', 'biglock', '🎴'));
      box.appendChild(el('p', 'coffre-empty', "Take a seat: it's time to pay to know what time it is."));
      if (state.owned.city) {
        box.appendChild(el('p', 'fine', 'The City Roulette is already yours. Only the time itself is missing.'));
        buildCityChooser(box);
      } else {
        box.appendChild(el('p', 'fine', 'No time has been bought at this table. Yours is waiting, face down.'));
      }
      if (state.owned.unlimited) {
        box.appendChild(el('p', 'fine', 'Unlimited player detected. The time itself is still sold separately.'));
      }
      var p = el('p'); p.style.marginTop = '1.2rem';
      var cta = el('a', 'chip chip-s', 'SEE THE TABLES');
      cta.href = '#tables';
      p.appendChild(cta);
      box.appendChild(p);
      return;
    }

    var d = new Date(state.instant);
    var tp = partsIn(state.tz, d);
    var lab = tzLabel(state.tz);

    box.appendChild(el('p', 'coffre-meta',
      'Certified instant of purchase: ' +
      d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-GB') + '. Non-modifiable (that is the point).'));

    var chosen = !!(state.owned.city && state.prefTz && state.prefTz === state.tz);
    box.appendChild(el('p', 'coffre-city',
      (chosen ? 'Your city: ' : 'The wheel chose: ') + '📍 ' + lab.label +
      (state.owned.unlimited ? ' · ∞ Unlimited player' : '')));

    var gamePending = ['hour', 'minutes', 'seconds'].some(function (k) { return effectiveOwned(k) && !state.drawn[k]; });
    if (gamePending) {
      var stage = el('div', 'game-stage');
      stage.id = 'game-stage';
      stage.appendChild(el('p', 'fine', 'Your game is waiting. The ceremony matters.'));
      box.appendChild(stage);
    }

    var disp = el('div', 'time-display');
    var segs = [['hour', 'hours', tp.h], ['minutes', 'minutes', tp.m], ['seconds', 'seconds', tp.s]];
    segs.forEach(function (sg) {
      var key = sg[0], unit = sg[1], val = sg[2];
      if (effectiveOwned(key) && state.drawn[key]) {
        var seg = el('div', 'seg');
        seg.appendChild(el('span', 'digits', val));
        seg.appendChild(el('span', 'unit', unit));
        disp.appendChild(seg);
      } else if (effectiveOwned(key)) {
        var gb = el('button', 'chip chip-s', GAME_META[key].action);
        gb.type = 'button';
        gb.setAttribute('data-game', key);
        gb.setAttribute('aria-label', GAME_META[key].aria);
        var w = el('div', 'seg');
        w.appendChild(gb);
        w.appendChild(el('span', 'unit', 'your ' + unit));
        disp.appendChild(w);
      } else {
        var btn = el('button', 'seg seg-btn');
        btn.type = 'button';
        btn.setAttribute('data-buy', key);
        btn.setAttribute('aria-label', 'Unlock ' + ITEMS[key].label.toLowerCase() + ' for ' + fmtPrice(key));
        btn.appendChild(el('span', 'digits', '▓▓'));
        btn.appendChild(el('span', 'unit', unit));
        btn.appendChild(el('span', 'lock', '🔒 ' + fmtPrice(key)));
        disp.appendChild(btn);
      }
    });
    box.appendChild(disp);
    box.appendChild(el('p', 'fine', 'Time frozen at the instant of purchase. Time itself moved on without you.'));
    var dailyBoost = ['hour', 'minutes', 'seconds'].some(function (k) { return effectiveOwned(k) && !state.owned[k]; });
    if (dailyBoost) {
      box.appendChild(el('p', 'fine', 'Includes daily winnings. They expire at midnight, like everything else.'));
    }

    if (state.owned.hour && state.owned.minutes && state.owned.seconds) {
      var pr = el('p'); pr.style.marginTop = '1rem';
      var up = el('button', 'chip chip-s',
        state.owned.unlimited ? 'REFRESH (INCLUDED)' : 'REFRESH THE TIME (' + fmtPrice('refresh') + ')');
      up.type = 'button';
      up.setAttribute('data-buy', 'refresh');
      pr.appendChild(up);
      box.appendChild(pr);
    }

    if (state.owned.city) {
      buildCityChooser(box);
    } else {
      var pc = el('p'); pc.style.marginTop = '1.2rem';
      var bc = el('button', 'chip chip-s', 'THE CITY ROULETTE (' + fmtPrice('city') + ')');
      bc.type = 'button';
      bc.setAttribute('data-buy', 'city');
      pc.appendChild(bc);
      box.appendChild(pc);
      box.appendChild(el('p', 'fine', 'Or let the great wheel decide. It always does.'));
    }
  }

  /* ---------- City chooser (autocomplete) ---------- */

  function buildCityChooser(host) {
    var wrap = el('div', 'ac');
    var inputId = 'city-input';
    var lab = el('label', 'ac-label', 'Your city (timezone)');
    lab.setAttribute('for', inputId);

    var input = el('input', 'ac-input');
    input.id = inputId;
    input.type = 'text';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', 'city-ac');
    input.setAttribute('aria-autocomplete', 'list');
    input.placeholder = 'Type a city: Paris, Tokyo, Buenos Aires…';
    if (state.prefTz) input.value = tzLabel(state.prefTz).label;

    var list = el('ul', 'ac-list');
    list.id = 'city-ac';
    list.setAttribute('role', 'listbox');
    list.hidden = true;

    var idx = -1;
    var matches = [];

    function hide() {
      list.hidden = true;
      idx = -1;
      input.setAttribute('aria-expanded', 'false');
    }

    function show() {
      var q = input.value.trim().toLowerCase();
      matches = [];
      if (q) {
        for (var i = 0; i < ZONES.length && matches.length < 8; i++) {
          var l = tzLabel(ZONES[i]);
          if (l.label.toLowerCase().indexOf(q) >= 0 || l.city.toLowerCase().indexOf(q) === 0) matches.push(l);
        }
      }
      list.textContent = '';
      matches.forEach(function (m) {
        var li = el('li', 'ac-opt', m.label);
        li.setAttribute('role', 'option');
        li.addEventListener('mousedown', function (ev) { ev.preventDefault(); pick(m); });
        list.appendChild(li);
      });
      idx = -1;
      if (matches.length) {
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      } else {
        hide();
      }
    }

    function pick(m) {
      state.prefTz = m.tz;
      if (state.instant) state.tz = m.tz;
      save();
      input.value = m.label;
      hide();
      render();
      toast('City updated: ' + m.city + '. The instant, however, did not move.');
      var again = $('#city-input');
      if (again) again.focus();
    }

    input.addEventListener('input', show);
    input.addEventListener('blur', function () { setTimeout(hide, 120); });
    input.addEventListener('keydown', function (ev) {
      if (list.hidden && ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
      var opts = $$('.ac-opt', list);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); idx = Math.min(idx + 1, opts.length - 1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); idx = Math.max(idx - 1, 0); }
      else if (ev.key === 'Enter') {
        ev.preventDefault();
        if (matches[idx]) pick(matches[idx]);
        else if (matches[0]) pick(matches[0]);
        return;
      }
      else if (ev.key === 'Escape') { hide(); return; }
      else return;
      opts.forEach(function (o, j) {
        o.classList.toggle('active', j === idx);
        if (j === idx) o.setAttribute('aria-selected', 'true');
        else o.removeAttribute('aria-selected');
      });
    });

    wrap.appendChild(lab);
    wrap.appendChild(input);
    wrap.appendChild(list);
    host.appendChild(wrap);
  }

  /* ---------- City roulette overlay (real wheel) ---------- */

  var CITY_WHEEL_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

  function startCityRoulette(targetTz, done) {
    var ov = $('#roulette');
    var hub = $('#wheel-hub');
    var rotorBox = $('#roulette-wheel');
    var cityEl = $('#roulette-city');
    var timeEl = $('#roulette-time');
    var btn = $('#roulette-accept');
    var prev = document.activeElement;

    $('#roulette-title').textContent = 'The great wheel chooses your city';
    $('#roulette-sub').textContent = 'A fair spin among the ' + ZONES.length + ' timezones of the world. The wheel takes full responsibility.';
    btn.textContent = 'I accept this city';
    hub.textContent = '';
    cityEl.setAttribute('aria-live', 'off');
    cityEl.textContent = '';
    timeEl.textContent = '';
    btn.hidden = true;
    rotorBox.textContent = '';
    var wheel = makeWheel(rotorBox, CITY_WHEEL_LABELS);
    ov.hidden = false;
    document.body.classList.add('noscroll');

    var t = partsIn(targetTz, new Date());
    wheel.spinTo(Math.floor(Math.random() * 12), function () {
      var l = tzLabel(targetTz);
      hub.textContent = '❖';
      cityEl.setAttribute('aria-live', 'polite');
      cityEl.textContent = l.label;
      timeEl.textContent = t.h + ':' + t.m + ':' + t.s;
      btn.hidden = false;
      btn.focus();
    });

    btn.onclick = function () {
      ov.hidden = true;
      document.body.classList.remove('noscroll');
      if (prev && prev.focus) { try { prev.focus(); } catch (e) {} }
      if (done) done();
    };
  }

  /* ---------- Wheel of Fortune overlay (loot) ---------- */

  var LOOT_LABELS = ['H', 'M', 'S', '📍', '∅'];

  function pickLoot() {
    var w = CFG.rouletteWeights || { hour: 25, minutes: 20, seconds: 15, city: 10, none: 30 };
    var keys = ['hour', 'minutes', 'seconds', 'city', 'none'];
    var total = 0;
    keys.forEach(function (k) { total += w[k] || 0; });
    if (!total) return 'none';
    var r = Math.random() * total;
    var acc = 0;
    for (var i = 0; i < keys.length; i++) {
      acc += w[keys[i]] || 0;
      if (r < acc) return keys[i];
    }
    return 'none';
  }

  function startLootWheel(done) {
    var outcome = pickLoot();
    var dup = outcome !== 'none'
      ? (outcome === 'city' ? !!state.owned.city : !!state.owned[outcome])
      : false;
    var ov = $('#roulette');
    var hub = $('#wheel-hub');
    var rotorBox = $('#roulette-wheel');
    var cityEl = $('#roulette-city');
    var timeEl = $('#roulette-time');
    var btn = $('#roulette-accept');
    var prev = document.activeElement;

    $('#roulette-title').textContent = 'The Wheel of Fortune';
    $('#roulette-sub').textContent = '€0.50 of pure anticipation. Odds published in the house rules, certified by ourselves.';
    btn.textContent = 'Collect';
    hub.textContent = '';
    cityEl.setAttribute('aria-live', 'off');
    cityEl.textContent = '';
    timeEl.textContent = '';
    btn.hidden = true;
    rotorBox.textContent = '';
    var wheel = makeWheel(rotorBox, LOOT_LABELS);
    ov.hidden = false;
    document.body.classList.add('noscroll');

    var outcomeIndex = { hour: 0, minutes: 1, seconds: 2, city: 3, none: 4 }[outcome];
    wheel.spinTo(outcomeIndex, function () {
      var name = outcome === 'none' ? 'Nothing' : ITEMS[outcome].label;
      cityEl.setAttribute('aria-live', 'polite');
      cityEl.textContent = name + (dup ? ' (again)' : '');
      hub.textContent = LOOT_LABELS[outcomeIndex];
      btn.hidden = false;
      btn.focus();
    });

    btn.onclick = function () {
      ov.hidden = true;
      document.body.classList.remove('noscroll');
      if (prev && prev.focus) { try { prev.focus(); } catch (e) {} }
      done(dup ? 'dup:' + outcome : outcome);
    };
  }

  /* ---------- Purchases ---------- */

  function buyFlow(item) {
    if (item === 'refresh' && state.owned.unlimited) { grant('refresh'); return; }
    var link = LINKS[item] || (item === 'refresh' ? LINKS.pack : '');
    if (link) {
      window.location.href = link;
      return;
    }
    toast('The cashier is counting chips right now. Try again in a moment.');
  }

  function grant(item) {
    if (item === 'roulette') {
      startLootWheel(function (outcome) {
        if (outcome === 'none') {
          save();
          render();
          toast('The wheel says: nothing. The time remains €1.00. The wheel is sorry.');
          return;
        }
        if (outcome.indexOf('dup:') === 0) {
          var d = outcome.slice(4);
          save();
          render();
          toast('The wheel gave you ' + ITEMS[d].label + '. You already had it. The wheel apologizes and keeps the €0.50.');
          return;
        }
        grant(outcome);
      });
      return;
    }
    if (item === 'pack') {
      state.owned.hour = true;
      state.owned.minutes = true;
      state.owned.seconds = true;
    } else if (item === 'refresh') {
      state.instant = new Date().toISOString();
      state.drawn = {};
      if (state.owned.city && state.prefTz) {
        state.tz = state.prefTz;
        save();
        render();
        toast(JOKES.refresh);
        return;
      }
      state.tz = randomZone();
      save();
      startCityRoulette(state.tz, render);
      return;
    } else if (item === 'city') {
      state.owned.city = true;
      save();
      render();
      toast("City Roulette unlocked. The city, not the time. That's a different table.");
      var inp = $('#city-input');
      if (inp) inp.focus();
      return;
    } else {
      state.owned[item] = true;
    }

    var anyTime = !!(state.owned.hour || state.owned.minutes || state.owned.seconds);

    if (anyTime && !state.instant) {
      state.instant = new Date().toISOString();
      if (state.owned.city && state.prefTz) {
        state.tz = state.prefTz;
        save();
        render();
        toast('Certified instant captured. It is yours forever. Well, that particular one.');
      } else {
        state.tz = randomZone();
        save();
        startCityRoulette(state.tz, render);
      }
      return;
    }

    save();
    render();
    if (JOKES[item]) toast(JOKES[item]);
  }

  /* ---------- Real counter + decorative timer ---------- */

  function startFakeTimers() {
    var offerEl = $('#offer-timer');
    if (offerEl) {
      var sec = 599;
      setInterval(function () {
        sec--;
        if (sec < 0) sec = 599;
        var m = Math.floor(sec / 60), s = sec % 60;
        offerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      }, 1000);
    }
    /* Real number of processed payments, from /api/stats (Stripe). */
    var buyers = $('#buyers');
    if (buyers) {
      var line = buyers.closest('p, .house-count');
      fetch('/api/stats')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && typeof j.customers === 'number') buyers.textContent = j.customers.toLocaleString('en-US');
          else if (line) line.hidden = true;
        })
        .catch(function () { if (line) line.hidden = true; });
    }
  }

  /* ---------- Init ---------- */

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-buy]') : null;
    if (b) { buyFlow(b.getAttribute('data-buy')); return; }
    var g = ev.target.closest ? ev.target.closest('[data-game]') : null;
    if (g) runGame(g.getAttribute('data-game'));
  });

  function initAnimToggle() {
    var btn = $('#anim-toggle');
    if (!btn) return;
    var off = false;
    try { off = localStorage.getItem('trn_noanim') === '1'; } catch (e) {}
    btn.setAttribute('aria-pressed', off ? 'true' : 'false');
    btn.textContent = off ? 'ANIM: OFF' : 'ANIM: ON';
    document.documentElement.classList.toggle('no-anim', off);
    btn.addEventListener('click', function () {
      var now = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', now ? 'true' : 'false');
      btn.textContent = now ? 'ANIM: OFF' : 'ANIM: ON';
      document.documentElement.classList.toggle('no-anim', now);
      try { localStorage.setItem('trn_noanim', now ? '1' : '0'); } catch (e) {}
    });
  }

  function init() {
    initAnimToggle();
    initDaily();
    renderDailyStatus();
    render();
    startFakeTimers();

    var u = new URLSearchParams(location.search).get('unlock');
    var valid = { hour: 1, minutes: 1, seconds: 1, pack: 1, city: 1, refresh: 1, unlimited: 1, roulette: 1 };
    if (u && valid[u]) {
      grant(u);
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
    }
  }

  init();
})();
