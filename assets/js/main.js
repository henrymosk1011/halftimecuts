/* ==========================================================================
   Halftime Cuts — interactions & motion
   GSAP + ScrollTrigger for scroll choreography, Lenis for smooth scrolling.
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

  var lenis = null;

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

    var row = $('.hours tr[data-day="' + day + '"]');
    if (row) row.classList.add('is-today');

    var today = HOURS[day];
    var isOpen = !!today && mins >= today[0] && mins < today[1];
    root.classList.toggle('is-open-now', isOpen);
    if (!el) return;

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
    el.classList.add(isOpen ? 'is-open' : 'is-closed');
    $('.status__text', el).textContent = text;

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

  function scrollToTarget(target) {
    var headerH = ($('[data-header]') || { offsetHeight: 0 }).offsetHeight;
    if (lenis) {
      lenis.scrollTo(target, { offset: target === 0 ? 0 : -headerH + 1, duration: 1.4 });
    } else if (target === 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
      // Let the menu start closing before travelling.
      window.setTimeout(function () { scrollToTarget(target); }, wasOpen ? 260 : 0);
      if (id !== 'top' && history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* Mobile menu ------------------------------------------------------------ */
  var menu, toggle, lastFocus;

  function openMenu() {
    lastFocus = document.activeElement;
    menu.hidden = false;
    // next frame so the clip-path transition runs
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
    });
    root.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
    var first = $('a', menu);
    if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, 300);
  }

  function closeMenu(skipFocus) {
    if (!menu || menu.hidden) return;
    menu.classList.remove('is-open');
    root.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start(); else document.body.style.overflow = '';
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

  /* Mobile booking bar: appears once the hero CTA has scrolled away. ------- */
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

  /* Fit giant display lines to their container width. --------------------- */
  function fitText(box, measureEl) {
    if (!box || !measureEl) return;
    box.style.removeProperty('--fit');
    var size = parseFloat(window.getComputedStyle(box).fontSize);
    var width = measureEl.getBoundingClientRect().width;
    var target = box.clientWidth - parseFloat(window.getComputedStyle(box).paddingLeft) - parseFloat(window.getComputedStyle(box).paddingRight);
    if (!width || !target) return;
    box.style.setProperty('--fit', (size * target / width).toFixed(2) + 'px');
  }

  function fitAll() {
    var title = $('.hero__title');
    fitText(title, $('.hero__line--1 > span', title));
    var word = $('.footer__word');
    fitText(word, $('[data-fit-inner]', word));
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
  fitAll();

  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var motion = root.classList.contains('motion') && hasGsap;

  var resizeTimer;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      fitAll();
      if (motion) window.ScrollTrigger.refresh();
    }, 150);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      fitAll();
      if (motion) window.ScrollTrigger.refresh();
    });
  }

  if (!motion) {
    root.classList.remove('motion', 'intro');
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

  /* Smooth scroll ---------------------------------------------------------- */
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  anchorLinks();

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
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    })(el);

    // Screen readers get the original sentence; the animated pieces are hidden.
    var visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    while (el.firstChild) visual.appendChild(el.firstChild);
    var sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = plain;
    el.appendChild(sr);
    el.appendChild(visual);

    el.__split = { words: words, chars: chars };
    return el.__split;
  }

  /* Hero ------------------------------------------------------------------- */
  var heroChars = [];
  $$('.hero__title [data-split]').forEach(function (el) {
    heroChars = heroChars.concat(splitText(el, 'chars').chars);
    el.style.visibility = 'visible';
  });
  gsap.set(heroChars, { yPercent: 115 });
  fitAll();

  function heroIn(withHeader) {
    var tl = gsap.timeline();
    if (withHeader) tl.fromTo('.header', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.9 }, 0.1);
    tl.to(heroChars, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.035 }, 0)
      .fromTo('.court', { opacity: 0, scale: 0.82, rotate: -25 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.5, ease: 'expo.out' }, 0.05)
      .fromTo('.court__logo', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.3, ease: 'back.out(1.6)' }, 0.45)
      .to('[data-hero-fade]', { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, 0.4);
    return tl;
  }

  function runIntro() {
    var pre = $('.preloader');
    if (!root.classList.contains('intro') || !pre) {
      if (pre) pre.remove();
      heroIn();
      return;
    }
    if (lenis) lenis.stop();
    window.scrollTo(0, 0);
    var clock = $('[data-clock]', pre);
    var count = { v: 0 };
    var done = function () {
      pre.remove();
      root.classList.remove('intro');
      if (lenis) lenis.start();
      try { window.sessionStorage.setItem('ht-intro', '1'); } catch (e) { /* storage unavailable */ }
    };
    gsap.timeline()
      .to(count, {
        v: 45, duration: 1.15, ease: 'power2.inOut',
        onUpdate: function () { clock.textContent = String(Math.round(count.v)).padStart(2, '0'); }
      })
      .to('.preloader__progress span', { scaleX: 1, duration: 1.15, ease: 'power2.inOut' }, 0)
      .fromTo('.preloader__logo', { scale: 0.6, opacity: 0, rotate: -8 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.9, ease: 'back.out(1.7)' }, 0)
      .to('.preloader__board', { yPercent: -40, opacity: 0, duration: 0.4, ease: 'power3.in' }, '+=0.05')
      .fromTo('.preloader__word', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, '-=0.1')
      .to(pre, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '+=0.2')
      .addLabel('lift', '<')
      .add(heroIn(true), 'lift+=0.45')
      .add(done, 'lift+=1');
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
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
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
      if (!visible || !groupWidth) return;
      var boost = 1 + Math.min(Math.abs(scrollVelocity) / 260, 7);
      x -= 0.7 * dir * scrollDirection * boost * gsap.ticker.deltaRatio();
      x = gsap.utils.wrap(-groupWidth, 0, x);
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    });
  });
  gsap.ticker.add(function () { scrollVelocity *= 0.92; });

  /* Headings & copy reveals -------------------------------------------------- */
  $$('[data-split]').forEach(function (el) {
    if (el.closest('.hero__title')) return;
    var mode = el.getAttribute('data-split');
    var parts = splitText(el, mode);
    var targets = mode === 'chars' ? parts.chars : parts.words;
    gsap.set(targets, { yPercent: 115 });
    el.style.visibility = 'visible';
    gsap.to(targets, {
      yPercent: 0,
      duration: mode === 'chars' ? 1.1 : 1.2,
      ease: 'expo.out',
      stagger: mode === 'chars' ? 0.03 : Math.min(0.07, 1.2 / targets.length),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: 0.09, overwrite: true });
    }
  });

  // Statement: words light up as you read.
  $$('[data-scrub-words]').forEach(function (el) {
    var words = splitText(el, 'words').words;
    gsap.fromTo(words, { opacity: 0.13 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
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
    gsap.to(state, {
      v: end, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: function () { el.textContent = state.v.toFixed(decimals); }
    });
  });

  // Experience rules draw in.
  $$('.exp__item').forEach(function (item) {
    gsap.fromTo($('.exp__rule', item), { scaleX: 0 }, {
      scaleX: 1, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: item, start: 'top 90%', once: true }
    });
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

  /* Lineup: pinned horizontal rail on desktop ------------------------------ */
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
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    $$('.player', rail).forEach(function (card) {
      gsap.fromTo(card, { y: 70, rotate: 3, opacity: 0.25 }, {
        y: 0, rotate: 0, opacity: 1, ease: 'none',
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
  });
  mm.add('(max-width: 1023px), (max-height: 639px)', function () {
    ScrollTrigger.batch('.player', {
      start: 'top 92%', once: true,
      onEnter: function (batch) { gsap.fromTo(batch, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }); }
    });
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

  /* Instagram tiles float at different speeds ------------------------------ */
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

  // Handle letters bounce on hover.
  var handle = $('.gram__title a');
  if (handle && finePointer) {
    handle.addEventListener('mouseenter', function () {
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
    gsap.to(fChars, {
      yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.035,
      scrollTrigger: { trigger: '.footer__word', start: 'top 98%', once: true }
    });
    fitAll();
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

  /* Go ---------------------------------------------------------------------- */
  runIntro();
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
