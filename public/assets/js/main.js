/* JPOND — progressive enhancement. The site works without JavaScript;
   this adds the language toggle, mobile menu, form handling with spam
   protection, the donation picker, tabs and a click-to-load map. */
(function () {
  'use strict';
  var html = document.documentElement;
  var isNe = function () { return html.getAttribute('data-lang') === 'ne'; };
  var tr = function (en, ne) { return isNe() ? ne : en; };

  /* ---------- Language toggle ---------- */
  function applyLang(lang) {
    html.setAttribute('data-lang', lang);
    html.setAttribute('lang', lang === 'ne' ? 'ne' : 'en');
    try { localStorage.setItem('jpond-lang', lang); } catch (e) { /* storage unavailable */ }
    // Translate attributes that cannot be swapped with CSS
    document.querySelectorAll('[data-ne-placeholder]').forEach(function (el) {
      if (!el.hasAttribute('data-en-placeholder')) el.setAttribute('data-en-placeholder', el.getAttribute('placeholder') || '');
      el.setAttribute('placeholder', lang === 'ne' ? el.getAttribute('data-ne-placeholder') : el.getAttribute('data-en-placeholder'));
    });
    document.querySelectorAll('[data-ne-aria-label]').forEach(function (el) {
      if (!el.hasAttribute('data-en-aria-label')) el.setAttribute('data-en-aria-label', el.getAttribute('aria-label') || '');
      el.setAttribute('aria-label', lang === 'ne' ? el.getAttribute('data-ne-aria-label') : el.getAttribute('data-en-aria-label'));
    });
    document.querySelectorAll('option[data-ne]').forEach(function (el) {
      if (!el.hasAttribute('data-en')) el.setAttribute('data-en', el.textContent);
      el.textContent = lang === 'ne' ? el.getAttribute('data-ne') : el.getAttribute('data-en');
    });
    var t = document.querySelector('[data-lang-toggle]');
    if (t) t.setAttribute('aria-label', lang === 'ne' ? 'Switch language to English / अंग्रेजीमा हेर्नुहोस्' : 'Switch language to Nepali / नेपाली भाषामा हेर्नुहोस्');
  }
  applyLang(isNe() ? 'ne' : 'en');
  document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () { applyLang(isNe() ? 'en' : 'ne'); });
  });

  /* ---------- Mobile navigation ---------- */
  var navBtn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (navBtn && nav) {
    navBtn.addEventListener('click', function () {
      var open = navBtn.getAttribute('aria-expanded') === 'true';
      navBtn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        navBtn.setAttribute('aria-expanded', 'false');
        navBtn.focus();
      }
    });
  }

  /* ---------- Forms: validation + spam protection ---------- */
  var MIN_FILL_MS = 4000; // humans take longer than this to fill a form
  document.querySelectorAll('form[data-jpond-form]').forEach(function (form) {
    var started = Date.now();
    var ts = form.querySelector('input[name="_ts"]');
    if (ts) ts.value = String(started);
    var status = form.querySelector('.form-status');

    function show(kind, msg) {
      if (!status) return;
      status.hidden = false;
      status.className = 'form-status ' + kind;
      status.innerHTML = msg;
      status.setAttribute('tabindex', '-1');
      status.focus();
    }

    function clearErrors() {
      form.querySelectorAll('.error').forEach(function (e) { e.remove(); });
      form.querySelectorAll('[aria-invalid]').forEach(function (e) {
        e.removeAttribute('aria-invalid');
        var orig = e.getAttribute('data-describedby');
        if (orig) e.setAttribute('aria-describedby', orig); else e.removeAttribute('aria-describedby');
      });
    }

    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();

      // 1. Honeypot: real people never see or fill this field
      var hp = form.querySelector('.hp-field input');
      if (hp && hp.value) { show('ok', tr('Thank you.', 'धन्यवाद।')); form.reset(); return; }

      // 2. Time trap: reject instant (automated) submissions
      if (Date.now() - started < MIN_FILL_MS) {
        show('err', tr('That was very quick! Please check your answers and press send again.', 'धेरै छिटो पठाइयो! कृपया विवरण जाँचेर फेरि पठाउनुहोस्।'));
        started = Date.now() - MIN_FILL_MS + 1000;
        return;
      }

      // 3. Field validation with accessible error messages
      var firstBad = null;
      form.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (el.closest('.hp-field') || el.type === 'hidden') return;
        if (!el.checkValidity()) {
          var id = el.id + '-err';
          var msg = document.createElement('span');
          msg.className = 'error';
          msg.id = id;
          if (el.validity.valueMissing) msg.textContent = el.type === 'checkbox' ? tr('Please tick this box to continue.', 'अगाडि बढ्न कृपया यो बाकसमा चिनो लगाउनुहोस्।') : tr('This field is required.', 'यो विवरण आवश्यक छ।');
          else if (el.validity.typeMismatch && el.type === 'email') msg.textContent = tr('Please enter a valid email address.', 'कृपया सही इमेल ठेगाना लेख्नुहोस्।');
          else msg.textContent = tr('Please check this field.', 'कृपया यो विवरण जाँच्नुहोस्।');
          el.setAttribute('aria-invalid', 'true');
          var prev = el.getAttribute('aria-describedby');
          if (prev && !el.hasAttribute('data-describedby')) el.setAttribute('data-describedby', prev);
          el.setAttribute('aria-describedby', (el.getAttribute('data-describedby') ? el.getAttribute('data-describedby') + ' ' : '') + id);
          var wrap = el.closest('.field') || el.parentNode;
          wrap.appendChild(msg);
          if (!firstBad) firstBad = el;
        }
      });
      if (firstBad) { firstBad.focus(); return; }

      // 4. Optional Cloudflare Turnstile
      var tsWidget = form.querySelector('.cf-turnstile');
      if (tsWidget) {
        var token = form.querySelector('input[name="cf-turnstile-response"]');
        if (!token || !token.value) { show('err', tr('Please complete the security check.', 'कृपया सुरक्षा जाँच पूरा गर्नुहोस्।')); return; }
      }

      var endpoint = form.getAttribute('data-endpoint');
      var data = new FormData(form);
      var btn = form.querySelector('[type="submit"]');

      if (!endpoint) {
        // Not connected yet: offer an email fallback rather than losing the message
        var email = form.getAttribute('data-fallback-email');
        var lines = [];
        data.forEach(function (v, k) { if (k.charAt(0) !== '_' && k !== 'website' && v) lines.push(k + ': ' + v); });
        if (email) {
          var href = 'mailto:' + email + '?subject=' + encodeURIComponent('[JPOND website] ' + (form.getAttribute('data-form-name') || 'Enquiry')) + '&body=' + encodeURIComponent(lines.join('\n'));
          show('info', tr('Our online form is not connected yet. <a href="' + href + '">Send your message by email instead</a> — we have filled it in for you.',
            'हाम्रो अनलाइन फारम अझै जोडिएको छैन। <a href="' + href + '">यसको सट्टा इमेलबाट पठाउनुहोस्</a> — विवरण भरिसकिएको छ।'));
        } else {
          show('info', tr('Our online form is not connected yet. Please contact us by phone or visit our office in Janakpurdham-8. Thank you for your patience.',
            'हाम्रो अनलाइन फारम अझै जोडिएको छैन। कृपया फोनबाट वा जनकपुरधाम-८ स्थित कार्यालयमा आएर सम्पर्क गर्नुहोस्। धन्यवाद।'));
        }
        return;
      }

      if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
      fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          form.reset();
          show('ok', tr('Thank you! Your message has been sent. We will reply as soon as we can.', 'धन्यवाद! तपाईंको सन्देश पठाइयो। हामी सकेसम्म छिटो जवाफ दिनेछौँ।'));
        })
        .catch(function () {
          show('err', tr('Sorry, something went wrong while sending. Please try again, or contact us by phone or email.', 'माफ गर्नुहोस्, पठाउँदा समस्या भयो। कृपया फेरि प्रयास गर्नुहोस् वा फोन/इमेलबाट सम्पर्क गर्नुहोस्।'));
        })
        .then(function () { if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); } started = Date.now(); });
    });
  });

  /* ---------- Donation picker ---------- */
  var donate = document.querySelector('[data-donate]');
  if (donate) {
    var custom = donate.querySelector('#amount-custom-value');
    var customWrap = donate.querySelector('[data-custom-wrap]');
    var summary = donate.querySelector('[data-donate-summary]');
    function update() {
      var picked = donate.querySelector('input[name="amount"]:checked');
      var freq = donate.querySelector('input[name="frequency"]:checked');
      var isCustom = picked && picked.value === 'custom';
      if (customWrap) customWrap.hidden = !isCustom;
      var amt = isCustom ? parseInt(custom.value, 10) : parseInt(picked && picked.value, 10);
      var monthly = freq && freq.value === 'monthly';
      if (!summary) return;
      if (!amt || amt < 1) { summary.innerHTML = tr('Choose or enter an amount to see your gift summary.', 'उपहारको सारांश हेर्न रकम छान्नुहोस् वा लेख्नुहोस्।'); return; }
      var n = amt.toLocaleString('en-IN');
      summary.innerHTML = monthly
        ? tr('You are giving <strong>NPR ' + n + ' every month</strong>. Thank you! Please use one of the payment methods below and mention “Monthly” in the remarks.', 'तपाईं <strong>हरेक महिना रु. ' + n + '</strong> दान गर्दै हुनुहुन्छ। धन्यवाद! कृपया तलका मध्ये कुनै एक भुक्तानी माध्यम प्रयोग गरी कैफियतमा “मासिक” लेख्नुहोस्।')
        : tr('You are giving <strong>NPR ' + n + '</strong> once. Thank you! Please use one of the payment methods below.', 'तपाईं <strong>रु. ' + n + '</strong> एक पटक दान गर्दै हुनुहुन्छ। धन्यवाद! कृपया तलका मध्ये कुनै एक भुक्तानी माध्यम प्रयोग गर्नुहोस्।');
    }
    donate.addEventListener('change', update);
    if (custom) custom.addEventListener('input', update);
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) { b.addEventListener('click', update); });
    update();
  }

  /* ---------- Tabs (accessible, ARIA Authoring Practices) ---------- */
  document.querySelectorAll('.tabs').forEach(function (tabs) {
    var list = tabs.querySelectorAll('[role="tab"]');
    function select(tab, focus) {
      list.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    }
    list.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var idx = null;
        if (e.key === 'ArrowRight') idx = (i + 1) % list.length;
        if (e.key === 'ArrowLeft') idx = (i - 1 + list.length) % list.length;
        if (e.key === 'Home') idx = 0;
        if (e.key === 'End') idx = list.length - 1;
        if (idx !== null) { e.preventDefault(); select(list[idx], true); }
      });
    });
    // Open a tab from the URL hash, e.g. get-involved.html#partner
    var fromHash = location.hash && tabs.querySelector('[role="tab"][data-hash="' + location.hash.slice(1) + '"]');
    select(fromHash || tabs.querySelector('[role="tab"][aria-selected="true"]') || list[0]);
    window.addEventListener('hashchange', function () {
      var t = tabs.querySelector('[role="tab"][data-hash="' + location.hash.slice(1) + '"]');
      if (t) select(t);
    });
  });

  /* ---------- Click-to-load map (saves data on slow networks) ---------- */
  document.querySelectorAll('[data-map-load]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var box = btn.closest('.map-box');
      var f = document.createElement('iframe');
      f.src = btn.getAttribute('data-map-load');
      f.title = tr('Map of Janakpurdham, Dhanusha', 'जनकपुरधाम, धनुषाको नक्सा');
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer';
      box.innerHTML = '';
      box.classList.add('loaded');
      box.appendChild(f);
    });
  });
})();
