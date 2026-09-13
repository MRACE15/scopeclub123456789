/* ============================================================
   SCOPE CLUB — script.js
   scroll-world scrub engine wired with canvas-generated scene
   stills + all page interactions.
   ============================================================ */
'use strict';

/* ── HELPERS ─────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp  = (a, b, t) => a + (b - a) * t;

/* ── CANVAS SCENE GENERATOR ──────────────────────────────────── */
/*
  Generates 6 unique 1920×1080 scene "stills" as data-URLs using
  an OffscreenCanvas. Each scene represents one beat of the SCOPE
  Club journey — matching the sections the scrub engine will show.
  Because we have no paid AI video, the scrub engine will display
  these stills with a gentle CSS scale parallax (reduced-motion
  keeps them totally static). Each scene has its own colour mood
  that feeds into the engine's per-section `accent` token.
*/

const SCENES = [
  {
    id: 'hero',
    label: 'Home',
    eyebrow: '✦ Student Community',
    title: 'We Build.\nWe Ship.\nWe Grow.',
    body: 'SCOPE Club — where students become engineers.',
    accent: '#3d6fff',
    mood: { bg: [5, 6, 20], primary: [61, 111, 255], secondary: [0, 212, 255] },
    cta: { primary: { label: 'Explore SCOPE', href: '#about' }, secondary: { label: 'Join Us', href: '#contact' } },
  },
  {
    id: 'hackathons',
    label: 'Hackathons',
    eyebrow: 'Activity 01',
    title: 'Build in\n48 Hours.',
    body: 'Real problems. Real mentors. Real prizes.',
    accent: '#7b5fff',
    mood: { bg: [8, 4, 22], primary: [123, 95, 255], secondary: [200, 120, 255] },
    tags: ['Team Sprints', 'Industry Mentors', 'Cash Prizes'],
  },
  {
    id: 'contests',
    label: 'Contests',
    eyebrow: 'Activity 02',
    title: 'Sharpen\nYour Edge.',
    body: 'LeetCode, Codeforces, and intra-club weekly challenges.',
    accent: '#00bfff',
    mood: { bg: [2, 10, 22], primary: [0, 191, 255], secondary: [0, 255, 180] },
    tags: ['Weekly Challenges', 'Leaderboards', 'Interview Prep'],
  },
  {
    id: 'projects',
    label: 'Projects',
    eyebrow: 'Activity 03',
    title: 'Ship Real\nProjects.',
    body: 'Mentored tracks across web, AI/ML, mobile, and cloud.',
    accent: '#00e5a0',
    mood: { bg: [2, 14, 10], primary: [0, 229, 160], secondary: [0, 200, 255] },
    tags: ['Mentored Tracks', 'GitHub Collab', 'Semester Showcase'],
  },
  {
    id: 'workshops',
    label: 'Workshops',
    eyebrow: 'Activity 04',
    title: 'Learn from\nExperts.',
    body: 'AWS, React, Python, ML — live, hands-on, free.',
    accent: '#ff9f3d',
    mood: { bg: [16, 8, 2], primary: [255, 159, 61], secondary: [255, 220, 80] },
    tags: ['Expert-Led', 'Live Coding', 'Free Resources'],
  },
  {
    id: 'join',
    label: 'Join',
    eyebrow: 'Your Turn',
    title: 'Ready to\nJoin SCOPE?',
    body: 'Code. Create. Collaborate. Be part of the next generation.',
    accent: '#3d6fff',
    mood: { bg: [5, 6, 20], primary: [61, 111, 255], secondary: [0, 212, 255] },
    cta: { primary: { label: 'Join the Club', href: '#contact' }, secondary: { label: 'Our Events', href: '#events' } },
  },
];

