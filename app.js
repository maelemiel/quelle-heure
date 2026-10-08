/* QuelleHeure(tm) - client logic: purchases, vault, timezone roulette, demo checkout, starfield. */
(function () {
  'use strict';

  var CFG = window.QH_CONFIG || { demo: true, prices: {}, paymentLinks: {} };
  var PRICES = CFG.prices || {};
  var LINKS = CFG.paymentLinks || {};
  var STORE_KEY = 'quelleheure_state_v1';

  var ITEMS = {
    hour:    { label: 'The Hour' },
    minutes: { label: 'The Minutes' },
    seconds: { label: 'The Seconds' },
    pack:    { label: 'The Complete Pack (H + M + S)' },
    city:    { label: 'The City of Your Choice' },
    refresh: { label: 'The Time Refresh' }
  };

  var JOKES = {
    hour:    "Hour unlocked. You're now in the right hour. The right day is a separate product.",
    minutes: 'Minutes unlocked. They were there all along, but now they are yours.',
    seconds: 'Seconds unlocked. Welcome to absolute precision.',
    pack:    'Complete Pack activated. Hour, minutes, seconds: you know everything. Well, everything that is for sale.',
    refresh: 'Time updated. The previous one keeps sentimental value.'
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

  /* ---------- State ---------- */

  function blank() { return { owned: {}, instant: null, tz: null, prefTz: null }; }
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
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 4500);
  }

  /* ---------- Starfield (decorative) ---------- */

  function initStarfield() {
    var c = document.getElementById('starfield');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var stars = [];
    var W = 0, H = 0;

    function make() {
      stars = [];
      var n = Math.round((W * H) / 9000);
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.3 + 0.3,
          o: Math.random() * 0.55 + 0.25,
          p: Math.random() * Math.PI * 2,
          s: Math.random() * 0.9 + 0.35,
          c: Math.random() < 0.08 ? '#F2C878' : (Math.random() < 0.08 ? '#7FE0CE' : '#EAF0FF')
        });
      }
    }

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      c.style.width = W + 'px'; c.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      make();
      if (reduceMotion) draw(0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var tw = reduceMotion ? st.o : st.o * (0.55 + 0.45 * Math.sin(t / 1000 * st.s + st.p));
        ctx.globalAlpha = Math.max(0.05, tw);
        ctx.fillStyle = st.c;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion) requestAnimationFrame(draw);
    }

    var rT = null;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(resize, 150);
    });
    resize();
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  /* ---------- Vault rendering ---------- */

  function render() {
    var box = $('#coffre-body');
    if (!box) return;
    box.textContent = '';
    var anyTime = !!(state.owned.hour || state.owned.minutes || state.owned.seconds);

    if (!anyTime) {
      box.appendChild(el('p', 'biglock', '🔒'));
      box.appendChild(el('p', 'coffre-empty', "It's time to pay to know what time it is."));
      if (state.owned.city) {
        box.appendChild(el('p', 'fine', 'City selection is already unlocked. Only the time itself is missing.'));
        buildCityChooser(box);
      } else {
        box.appendChild(el('p', 'fine', 'No time has been purchased on this device. Yours is waiting.'));
      }
      var p = el('p'); p.style.marginTop = '1.2rem';
      var cta = el('a', 'btn btn-ghost', 'See the pricing');
      cta.href = '#tarifs';
      p.appendChild(cta);
      box.appendChild(p);
      return;
    }

    var d = new Date(state.instant);
    var tp = partsIn(state.tz, d);
    var lab = tzLabel(state.tz);

    box.appendChild(el('p', 'coffre-meta',
      'Certified purchase instant: ' +
      d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-GB') + ". Non-modifiable (that's the point)."));

    var chosen = !!(state.owned.city && state.prefTz && state.prefTz === state.tz);
    box.appendChild(el('p', 'coffre-city',
      (chosen ? 'Your city: ' : 'City assigned by the roulette: ') + '📍 ' + lab.label));

    var disp = el('div', 'time-display');
    var segs = [['hour', 'hours', tp.h], ['minutes', 'min', tp.m], ['seconds', 'sec', tp.s]];
    segs.forEach(function (sg) {
      var key = sg[0], unit = sg[1], val = sg[2];
      if (state.owned[key]) {
        var seg = el('div', 'seg');
        seg.appendChild(el('span', 'digits', val));
        seg.appendChild(el('span', 'unit', unit));
        disp.appendChild(seg);
      } else {
        var btn = el('button', 'seg seg-btn');
        btn.type = 'button';
        btn.setAttribute('data-buy', key);
        btn.setAttribute('aria-label', 'Unlock ' + ITEMS[key].label.toLowerCase() + ' for ' + fmtPrice(key));
        btn.appendChild(el('span', 'digits', '••'));
        btn.appendChild(el('span', 'unit', unit));
        btn.appendChild(el('span', 'lock', '🔒 ' + fmtPrice(key)));
        disp.appendChild(btn);
      }
    });
    box.appendChild(disp);
    box.appendChild(el('p', 'fine', 'Time frozen at the instant of purchase. Time itself moved on without you.'));

    if (state.owned.hour && state.owned.minutes && state.owned.seconds) {
      var pr = el('p'); pr.style.marginTop = '1rem';
      var up = el('button', 'btn btn-ghost', 'Refresh the time (' + fmtPrice('refresh') + ')');
      up.type = 'button';
      up.setAttribute('data-buy', 'refresh');
      pr.appendChild(up);
      box.appendChild(pr);
    }

    if (state.owned.city) {
      buildCityChooser(box);
    } else {
      var pc = el('p'); pc.style.marginTop = '1.2rem';
      var bc = el('button', 'btn btn-ghost', 'Choose my city (' + fmtPrice('city') + ')');
      bc.type = 'button';
      bc.setAttribute('data-buy', 'city');
      pc.appendChild(bc);
      box.appendChild(pc);
      box.appendChild(el('p', 'fine', 'Or keep the roulette. It decides, and it does it well.'));
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

  /* ---------- Demo checkout ---------- */

  var currentClose = null;

  function demoCheckout(item) {
    return new Promise(function (resolve) {
      var ov = $('#checkout');
      var form = $('#pay-form');
      var btn = $('#pay-btn');
      $('#checkout-item').textContent = ITEMS[item].label;
      $('#checkout-amount').textContent = fmtPrice(item);
      btn.disabled = false;
      btn.classList.remove('ok');
      btn.textContent = 'Pay ' + fmtPrice(item);
      $('#checkout-note').hidden = !CFG.demo;
      ov.hidden = false;
      document.body.classList.add('noscroll');
      var prev = document.activeElement;
      setTimeout(function () { $('#card').focus(); }, 30);

      function close(ok) {
        ov.hidden = true;
        document.body.classList.remove('noscroll');
        form.reset();
        currentClose = null;
        form.onsubmit = null;
        ov.onclick = null;
        if (prev && prev.focus) { try { prev.focus(); } catch (e) {} }
        resolve(ok);
      }
      currentClose = function () { close(false); };

      form.onsubmit = function (ev) {
        ev.preventDefault();
        btn.disabled = true;
        btn.textContent = 'Checking with the bank of time…';
        setTimeout(function () {
          btn.textContent = 'Payment accepted ✓';
          btn.classList.add('ok');
          setTimeout(function () { close(true); }, 850);
        }, 1100);
      };
      ov.onclick = function (ev) { if (ev.target === ov) close(false); };
    });
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && currentClose) currentClose();
  });

  /* ---------- Timezone roulette ---------- */

  function startRoulette(targetTz, done) {
    var ov = $('#roulette');
    var cityEl = $('#roulette-city');
    var timeEl = $('#roulette-time');
    var btn = $('#roulette-accept');
    var prev = document.activeElement;

    cityEl.classList.remove('land');
    cityEl.setAttribute('aria-live', 'off');
    cityEl.textContent = '…';
    timeEl.textContent = '';
    btn.hidden = true;
    ov.hidden = false;
    document.body.classList.add('noscroll');

    function finish() {
      var l = tzLabel(targetTz);
      var t = partsIn(targetTz, new Date());
      cityEl.setAttribute('aria-live', 'polite');
      cityEl.textContent = l.label;
      cityEl.classList.add('land');
      timeEl.textContent = t.h + ':' + t.m + ':' + t.s;
      btn.hidden = false;
      btn.focus();
    }

    if (reduceMotion) {
      finish();
    } else {
      var i = Math.floor(Math.random() * ZONES.length);
      var delay = 45;
      (function step() {
        var z = ZONES[i % ZONES.length];
        i++;
        var l = tzLabel(z);
        var t = partsIn(z, new Date());
        cityEl.textContent = l.label;
        timeEl.textContent = t.h + ':' + t.m + ':' + t.s;
        delay *= 1.09;
        if (delay < 430) setTimeout(step, delay);
        else setTimeout(finish, 350);
      })();
    }

    btn.onclick = function () {
      ov.hidden = true;
      document.body.classList.remove('noscroll');
      if (prev && prev.focus) { try { prev.focus(); } catch (e) {} }
      if (done) done();
    };
  }

  /* ---------- Purchases ---------- */

  function buyFlow(item) {
    var link = LINKS[item] || (item === 'refresh' ? LINKS.pack : '');
    if (!CFG.demo && link) {
      window.open(link, '_blank');
      toast('External payment. Your unlock happens when you come back.');
      return;
    }
    demoCheckout(item).then(function (ok) { if (ok) grant(item); });
  }

  function grant(item) {
    if (item === 'pack') {
      state.owned.hour = true;
      state.owned.minutes = true;
      state.owned.seconds = true;
    } else if (item === 'refresh') {
      state.instant = new Date().toISOString();
      if (state.owned.city && state.prefTz) {
        state.tz = state.prefTz;
        save();
        render();
        toast(JOKES.refresh);
        return;
      }
      state.tz = randomZone();
      save();
      startRoulette(state.tz, render);
      return;
    } else if (item === 'city') {
      state.owned.city = true;
      save();
      render();
      toast("City selection unlocked. The city, not the time. That's a different pack.");
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
        toast("Certified instant captured. It's yours forever. Well, that particular one.");
      } else {
        state.tz = randomZone();
        save();
        startRoulette(state.tz, render);
      }
      return;
    }

    save();
    render();
    if (JOKES[item]) toast(JOKES[item]);
  }

  /* ---------- Decorative timers ---------- */

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
    var buyers = $('#buyers');
    if (buyers) {
      var n = 1337;
      buyers.textContent = n.toLocaleString('en-US');
      (function tick() {
        setTimeout(function () {
          n += 1 + Math.floor(Math.random() * 3);
          buyers.textContent = n.toLocaleString('en-US');
          tick();
        }, 25000 + Math.random() * 40000);
      })();
    }
  }

  /* ---------- Init ---------- */

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-buy]') : null;
    if (b) buyFlow(b.getAttribute('data-buy'));
  });

  function init() {
    if (CFG.demo) {
      var badge = $('[data-demo]');
      if (badge) badge.hidden = false;
    }
    var zc = $('#zone-count');
    if (zc) zc.textContent = ZONES.length;
    initStarfield();
    render();
    startFakeTimers();

    var u = new URLSearchParams(location.search).get('unlock');
    var valid = { hour: 1, minutes: 1, seconds: 1, pack: 1, city: 1, refresh: 1 };
    if (u && valid[u]) {
      grant(u);
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
    }
  }

  init();
})();
