/* ==========================================================================
   Halftime Cuts — interactions & motion
   The first-paint entrance (intro curtain, hero) is pure CSS so the page
   renders immediately. This file adds scroll choreography (GSAP +
   ScrollTrigger on native browser scrolling) and the accessibility behaviors.
   Everything degrades to a fully readable static page without JS or with
   prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var SHOP_TZ = 'America/Los_Angeles';
  // Minutes from midnight, keyed by JS weekday (0 = Sunday).
  var HOURS = { 2: [540, 1080], 3: [540, 1080], 4: [540, 1080], 5: [540, 1080], 6: [540, 1080] };
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  var paused = root.classList.contains('is-paused');

  /* ------------------------------------------------------------------------
     Basics that run with or without motion
     ------------------------------------------------------------------------ */
  function setYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  function formatTime(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    var suffix = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 || 12;
    return h12 + (m ? ':' + String(m).padStart(2, '0') : '') + suffix;
  }

  function openStatus() {
    var el = $('[data-status]');
    var parts;
    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone: SHOP_TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      }).formatToParts(new Date());
    } catch (e) { return; }
    var get = function (type) {
      for (var i = 0; i < parts.length; i++) if (parts[i].type === type) return parts[i].value;
      return '';
    };
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    var mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
    if (day < 0 || isNaN(mins)) return;

    // Highlight today's row with real text so screen readers hear it too.
    var row = $('.hours tr[data-day="' + day + '"]');
    if (row) {
      row.classList.add('is-today');
      var chip = document.createElement('span');
      chip.className = 'today-chip';
      chip.textContent = 'Today';
      $('th', row).appendChild(chip);
    }

    var today = HOURS[day];
    var isOpen = !!today && mins >= today[0] && mins < today[1];
    root.classList.toggle('is-open-now', isOpen);

    var text;
    if (isOpen) {
      text = 'Open now · until ' + formatTime(today[1]);
    } else if (today && mins < today[0]) {
      text = 'Closed now · opens today at ' + formatTime(today[0]);
    } else {
      for (var i = 1; i <= 7; i++) {
        var d = (day + i) % 7;
        if (HOURS[d]) {
          text = 'Closed now · opens ' + (i === 1 ? 'tomorrow' : DAY_NAMES[d]) + ' at ' + formatTime(HOURS[d][0]);
          break;
        }
      }
    }
    if (el) {
      el.classList.add(isOpen ? 'is-open' : 'is-closed');
      $('.status__text', el).textContent = text;
    }

    // Broadcast score bug in the hero
    var live = $('[data-live]');
    var short = $('[data-status-short]');
    if (live && short) {
      live.textContent = isOpen ? 'Live' : 'Closed';
      live.classList.toggle('is-live', isOpen);
      short.textContent = text.replace(/^(Open|Closed) now · /, function (m, word) {
        return word === 'Open' ? 'Open · ' : '';
      });
    }
  }

  function headerState() {
    var header = $('[data-header]');
    if (!header) return;
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function activeNav() {
    if (!('IntersectionObserver' in window)) return;
    var links = $$('[data-nav]');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('data-nav')] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) io.observe(section);
    });
  }

  /* In-page links: smooth travel, then move keyboard focus to the target
     so the next Tab continues from there (like a native anchor jump). */
  function focusTarget(target) {
    if (target === 0) target = document.getElementById('top');
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function scrollToTarget(target, done) {
    // Native smooth scroll; CSS scroll-padding keeps targets clear of the fixed header.
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (target === 0) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (done) window.setTimeout(done, reduce ? 0 : 600);
  }

  function anchorLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var target = id === 'top' ? 0 : document.getElementById(id);
      if (target === null) return;
      e.preventDefault();
      var wasOpen = root.classList.contains('menu-open');
      if (wasOpen) closeMenu(true);
      // Focus right away so screen readers announce the destination; then travel.
      focusTarget(target);
      window.setTimeout(function () { scrollToTarget(target); }, wasOpen ? 260 : 0);
      if (history.replaceState) history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
    });
  }

  /* Mobile menu: background is inert while open; Esc closes; focus returns. */
  var menu, toggle, lastFocus;
  var inertTargets = function () { return [$('.skip-link'), $('main'), $('footer'), $('[data-book-bar]')].filter(Boolean); };

  function openMenu() {
    lastFocus = document.activeElement;
    menu.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
    });
    root.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    var label = $('[data-menu-label]', toggle);
    if (label) label.textContent = 'Close menu';
    inertTargets().forEach(function (el) { el.inert = true; });
    document.body.style.overflow = 'hidden';
    var first = $('a', menu);
    if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, 100);
  }

  function closeMenu(skipFocus) {
    if (!menu || menu.hidden) return;
    menu.classList.remove('is-open');
    root.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    var label = $('[data-menu-label]', toggle);
    if (label) label.textContent = 'Open menu';
    inertTargets().forEach(function (el) { el.inert = false; });
    document.body.style.overflow = '';
    window.setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 800);
    if (!skipFocus && lastFocus) lastFocus.focus({ preventScroll: true });
  }

  function mobileMenu() {
    menu = $('[data-mobile-menu]');
    toggle = $('[data-menu-toggle]');
    if (!menu || !toggle) return;
    toggle.addEventListener('click', function () {
      if (menu.hidden) openMenu(); else closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) closeMenu();
    });
    $$('a[data-book]', menu).forEach(function (a) { a.addEventListener('click', function () { closeMenu(true); }); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900) closeMenu(true); });
  }

  /* Mobile booking bar: appears once the hero CTA has scrolled away. */
  function bookBar() {
    var bar = $('[data-book-bar]');
    var heroCtas = $('.hero__ctas');
    var cta = $('.cta__content');
    if (!bar || !heroCtas || !('IntersectionObserver' in window)) {
      if (bar) bar.classList.add('is-visible');
      return;
    }
    var pastHero = false;
    var atCta = false;
    var update = function () { bar.classList.toggle('is-visible', pastHero && !atCta); };
    new IntersectionObserver(function (entries) {
      var entry = entries[0];
      pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    }).observe(heroCtas);
    if (cta) {
      new IntersectionObserver(function (entries) {
        atCta = entries[0].isIntersecting;
        update();
      }, { threshold: 0.2 }).observe(cta);
    }
  }

  /* Pause / play looping animations (WCAG 2.2.2). Remembered per visitor. */
  function motionToggle() {
    var buttons = $$('[data-motion-toggle]');
    var sync = function () {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', paused ? 'true' : 'false'); });
      root.classList.toggle('is-paused', paused);
    };
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        paused = !paused;
        try { window.localStorage.setItem('ht-paused', paused ? '1' : '0'); } catch (e) { /* storage unavailable */ }
        sync();
      });
    });
    sync();
  }

  /* Animated counters: screen readers get the final number, not the ticking one. */
  function counterLabels() {
    $$('[data-count]').forEach(function (el) {
      var sr = document.createElement('span');
      sr.className = 'visually-hidden';
      sr.textContent = el.textContent;
      el.setAttribute('aria-hidden', 'true');
      el.parentNode.insertBefore(sr, el);
    });
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  setYear();
  openStatus();
  headerState();
  activeNav();
  mobileMenu();
  bookBar();
  motionToggle();
  counterLabels();

  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var motion = root.classList.contains('motion') && hasGsap;

  if (!motion) {
    root.classList.remove('motion');
    window.__htReady = true;
    anchorLinks();
    return;
  }
  window.__htReady = true;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out' });

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  anchorLinks();
  window.setTimeout(function () { var pre = $('.preloader'); if (pre) pre.remove(); }, 2600);

  /* One-shot reveals use IntersectionObserver: they fire however the visitor
     arrives (scrolling, jumping to #faq, find-in-page, restored scroll). */
  var revealIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    var i = 0;
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      revealIO.unobserve(el);
      (el.__reveals || []).forEach(function (fn) { fn(i); });
      el.__reveals = [];
      i++;
    });
  }, { rootMargin: '0px' }) : null;

  function onReveal(el, fn) {
    if (!el) return;
    if (!revealIO) { fn(0); return; }
    (el.__reveals = el.__reveals || []).push(fn);
    revealIO.observe(el);
  }

  /* Split text ------------------------------------------------------------- */
  function splitText(el, mode) {
    if (el.__split) return el.__split;
    var plain = el.textContent.replace(/\s+/g, ' ').trim();
    var words = [];
    var chars = [];

    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w';
            var wi = document.createElement('span');
            wi.className = 'wi';
            if (mode === 'chars') {
              Array.from(part).forEach(function (ch) {
                var c = document.createElement('span');
                c.className = 'c';
                c.textContent = ch;
                wi.appendChild(c);
                chars.push(c);
              });
            } else {
              wi.textContent = part;
            }
            w.appendChild(wi);
            frag.appendChild(w);
            words.push(wi);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR' && !child.classList.contains('visually-hidden')) {
          walk(child);
        }
      });
    })(el);

    // Screen readers get the original sentence; the animated pieces are hidden.
    var visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    var keep = [];
    while (el.firstChild) {
      var n = el.firstChild;
      if (n.nodeType === 1 && n.classList.contains('visually-hidden')) { keep.push(n); el.removeChild(n); continue; }
      visual.appendChild(n);
    }
    var sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = plain.replace(/\s*\(opens in new tab\)$/, '');
    el.appendChild(sr);
    el.appendChild(visual);
    keep.forEach(function (k) { el.appendChild(k); });

    el.__split = { words: words, chars: chars };
    return el.__split;
  }

  // Hero drifts apart as you leave it.
  gsap.to('.hero__title', {
    yPercent: -14, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.hero__art', {
    yPercent: 12, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.court__lines', {
    rotate: 120, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* Velocity-reactive ticker --------------------------------------------- */
  var scrollVelocity = 0;
  var scrollDirection = 1;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (self) {
      scrollVelocity = self.getVelocity();
      scrollDirection = self.direction;
    }
  });

  $$('[data-marquee]').forEach(function (track) {
    var group = $('.ticker__group', track);
    var dir = Number(track.getAttribute('data-marquee')) || 1;
    var groupWidth = 0;
    var x = 0;
    var visible = true;

    var build = function () {
      $$('.ticker__group', track).slice(1).forEach(function (g) { g.remove(); });
      groupWidth = group.getBoundingClientRect().width;
      var copies = Math.ceil((window.innerWidth * 1.3) / Math.max(groupWidth, 1)) + 1;
      for (var i = 0; i < copies; i++) track.appendChild(group.cloneNode(true));
    };
    build();
    ScrollTrigger.addEventListener('refreshInit', build);

    ScrollTrigger.create({
      trigger: track.parentNode, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { visible = self.isActive; }
    });

    gsap.ticker.add(function () {
      if (!visible || !groupWidth || paused) return;
      var boost = 1 + Math.min(Math.abs(scrollVelocity) / 260, 7);
      x -= 0.7 * dir * scrollDirection * boost * gsap.ticker.deltaRatio();
      x = gsap.utils.wrap(-groupWidth, 0, x);
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    });
  });
  gsap.ticker.add(function () { scrollVelocity *= 0.92; });

  /* Headings & copy reveals -------------------------------------------------- */
  $$('[data-split]').forEach(function (el) {
    var mode = el.getAttribute('data-split');
    var parts = splitText(el, mode);
    var targets = mode === 'chars' ? parts.chars : parts.words;
    gsap.set(targets, { yPercent: 115 });
    el.style.visibility = 'visible';
    onReveal(el, function () {
      gsap.to(targets, {
        yPercent: 0,
        duration: mode === 'chars' ? 1.1 : 1.2,
        ease: 'expo.out',
        stagger: mode === 'chars' ? 0.03 : Math.min(0.07, 1.2 / targets.length)
      });
    });
  });

  // Reveal = wipe + rise. Text is never made transparent, so contrast checkers
  // (WAVE, axe) read real colours whatever the scroll position.
  var HIDDEN_CLIP = 'inset(0% 0% 100% 0%)';
  var SHOWN_CLIP = 'inset(0% 0% 0% 0%)';
  function showNow(el) {
    if (el.classList.contains('is-revealed')) return;
    el.classList.add('is-revealed');
    gsap.getTweensOf(el).forEach(function (tw) { if (!tw.scrollTrigger) tw.kill(); });
    gsap.set(el, { clearProps: 'clipPath,transform' });
  }
  $$('[data-reveal]').forEach(function (el) {
    onReveal(el, function (i) {
      if (el.classList.contains('is-revealed')) return;
      gsap.fromTo(el, { clipPath: HIDDEN_CLIP, y: 28 }, {
        clipPath: SHOWN_CLIP, y: 0, duration: 1.1, ease: 'power3.out',
        delay: Math.min(i, 6) * 0.09, clearProps: 'clipPath,transform'
      });
      el.classList.add('is-revealed');
    });
  });

  // Keyboard users can tab ahead of the scroll: show anything that receives focus.
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    for (var n = t; n && n !== document.body; n = n.parentElement) {
      if (n.hasAttribute('data-reveal')) { showNow(n); continue; }
      if (n.__pendingReveal) { n.__pendingReveal = false; gsap.getTweensOf(n).forEach(function (tw) { if (!tw.scrollTrigger) tw.kill(); }); gsap.set(n, { clearProps: 'clipPath,transform' }); }
    }
    $$('.wi, .c', t).concat($$('.wi, .c', t.closest('[data-split]') || document.createElement('i')))
      .forEach(function (piece) { gsap.set(piece, { yPercent: 0 }); });
  }, true);

  // Statement: words darken as you read. The starting grey still clears 3.5:1 contrast.
  $$('[data-scrub-words]').forEach(function (el) {
    var words = splitText(el, 'words').words;
    gsap.fromTo(words, { color: '#80889C' }, {
      color: '#0E1A38', ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true }
    });
  });

  // Counters.
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var from = parseFloat(el.getAttribute('data-count-from') || '0');
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var state = { v: from };
    el.textContent = from.toFixed(decimals);
    onReveal(el, function () {
      gsap.to(state, {
        v: end, duration: 2, ease: 'power3.out',
        onUpdate: function () { el.textContent = state.v.toFixed(decimals); }
      });
    });
  });

  // Game-day rules draw in.
  $$('.exp__item').forEach(function (item) {
    var rule = $('.exp__rule', item);
    gsap.set(rule, { scaleX: 0 });
    onReveal(item, function () { gsap.to(rule, { scaleX: 1, duration: 1.4, ease: 'expo.out' }); });
  });

  /* Image frames: reveal + inner parallax --------------------------------- */
  $$('[data-parallax-frame] .photo').forEach(function (frame) {
    gsap.fromTo(frame, { clipPath: 'inset(18% 10% 0% 10%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top 95%', end: 'top 35%', scrub: true }
    });
    gsap.fromTo(frame.children, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* Starting lineup: pinned horizontal rail on desktop ---------------------- */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 1024px) and (min-height: 640px)', function () {
    var pin = $('.lineup__pin');
    var rail = $('[data-lineup-rail]');
    if (!pin || !rail) return;
    var distance = function () { return Math.max(0, rail.scrollWidth - pin.clientWidth); };

    var tween = gsap.to(rail, {
      x: function () { return -distance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: function () { return '+=' + distance(); },
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 1
      }
    });

    $$('.player', rail).forEach(function (card) {
      gsap.fromTo(card, { y: 70, rotate: 3 }, {
        y: 0, rotate: 0, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 104%', end: 'left 76%', scrub: true }
      });
      // Jersey number rises like a scoreboard digit; the photo eases out of a zoom.
      gsap.fromTo($('.player__num', card), { yPercent: 120 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 96%', end: 'left 70%', scrub: true }
      });
      gsap.fromTo($$('.photo > img, .photo__fallback', card), { scale: 1.18 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 104%', end: 'left 72%', scrub: true }
      });
    });

    // Keyboard: tabbing to a barber's link scrolls the page so that card is on screen.
    var onFocus = function (e) {
      var card = e.target.closest('.player');
      var st = tween.scrollTrigger;
      if (!card || !st) return;
      requestAnimationFrame(function () {
        pin.scrollLeft = 0;
        var dist = distance();
        var x = gsap.utils.clamp(0, dist, card.offsetLeft - (pin.clientWidth - card.offsetWidth) / 2);
        var y = st.start + (dist ? x / dist : 0) * (st.end - st.start);
        window.scrollTo(0, y);
        gsap.set(card, { y: 0, rotate: 0 });
        gsap.set($('.player__num', card), { yPercent: 0 });
      });
    };
    rail.addEventListener('focusin', onFocus);
    return function () { rail.removeEventListener('focusin', onFocus); };
  });
  mm.add('(max-width: 1023px), (max-height: 639px)', function () {
    $$('.player').forEach(function (card) {
      gsap.set(card, { clipPath: HIDDEN_CLIP, y: 40 });
      card.__pendingReveal = true;
      onReveal(card, function (i) {
        if (!card.__pendingReveal) return;
        card.__pendingReveal = false;
        gsap.to(card, { clipPath: SHOWN_CLIP, y: 0, duration: 1, ease: 'power3.out', delay: i * 0.1, clearProps: 'clipPath,transform' });
      });
    });
    return function () { gsap.set('.player', { clearProps: 'all' }); };
  });

  /* Reviews marquee: duplicate cards for a seamless CSS loop -------------- */
  $$('[data-reviews-marquee] .reviews__track').forEach(function (track) {
    $$('li', track).forEach(function (li) {
      var clone = li.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
    // Use margins rather than flex gap so -50% lands exactly on the seam.
    track.style.gap = '0px';
    $$('li', track).forEach(function (li) { li.style.marginRight = '20px'; });
  });

  /* Highlight-reel tiles float at different speeds ------------------------- */
  mm.add({ desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' }, function (ctx) {
    var factor = ctx.conditions.desktop ? 9 : 3.5;
    $$('.tile[data-speed]').forEach(function (tile) {
      var speed = parseFloat(tile.getAttribute('data-speed')) || 0;
      gsap.fromTo(tile, { y: -speed * factor }, {
        y: speed * factor, ease: 'none',
        scrollTrigger: { trigger: '.gram__grid', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  });

  // Highlight reel: the photo grid is a mouse shortcut to Instagram (the "Follow us"
  // button is the keyboard / screen-reader link, so the grid isn't a pile of duplicate links).
  $$('[data-href]').forEach(function (grid) {
    grid.addEventListener('click', function () { window.open(grid.getAttribute('data-href'), '_blank', 'noopener'); });
  });

  // Handle letters bounce on hover.
  var handle = $('.gram__title');
  if (handle && finePointer) {
    handle.addEventListener('mouseenter', function () {
      if (paused) return;
      var chars = $$('.c', handle);
      gsap.fromTo(chars, { yPercent: 0 }, {
        yPercent: -14, duration: 0.25, ease: 'power2.out',
        stagger: { each: 0.025, yoyo: true, repeat: 1 }, overwrite: true
      });
    });
  }

  /* Map + final CTA -------------------------------------------------------- */
  gsap.fromTo('.map-frame', { clipPath: 'inset(14% 8% 14% 8% round 28px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
    scrollTrigger: { trigger: '.map-frame', start: 'top 95%', end: 'top 40%', scrub: true }
  });

  gsap.fromTo('[data-cta-panel]',
    { clipPath: 'inset(9% 5% 9% 5% round 48px)' },
    {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: '.cta', start: 'top 92%', end: 'top 10%', scrub: true }
    });
  gsap.fromTo('.cta__content', { y: 80, scale: 0.94 }, {
    y: 0, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.cta', start: 'top 92%', end: 'top 10%', scrub: true }
  });

  // Footer wordmark rises letter by letter.
  var footerWord = $('[data-fit-inner]');
  if (footerWord) {
    var fChars = splitText(footerWord, 'chars').chars;
    gsap.set(fChars, { yPercent: 110 });
    onReveal($('.footer__word'), function () {
      gsap.to(fChars, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.035 });
    });
  }

  /* Magnetic buttons, logo tilt + cursor label (mouse/trackpad only) ----- */
  if (finePointer) {
    var tilt = $('[data-tilt]');
    var hero = $('.hero');
    if (tilt && hero) {
      gsap.set(tilt, { transformPerspective: 900 });
      var rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.9, ease: 'power3' });
      var ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.9, ease: 'power3' });
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 22);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 16);
      });
      hero.addEventListener('pointerleave', function () { rx(0); ry(0); });
    }

    $$('[data-magnetic]').forEach(function (btn) {
      var xTo = gsap.quickTo(btn, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      var yTo = gsap.quickTo(btn, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      btn.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });

    var cursor = $('.cursor');
    var labelText = cursor && cursor.querySelector('.cursor__label');
    if (cursor && labelText) {
      root.classList.add('has-cursor');
      var labelNode = labelText.firstChild;
      var cx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
      var cy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
      window.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); }, { passive: true });
      $$('[data-cursor]').forEach(function (el) {
        el.addEventListener('pointerenter', function () {
          labelNode.nodeValue = el.getAttribute('data-cursor');
          cursor.classList.add('is-active');
        });
        el.addEventListener('pointerleave', function () { cursor.classList.remove('is-active'); });
      });
    }
  }

  ScrollTrigger.sort();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