/* Seeded LCG — reproducible random per scene */
function makeLCG(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function generateSceneDataURL(scene) {
  const W = 1920, H = 1080;
  const off = new OffscreenCanvas(W, H);
  const c   = off.getContext('2d');
  const rng = makeLCG(scene.id.charCodeAt(0) * 97 + 31);
  const { bg, primary, secondary } = scene.mood;

  /* Background */
  c.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  c.fillRect(0, 0, W, H);

  /* Radial atmosphere */
  const atm = c.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.45, 700);
  atm.addColorStop(0,   `rgba(${primary[0]},${primary[1]},${primary[2]},0.18)`);
  atm.addColorStop(0.5, `rgba(${secondary[0]},${secondary[1]},${secondary[2]},0.06)`);
  atm.addColorStop(1,   'rgba(0,0,0,0)');
  c.fillStyle = atm;
  c.fillRect(0, 0, W, H);

  /* Animated grid */
  c.strokeStyle = `rgba(${primary[0]},${primary[1]},${primary[2]},0.07)`;
  c.lineWidth = 0.8;
  const gs = 72;
  for (let x = 0; x < W + gs; x += gs) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H + gs; y += gs) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

  /* Matrix rain */
  const chars = '01ABCDEFアイウエオ{}[]<>/\\'.split('');
  const colW  = 26;
  const cols  = Math.ceil(W / colW);
  c.font = `${colW - 6}px 'JetBrains Mono', monospace`;
  for (let i = 0; i < cols; i++) {
    const drop  = Math.floor(rng() * (H / colW));
    const alpha = rng() * 0.4 + 0.05;
    const ch    = chars[Math.floor(rng() * chars.length)];
    c.fillStyle = rng() < 0.04
      ? `rgba(${secondary[0]},${secondary[1]},${secondary[2]},0.85)`
      : `rgba(${primary[0]},${primary[1]},${primary[2]},${alpha})`;
    c.fillText(ch, i * colW + 4, drop * colW + 4);
  }

  /* Floating particles */
  const N = 140;
  for (let i = 0; i < N; i++) {
    const px    = rng() * W;
    const py    = rng() * H;
    const pr    = rng() * 2.5 + 0.5;
    const wave  = rng();
    const alpha = 0.25 + wave * 0.5;
    const hue   = rng() < 0.5 ? primary : secondary;
    const grd   = c.createRadialGradient(px, py, 0, px, py, pr * 9);
    grd.addColorStop(0, `rgba(${hue[0]},${hue[1]},${hue[2]},${alpha})`);
    grd.addColorStop(1, `rgba(${hue[0]},${hue[1]},${hue[2]},0)`);
    c.fillStyle = grd;
    c.beginPath();
    c.arc(px, py, pr * 9, 0, Math.PI * 2);
    c.fill();
    /* Core dot */
    c.fillStyle = `rgba(${hue[0]},${hue[1]},${hue[2]},${alpha * 1.4})`;
    c.beginPath();
    c.arc(px, py, pr, 0, Math.PI * 2);
    c.fill();
  }

  /* Connection lines between close particles (subsample for speed) */
  const pts = Array.from({ length: 60 }, () => [rng() * W, rng() * H]);
  const maxD = 160;
  for (let a = 0; a < pts.length; a++) {
    for (let b = a + 1; b < pts.length; b++) {
      const d = Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);
      if (d < maxD) {
        const alpha = (1 - d / maxD) * 0.14;
        c.strokeStyle = `rgba(${primary[0]},${primary[1]},${primary[2]},${alpha})`;
        c.lineWidth   = 0.7;
        c.beginPath();
        c.moveTo(pts[a][0], pts[a][1]);
        c.lineTo(pts[b][0], pts[b][1]);
        c.stroke();
      }
    }
  }

  /* Vignette */
  const vig = c.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, H * 0.82);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(${bg[0]},${bg[1]},${bg[2]},0.72)`);
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);

  return off.transferToImageBitmap();
}

/* Convert ImageBitmap → data URL via a temp canvas */
function bitmapToDataURL(bmp) {
  const tmp = document.createElement('canvas');
  tmp.width  = bmp.width;
  tmp.height = bmp.height;
  tmp.getContext('2d').drawImage(bmp, 0, 0);
  return tmp.toDataURL('image/jpeg', 0.88);
}

/* Generate all scenes, update loader progress, return data-URL array */
function buildSceneStills(onProgress) {
  const urls = [];
  for (let i = 0; i < SCENES.length; i++) {
    const bmp = generateSceneDataURL(SCENES[i]);
    urls.push(bitmapToDataURL(bmp));
    bmp.close();
    onProgress(Math.round(((i + 1) / SCENES.length) * 90));
  }
  return urls;
}

/* ── LOADER ──────────────────────────────────────────────────── */
function initLoader() {
  const loader = $('#loader');
  const label  = $('#loaderLabel');
  if (!loader) return;

  document.body.classList.add('no-scroll');

  window.__setLoaderPct = (pct) => {
    if (label) label.textContent = pct + '%';
  };

  window.__loaderDone = () => {
    if (label) label.textContent = '100%';
    setTimeout(() => {
      loader.classList.add('gone');
      document.body.classList.remove('no-scroll');
    }, 350);
  };
}

/* ── MOUNT SCROLL WORLD ──────────────────────────────────────── */
function initScrollWorld(stills) {
  const container = $('#world');
  if (!container || typeof mountScrollWorld !== 'function') {
    console.warn('SCOPE: mountScrollWorld not available — check scrub-engine.js loaded.');
    window.__loaderDone?.();
    return;
  }

  /* Build section configs for the engine */
  const sections = SCENES.map((scene, i) => ({
    id:      scene.id,
    label:   scene.label,
    still:   stills[i],
    accent:  scene.accent,
    eyebrow: scene.eyebrow,
    title:   scene.title,
    body:    scene.body,
    tags:    scene.tags || [],
    scroll:  scene.id === 'hero' ? 1.6 : 1.3,
    linger:  scene.id === 'hero' ? 0   : 0.3,
    ...(scene.cta ? { cta: scene.cta } : {}),
  }));

  mountScrollWorld(container, {
    brand:      { name: '<SCOPE/>', href: '#world' },
    hint:       'scroll to explore',
    nav:        true,
    atmosphere: true,
    diveScroll: 1.3,
    connScroll: 0.0,   /* no connector clips — sections flow directly */
    crossfade:  0.18,
    sections,
    connectors: [],    /* no AI-generated video connectors */
  });

  window.__loaderDone?.();
}

/* ── SCROLL REVEAL ───────────────────────────────────────────── */
function initReveal() {
  const els = $$('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(() => el.classList.add('visible'), delay);
      io.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });

  els.forEach(el => io.observe(el));
}

/* ── STAT COUNTERS ───────────────────────────────────────────── */
function initCounters() {
  const nums = $$('.stat-n[data-target]');
  if (!nums.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      let start    = null;
      const dur    = 1600;

      function step(ts) {
        if (!start) start = ts;
        const p = clamp((ts - start) / dur);
        /* ease-out cubic */
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });

  nums.forEach(el => io.observe(el));
}

/* ── CARD TILT ───────────────────────────────────────────────── */
function initTilt() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  const cards = $$('.trio-card, .act-item, .res-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      card.style.transform = `perspective(700px) rotateX(${dy * -7}deg) rotateY(${dx * 7}deg) translateY(-3px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* ── CONTACT FORM ────────────────────────────────────────────── */
function initContactForm() {
  const form    = $('#contactForm');
  const success = $('#cfSuccess');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const required = $$('[required]', form);
    let valid = true;
    required.forEach(inp => {
      if (!inp.value.trim()) {
        inp.style.borderColor = 'rgba(255,80,80,0.7)';
        if (valid) inp.focus();
        valid = false;
      }
    });
    if (!valid) return;

    const btn = $('[type=submit]', form);
    btn.textContent = 'Sending…';
    btn.disabled    = true;

    setTimeout(() => {
      form.reset();
      btn.textContent = 'Send Message';
      btn.disabled    = false;
      success.classList.add('show');
      setTimeout(() => success.classList.remove('show'), 5000);
    }, 1200);
  });

  $$('input, textarea', form).forEach(inp => {
    inp.addEventListener('input', () => { inp.style.borderColor = ''; });
  });
}

/* ── SMOOTH ANCHOR SCROLL ────────────────────────────────────── */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ── KEYBOARD ────────────────────────────────────────────────── */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      /* nothing to close on this layout — placeholder for future modals */
    }
  });
}

/* ── BOOT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initSmoothScroll();
  initKeyboard();

  /* Use rAF so the loader paints before we run heavy canvas work */
  requestAnimationFrame(() => {
    /* Generate all 6 scene stills */
    const stills = buildSceneStills(pct => {
      window.__setLoaderPct?.(pct);
    });
    window.__setLoaderPct?.(95);

    /* Mount the scroll-world scrub engine */
    initScrollWorld(stills);

    /* Wire the rest of the page */
    initReveal();
    initCounters();
    initContactForm();

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      initTilt();
    }
  });
});

/* ── COPY scrub-engine.js FROM SKILL IF MISSING ──────────────── */
/*
  scrub-engine.js is loaded as a separate <script> tag in index.html.
  If you're running the site without copying that file, the engine
  gracefully degrades — the #world div stays empty and the loader
  completes, so the rest of the page still works.
*/
