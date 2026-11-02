/* motion-kit.js: declarative scroll/motion engine distilled from plstka, nanovate and nexapp (see motion-study.md).
   Needs: gsap 3.12 + ScrollTrigger (+ optional Lenis 1.1). Every effect is a data attribute; RTL-aware; reduced-motion safe.
   <html data-motion="ui">  → small product reveals (nexapp)     <html data-motion="editorial"> → big masked reveals (plstka, default) */
(function () {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rtl = () => root.dir === 'rtl';
  const MK = window.MK = { $, $$, reduce, fine, lenis: null };
  if (reduce || !window.gsap || !window.ScrollTrigger) { root.classList.add('mk-static'); return; }
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('mk-on');

  const UI = root.dataset.motion === 'ui';
  const EASE = UI ? 'quint.out' : 'expo.out';                         // nexapp [.22,1,.36,1] ≈ quint.out; plstka expo.out
  const R = UI ? { y: 24, scale: .98, dur: .62, stag: .06, start: 'top 82%' }
               : { y: 44, scale: 1, dur: 1.2, stag: .09, start: 'top 88%' };
  const once = (trigger, start = R.start) => ({ trigger, start, once: true });

  /* ---------- smooth scroll (Lenis lerp .085, synced to ScrollTrigger) ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (window.Lenis && root.dataset.smooth !== 'off') {
    const lenis = MK.lenis = new Lenis({ lerp: .085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = a.getAttribute('href').length > 1 && $(a.getAttribute('href')); if (!t) return;
    e.preventDefault(); MK.lenis ? MK.lenis.scrollTo(t, { duration: 1.6 }) : t.scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------- split words (never chars: Arabic joining breaks) ---------- */
  // In RTL, each word becomes an atomic inline, so a Latin phrase would flip ("Motion Kit" → "Kit Motion"); keep Latin runs as one unit.
  const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const tokens = (t, el) => {
    const parts = t.split(/(\s+)/).filter(Boolean);
    if (getComputedStyle(el).direction !== 'rtl') return parts;
    const out = [];
    parts.forEach(p => {
      const prev = out[out.length - 1], latin = !AR.test(p) && /\S/.test(p);
      if (latin && prev !== undefined && out.length > 1 && /^\s+$/.test(prev) && !AR.test(out[out.length - 2])) { out.pop(); out[out.length - 1] += ' ' + p; }
      else out.push(p);
    });
    return out;
  };
  function words(el) {
    if (el.dataset.mkSplit) return $$('.mk-wi', el);
    el.dataset.mkSplit = '1';
    (function walk(n) {
      Array.from(n.childNodes).forEach(c => {
        if (c.nodeType === 3) {
          const f = document.createDocumentFragment();
          tokens(c.textContent, n).forEach(p => {
            if (/^\s+$/.test(p)) return f.appendChild(document.createTextNode(' '));
            const o = document.createElement('span'), i = document.createElement('span');
            o.className = 'mk-w'; i.className = 'mk-wi'; i.textContent = p; o.appendChild(i); f.appendChild(o);
          });
          c.replaceWith(f);
        } else if (c.nodeType === 1 && !/^(BR|SVG|IMG)$/.test(c.tagName)) walk(c);
      });
    })(el);
    return $$('.mk-wi', el);
  }
  MK.words = words;

  /* ---------- nav: hide on scroll down, compact past 40px, pill morph ---------- */
  const nav = $('[data-nav]');
  if (nav) {
    let last = scrollY, q = false;
    const upd = () => {
      q = false; const y = scrollY;
      nav.classList.toggle('is-compact', y > 40);                     // nexapp: bar → floating pill (style .is-compact in CSS)
      if (nav.dataset.nav === 'hide') {
        if (y < 500 || y < last - 2) nav.classList.remove('is-hidden'); else if (y > last + 2) nav.classList.add('is-hidden');
      }
      last = y;
    };
    addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(upd); } }, { passive: true }); upd();
  }
  const bar = $('[data-progress]');
  if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  /* ---------- pointer: cursor ring + magnetic (fine pointers only) ---------- */
  if (fine) {
    if (root.hasAttribute('data-cursor-on')) {
      document.body.insertAdjacentHTML('beforeend', '<div class="mk-ring" aria-hidden="true"><b></b></div><div class="mk-dot" aria-hidden="true"></div>');
      const dot = $('.mk-dot'), ring = $('.mk-ring'), lbl = $('b', ring);
      const dx = gsap.quickTo(dot, 'x', { duration: .06 }), dy = gsap.quickTo(dot, 'y', { duration: .06 });
      const rx = gsap.quickTo(ring, 'x', { duration: .5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .5, ease: 'power3' });
      addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
      document.addEventListener('pointerover', e => {
        const l = e.target.closest('[data-cursor]'), k = !l && e.target.closest('a,button,summary,label');
        ring.classList.toggle('is-label', !!l); ring.classList.toggle('is-link', !!k); lbl.textContent = l ? l.dataset.cursor : '';
      });
    }
    $$('[data-magnetic]').forEach(el => {
      const s = parseFloat(el.dataset.magnetic || '.35');
      const mx = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * s); my((e.clientY - r.top - r.height / 2) * s); });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1,.3)' }));
    });
  }

  /* ---------- marquee: constant drift + scroll-velocity boost ---------- */
  $$('[data-marquee]').forEach(mq => {
    const tr = mq.firstElementChild; if (!tr) return;
    tr.innerHTML = tr.innerHTML.repeat(4);
    const dir = (mq.dataset.marquee === 'rev' ? 1 : -1) * (rtl() ? -1 : 1), speed = parseFloat(mq.dataset.speed || '60');
    let x = 0, boost = 0, hover = false;
    if (mq.hasAttribute('data-pause')) { mq.addEventListener('pointerenter', () => hover = true); mq.addEventListener('pointerleave', () => hover = false); }
    gsap.ticker.add((t, dt) => {
      const q = tr.scrollWidth / 4; if (!q) return;
      boost += -boost * .05; x = (x + (hover ? 0 : (speed + boost) * dir * dt / 1000)) % q; if (x > 0) x -= q;
      gsap.set(tr, { x });
    });
    ScrollTrigger.create({ trigger: mq, start: 'top bottom', end: 'bottom top', onUpdate: s => { boost = Math.min(Math.abs(s.getVelocity()) * .35, 900); } });
  });

  /* ---------- play-once reveals ---------- */
  function reveals() {
    $$('[data-split]').forEach(el => gsap.from(words(el), UI
      ? { yPercent: 60, opacity: 0, duration: .7, ease: EASE, stagger: .03, scrollTrigger: once(el) }
      : { yPercent: 118, rotate: 4, duration: 1.25, ease: EASE, stagger: .045, scrollTrigger: once(el) }));
    $$('[data-fade]').forEach(el => gsap.from(el, { y: R.y, scale: R.scale, opacity: 0, duration: R.dur, ease: EASE,
      delay: parseFloat(el.dataset.fade || 0), scrollTrigger: once(el, 'top 90%') }));
    $$('[data-stagger]').forEach(g => gsap.from(g.children, { y: UI ? 24 : 70, scale: R.scale, opacity: 0, duration: R.dur, ease: EASE,
      stagger: R.stag, clearProps: 'transform,opacity', scrollTrigger: once(g, 'top 85%') }));
    $$('[data-clip]').forEach(el => gsap.from(el, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: once(el, 'top 85%') }));
    $$('[data-pop]').forEach(g => gsap.from(g.children, { scale: 0, duration: 1, ease: 'back.out(1.7)', stagger: { each: .06, from: 'random' }, scrollTrigger: once(g, 'top 82%') }));
    $$('[data-count]').forEach(el => {
      const raw = el.textContent.trim(), m = raw.match(/[\d,.]+/); if (!m) return;
      const to = parseFloat(m[0].replace(/,/g, '')), dec = (m[0].split('.')[1] || '').length;
      const pre = raw.slice(0, m.index), post = raw.slice(m.index + m[0].length), o = { v: 0 };
      const fmt = new Intl.NumberFormat(el.dataset.count || 'en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      el.textContent = pre + fmt.format(0) + post;
      gsap.to(o, { v: to, duration: 2.2, ease: 'expo.out', scrollTrigger: once(el, 'top 85%'), onUpdate: () => { el.textContent = pre + fmt.format(o.v) + post; } });
    });
  }

  /* ---------- scrubbed set pieces ---------- */
  function scenes() {
    // parallax: yPercent -N → N over the parent's pass
    $$('[data-parallax]').forEach(el => { const a = parseFloat(el.dataset.parallax || 10);
      gsap.fromTo(el, { yPercent: -a }, { yPercent: a, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }); });
    // ink-as-you-read
    $$('[data-highlight]').forEach(el => { const w = words(el); w.forEach(x => x.parentElement.style.overflow = 'visible');
      gsap.fromTo(w, { opacity: .14 }, { opacity: 1, ease: 'none', stagger: .1, scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } }); });
    // nanovate: device lies back in 3D and stands up (parent needs perspective; see SKILL.md)
    $$('[data-tilt-in]').forEach(el => gsap.fromTo(el, { rotateX: parseFloat(el.dataset.tiltIn || 50), scale: 1.6, transformOrigin: '50% 0%' },
      { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 15%', scrub: .5 } }));
    // nexapp: mockup swings in from below-side, tilted
    $$('[data-flyin]').forEach(el => { const s = (el.dataset.flyin === 'right') !== rtl() ? 1 : -1;
      gsap.fromTo(el, { x: -100 * s, y: 240, rotate: 7 * s }, { x: 0, y: 0, rotate: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 40%', scrub: .6 } }); });
    // hero exit: copy drifts up and dims while hero scrolls away
    $$('[data-hero-exit]').forEach(el => gsap.to(el, { yPercent: 18, opacity: .25, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top top', end: 'bottom top', scrub: true } }));
    // zoom-through: element flies past the camera at scene end (nanovate scale 4.8)
    $$('[data-zoom-out]').forEach(el => gsap.to(el, { scale: 4.8, opacity: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'center center', end: 'bottom top', scrub: true } }));
    // CTA flood: circle clip grows over the section
    $$('[data-flood]').forEach(el => gsap.fromTo(el, { clipPath: 'circle(4% at 50% 62%)' }, { clipPath: 'circle(78% at 50% 50%)', ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top 75%', end: 'center center', scrub: true } }));
    // rule draws (set width via var(--ln) in CSS)
    $$('[data-rule]').forEach(el => gsap.fromTo(el, { '--ln': 0 }, { '--ln': 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 60%', scrub: true } }));

    const mm = gsap.matchMedia();
    // pinned steps: [data-steps] holds [data-step] rows + [data-screen] views; class .is-on marks the active one
    $$('[data-steps]').forEach(sec => mm.add('(min-width: 0px)', () => {
      const rows = $$('[data-step]', sec), views = $$('[data-screen]', sec), dev = $('[data-device]', sec), n = rows.length, fill = $('[data-steps-bar]', sec);
      let cur = -1;
      const set = i => { if (i === cur) return; cur = i;
        rows.forEach((r, j) => r.classList.toggle('is-on', j === i)); views.forEach((v, j) => v.classList.toggle('is-on', j === i));
        if (dev) gsap.to(dev, { rotateY: (i % 2 ? 9 : -12) * (rtl() ? -1 : 1), rotateZ: i % 2 ? 2 : -3, duration: 1.4, ease: 'expo.out' }); };
      set(0);
      ScrollTrigger.create({ trigger: sec, start: 'top top', end: '+=' + (n * 70) + '%', pin: true,
        onUpdate: s => { set(Math.min(n - 1, Math.floor(s.progress * n))); if (fill) gsap.set(fill, { scaleY: s.progress }); } });
    }));
    // card deck: [data-deck] > [data-card]...; next card slides over, previous ones shrink and shade
    $$('[data-deck]').forEach(sec => mm.add('(min-width: 0px)', () => {
      const cards = $$('[data-card]', sec), cnt = $('[data-deck-count]', sec);
      gsap.set(cards.slice(1), { yPercent: 118, rotate: 5 });
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + (cards.length - 1) * innerHeight * .85,
        pin: true, scrub: .7, onUpdate: s => { if (cnt) cnt.textContent = String(1 + Math.round(s.progress * (cards.length - 1))).padStart(2, '0'); } } });
      cards.forEach((c, i) => { if (!i) return;
        tl.to(c, { yPercent: 0, rotate: 0, duration: 1, ease: 'power2.out' }, i - 1);
        for (let j = 0; j < i; j++) tl.to(cards[j], { scale: 1 - .05 * (i - j), yPercent: -4 * (i - j), filter: 'brightness(' + (1 - Math.min(.6, .22 * (i - j))) + ')', duration: 1 }, i - 1); });
      return () => gsap.set(cards, { clearProps: 'all' });
    }));
    // horizontal pinned gallery, RTL-correct: [data-hscroll] > track > [data-panel]
    $$('[data-hscroll]').forEach(sec => mm.add('(min-width: 0px)', () => {
      const tr = sec.firstElementChild, dist = () => tr.scrollWidth - innerWidth, k = rtl() ? 1 : -1;
      const hs = gsap.to(tr, { x: () => k * dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, invalidateOnRefresh: true } });
      $$('[data-panel]', tr).forEach(p => {
        const img = $('img', p), h = $('h3', p), st = rtl() ? ['right left', 'left right'] : ['left right', 'right left'];
        if (img) gsap.fromTo(img, { xPercent: 6 * k, scale: 1.2 }, { xPercent: -6 * k, scale: 1.2, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: hs, start: st[0], end: st[1], scrub: true } });
        if (h) gsap.from(h, { yPercent: 70, opacity: 0, duration: 1.2, ease: EASE, scrollTrigger: { trigger: p, containerAnimation: hs, start: rtl() ? 'right 75%' : 'left 75%', toggleActions: 'play none none reverse' } });
      });
      return () => gsap.set(tr, { clearProps: 'transform' });
    }));
  }

  /* ---------- hero intro: [data-intro] children play in order on load ---------- */
  function intro() {
    const h = $('[data-intro]'); if (!h) return;
    const tl = gsap.timeline({ defaults: { ease: EASE } });
    $$('[data-intro-title]', h).forEach(t => tl.from(words(t), { yPercent: 115, rotate: UI ? 0 : 5, duration: 1.3, stagger: .07 }, .15));
    tl.from($$('[data-intro-item]', h), { opacity: 0, y: 30, duration: 1.1, stagger: .1 }, .5);
    $$('[data-intro-visual]', h).forEach(v => tl.from(v, UI ? { opacity: 0, y: -200, scale: 1.3, duration: 2.2 } : { opacity: 0, y: 140, rotate: -6, duration: 1.6 }, .3));
  }

  const go = () => { intro(); reveals(); scenes(); ScrollTrigger.sort(); ScrollTrigger.refresh(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  MK.refresh = () => ScrollTrigger.refresh();                          // call after accordions, filters, async content
})();
