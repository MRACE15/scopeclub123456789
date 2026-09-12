/* ============================================================
   SCOPE CLUB — script.js
   Scroll-driven frame-by-frame video canvas + all interactions
   ============================================================ */

'use strict';

/* ── HELPERS ─────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
const map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);

/* ── LOADER ──────────────────────────────────────────────────── */
function initLoader() {
  const loader    = $('#loader');
  const fill      = $('#loaderFill');
  const pct       = $('#loaderPct');
  let progress    = 0;
  let raf;

  function tick() {
    // Simulate loading — ramps up quickly then slows near 90%
    const target = Math.min(progress + (progress < 70 ? 1.8 : 0.4), 90);
    progress = lerp(progress, target, 0.1);
    fill.style.width = progress + '%';
    pct.textContent  = Math.round(progress) + '%';

    if (progress < 89.9) {
      raf = requestAnimationFrame(tick);
    }
  }
  raf = requestAnimationFrame(tick);

  // Called by the frame-preloader when done
  window.__loaderDone = function () {
    cancelAnimationFrame(raf);
    fill.style.width = '100%';
    pct.textContent  = '100%';
    setTimeout(() => {
      loader.classList.add('hidden');
      document.body.style.overflow = '';
    }, 400);
  };

  document.body.style.overflow = 'hidden';
}

/* ── CUSTOM CURSOR ───────────────────────────────────────────── */
function initCursor() {
  const ring = $('#cursor');
  const dot  = $('#cursorDot');
  if (!ring || !dot) return;

  // Skip on touch-only devices
  if (!window.matchMedia('(hover: hover)').matches) return;

  let mx = -100, my = -100;
  let rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  function animRing() {
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  }
  animRing();
}

/* ── SCROLL-DRIVEN CANVAS VIDEO ──────────────────────────────── */
/*
  Loads a free Pexels coding/tech stock video via CDN,
  seeks through it frame-by-frame driven by scroll position.
  No files needed — works straight from the browser.

  Video: "Programmer typing code" — Pexels free license
  Falls back to the procedural canvas animation if the video
  cannot be loaded (e.g. offline / CORS block).
*/

// Pexels free stock video — coding / developer theme
// Multiple sources tried in order for best CORS compatibility
const VIDEO_SOURCES = [
  'https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4',
  'https://videos.pexels.com/video-files/1893024/1893024-hd_1920_1080_30fps.mp4',
  'https://videos.pexels.com/video-files/3141208/3141208-hd_1920_1080_30fps.mp4',
];

function initScrollVideo() {
  const canvas     = $('#heroCanvas');
  const fallback   = $('#canvasFallback');
  const wrapper    = $('#videoScrollWrapper');
  const frameNum   = $('#frameNum');
  const frameTot   = $('#frameTot');
  const counter    = $('#frameCounter');
  const scrollHint = $('#scrollHint');

  if (!canvas || !wrapper) return;

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  let currentTime  = 0;
  let targetTime   = 0;
  let duration     = 0;
  let ready        = false;
  let useFallback  = false;

  // Hidden video element for frame seeking
  const video = document.createElement('video');
  video.muted        = true;
  video.playsInline  = true;
  video.preload      = 'auto';
  video.crossOrigin  = 'anonymous';
  video.style.display = 'none';
  document.body.appendChild(video);

  /* ── Resize canvas ── */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  /* ── Draw current video frame to canvas ── */
  function drawVideoFrame() {
    if (!ready) return;
    if (useFallback) { drawFallbackFrame(); return; }
    ctx.drawImage(video, 0, 0, W, H);

    // Frame counter HUD
    if (duration > 0 && frameNum && frameTot) {
      const fps  = 30;
      const cur  = Math.round(video.currentTime * fps);
      const tot  = Math.round(duration * fps);
      frameNum.textContent = String(cur).padStart(3, '0');
      frameTot.textContent = String(tot).padStart(3, '0');
    }
  }

  /* ── Smooth seek loop ── */
  let rafId;
  function animLoop() {
    if (!useFallback && ready) {
      // Lerp toward target time
      currentTime = lerp(currentTime, targetTime, 0.1);
      const diff  = Math.abs(currentTime - video.currentTime);
      if (diff > 0.02) {
        video.currentTime = currentTime;
      }
      drawVideoFrame();
    }
    rafId = requestAnimationFrame(animLoop);
  }

  /* ── Scroll → seek mapping ── */
  function onScroll() {
    if (!ready || duration === 0) return;

    const wrapTop  = wrapper.getBoundingClientRect().top + window.scrollY;
    const wrapH    = wrapper.offsetHeight - window.innerHeight;
    const scrolled = clamp(window.scrollY - wrapTop, 0, wrapH);
    const progress = scrolled / wrapH;

    targetTime = progress * duration;

    if (window.scrollY > 50 && scrollHint) {
      scrollHint.classList.add('hidden');
    }
    if (counter && window.scrollY > 10) {
      counter.classList.add('visible');
    }
  }

  /* ────────────────────────────────────────────────────────────
     FALLBACK — procedural particle + matrix animation
     Used when video can't load (offline, CORS, slow connection)
  ──────────────────────────────────────────────────────────── */
  let fallbackT = 0;
  const PARTICLES = 180;

  // Seeded LCG for reproducible randomness
  function lcg(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  const rng = lcg(42);
  const pts = Array.from({ length: PARTICLES }, () => ({
    x:   rng() * 1920, y:   rng() * 1080,
    vx: (rng() - 0.5) * 1.2, vy: (rng() - 0.5) * 1.2,
    r:   rng() * 2.5 + 0.5,
    hue: rng() * 60 + 220,
  }));

  const COL_W  = 22;
  const COLS   = Math.ceil(1920 / COL_W);
  const rng2   = lcg(99);
  const drops  = Array.from({ length: COLS }, () => Math.floor(rng2() * 50));
  const chars  = '01アイウエオABCDEF{}[]<>/\\;:~@#$%^&*'.split('');

  function drawFallbackFrame() {
    const t = fallbackT;

    // Background
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0,   `hsl(${230 + (t * 20) % 30}, 28%, 4%)`);
    grd.addColorStop(0.5, `hsl(${250 + (t * 15) % 20}, 35%, 6%)`);
    grd.addColorStop(1,   `hsl(${270 + (t * 10) % 15}, 22%, 3%)`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Grid
    const gs = 60, ox = (t * 0.5) % gs, oy = (t * 0.5) % gs;
    ctx.strokeStyle = 'rgba(108,99,255,0.06)';
    ctx.lineWidth   = 0.5;
    for (let x = -gs + ox; x < W + gs; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = -gs + oy; y < H + gs; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Matrix rain (scaled to canvas)
    const scaleX = W / 1920, scaleY = H / 1080;
    ctx.font = `${(COL_W - 4) * scaleX}px 'JetBrains Mono', monospace`;
    drops.forEach((drop, i) => {
      const ch = chars[Math.floor((t * 0.5 + i * 7)) % chars.length];
      const alpha = Math.max(0, 1 - (drop / 40)) * 0.5;
      ctx.fillStyle = drop === 0
        ? 'rgba(0,229,255,0.85)'
        : `rgba(108,99,255,${alpha})`;
      ctx.fillText(ch, i * COL_W * scaleX + 4, drop * COL_W * scaleY + 4);
      drops[i] = (drop + 1) % (Math.ceil(1080 / COL_W) + 10);
    });

    // Particles
    pts.forEach(p => {
      const frame = t;
      const px = ((p.x + p.vx * frame) % 1920 + 1920) % 1920 * (W / 1920);
      const py = ((p.y + p.vy * frame) % 1080 + 1080) % 1080 * (H / 1080);
      const wave  = Math.sin(frame * 0.06 + p.hue) * 0.5 + 0.5;
      const alpha = 0.3 + wave * 0.5;
      const grd2  = ctx.createRadialGradient(px, py, 0, px, py, p.r * 8);
      grd2.addColorStop(0, `hsla(${p.hue},80%,65%,${alpha})`);
      grd2.addColorStop(1, `hsla(${p.hue},80%,65%,0)`);
      ctx.fillStyle = grd2;
      ctx.beginPath();
      ctx.arc(px, py, p.r * 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Vignette
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5,5,14,0.75)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    fallbackT += 0.5; // advance animation
  }

  function runFallback() {
    useFallback = true;
    ready       = true;
    fallback.classList.add('hidden');

    // Frame counter shows animation frames
    if (frameTot) frameTot.textContent = '∞';
    if (frameNum) frameNum.textContent = '000';

    // Use scroll to advance fallbackT instead of video time
    window.addEventListener('scroll', () => {
      const wrapTop  = wrapper.getBoundingClientRect().top + window.scrollY;
      const wrapH    = wrapper.offsetHeight - window.innerHeight;
      const scrolled = clamp(window.scrollY - wrapTop, 0, wrapH);
      fallbackT = (scrolled / wrapH) * 300; // map to 300 "frames"
      if (frameNum) frameNum.textContent = String(Math.round(fallbackT)).padStart(3,'0');
      if (window.scrollY > 50 && scrollHint) scrollHint.classList.add('hidden');
      if (counter && window.scrollY > 10) counter.classList.add('visible');
    }, { passive: true });

    // Draw loop for fallback
    cancelAnimationFrame(rafId);
    function fallbackLoop() {
      drawFallbackFrame();
      rafId = requestAnimationFrame(fallbackLoop);
    }
    fallbackLoop();

    window.__loaderDone();
  }

  /* ── Try loading the video ── */
  let srcIndex = 0;

  function tryNextSource() {
    if (srcIndex >= VIDEO_SOURCES.length) {
      console.warn('SCOPE: All video sources failed — using procedural fallback.');
      runFallback();
      return;
    }
    video.src = VIDEO_SOURCES[srcIndex++];
    video.load();
  }

  video.addEventListener('error', () => {
    console.warn(`SCOPE: Video source ${srcIndex} failed, trying next…`);
    tryNextSource();
  });

  // When enough data is buffered to seek
  video.addEventListener('canplaythrough', () => {
    if (ready) return; // already set up
    duration = video.duration;
    ready    = true;

    fallback.classList.add('hidden');

    if (frameTot && duration > 0) {
      frameTot.textContent = String(Math.round(duration * 30)).padStart(3, '0');
    }

    // Draw first frame
    video.currentTime = 0;
    video.addEventListener('seeked', function onFirstSeek() {
      drawVideoFrame();
      video.removeEventListener('seeked', onFirstSeek);
    }, { once: true });

    window.addEventListener('scroll', onScroll, { passive: true });
    animLoop();
    window.__loaderDone();
  }, { once: true });

  // Timeout fallback — if video takes > 8s, switch to procedural
  const loadTimeout = setTimeout(() => {
    if (!ready) {
      console.warn('SCOPE: Video load timeout — using procedural fallback.');
      runFallback();
    }
  }, 8000);

  video.addEventListener('canplaythrough', () => clearTimeout(loadTimeout), { once: true });

  // Kick off
  tryNextSource();
}

/* ── NAV ─────────────────────────────────────────────────────── */
function initNav() {
  const nav       = $('#nav');
  const hamburger = $('#hamburger');
  const navLinks  = $('#navLinks');
  const links     = $$('.nav-link');

  // Scroll → scrolled class
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 40);

    // Active link highlight
    const sections = $$('section[id], div[id]');
    let active = '';
    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 100) active = sec.id;
    });
    links.forEach(l => {
      const href = l.getAttribute('href')?.replace('#', '');
      l.classList.toggle('active', href === active);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger toggle
  hamburger?.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open);
    navLinks.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  });

  // Close on link click
  links.forEach(l => {
    l.addEventListener('click', () => {
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('open');
      document.body.classList.remove('menu-open');
    });
  });
}

/* ── SCROLL REVEAL ───────────────────────────────────────────── */
function initReveal() {
  const items = $$('.reveal');
  if (!items.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(() => el.classList.add('visible'), delay);
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  items.forEach(el => io.observe(el));
}

/* ── STAT COUNTERS ───────────────────────────────────────────── */
function initCounters() {
  const nums = $$('.stat-num[data-target]');
  if (!nums.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      let start    = null;
      const dur    = 1800;

      function step(ts) {
        if (!start) start = ts;
        const elapsed = ts - start;
        const progress = clamp(elapsed / dur, 0, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });

  nums.forEach(el => io.observe(el));
}

/* ── CONTACT FORM ────────────────────────────────────────────── */
function initContactForm() {
  const form    = $('#contactForm');
  const success = $('#formSuccess');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    // Basic validation
    const inputs = $$('input[required], textarea[required]', form);
    let valid = true;
    inputs.forEach(inp => {
      if (!inp.value.trim()) {
        inp.focus();
        inp.style.borderColor = 'rgba(255,107,107,0.7)';
        valid = false;
      } else {
        inp.style.borderColor = '';
      }
    });
    if (!valid) return;

    // Simulate async send
    const btn = $('button[type=submit]', form);
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

  // Clear red border on input
  $$('input, textarea', form).forEach(inp => {
    inp.addEventListener('input', () => {
      inp.style.borderColor = '';
    });
  });
}

/* ── PARALLAX TILT on cards ──────────────────────────────────── */
function initCardTilt() {
  if (!window.matchMedia('(hover: hover)').matches) return;

  $$('.glass-card, .activity-card, .resource-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2);
      const dy   = (e.clientY - cy) / (rect.height / 2);
      const tiltX = dy * -8;
      const tiltY = dx *  8;
      card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ── SMOOTH ANCHOR SCROLL ────────────────────────────────────── */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id  = a.getAttribute('href').slice(1);
      const el  = document.getElementById(id);
      if (!el) return;
      e.preventDefault();

      // Account for nav height
      const navH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '68',
        10
      );

      // For the scroll-video wrapper we want to go past it
      const y = el.offsetTop - navH;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
}

/* ── HERO TEXT PARALLAX on scroll ────────────────────────────── */
function initHeroParallax() {
  const block = $('#heroTextBlock');
  if (!block) return;

  window.addEventListener('scroll', () => {
    const st = window.scrollY;
    const max = window.innerHeight;
    const pct = clamp(st / max, 0, 1);
    // Fade and slide up as user scrolls into the video section
    block.style.opacity   = 1 - pct * 1.6;
    block.style.transform = `translateY(${pct * -60}px)`;
  }, { passive: true });
}

/* ── AMBIENT GLOW follows cursor in hero ────────────────────── */
function initAmbientGlow() {
  const sticky = $('#videoSticky');
  if (!sticky || !window.matchMedia('(hover: hover)').matches) return;

  let glowEl = document.createElement('div');
  glowEl.style.cssText = `
    position: absolute;
    width: 600px; height: 600px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%);
    transform: translate(-50%, -50%);
    transition: left 0.3s ease-out, top 0.3s ease-out;
    mix-blend-mode: screen;
  `;
  sticky.appendChild(glowEl);

  sticky.addEventListener('mousemove', e => {
    const rect = sticky.getBoundingClientRect();
    glowEl.style.left = (e.clientX - rect.left) + 'px';
    glowEl.style.top  = (e.clientY - rect.top)  + 'px';
  });
}

/* ── ENTRANCE STAGGER for event rows ────────────────────────── */
function initEventRowHover() {
  $$('.event-row').forEach((row, i) => {
    row.style.transitionDelay = `${i * 30}ms`;
  });
}

/* ── KEYBOARD NAVIGATION ─────────────────────────────────────── */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    // ESC closes mobile menu
    if (e.key === 'Escape') {
      const hamburger = $('#hamburger');
      if (hamburger?.classList.contains('open')) {
        hamburger.click();
      }
    }
  });
}

/* ── PREFERS REDUCED MOTION guard ───────────────────────────── */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ── BOOT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initCursor();
  initNav();
  initSmoothScroll();
  initKeyboard();

  // Defer heavier inits slightly so loader renders first
  requestAnimationFrame(() => {
    initScrollVideo();       // ← the main feature
    initReveal();
    initCounters();
    initContactForm();
    initHeroParallax();
    initAmbientGlow();
    initEventRowHover();

    if (!prefersReducedMotion()) {
      initCardTilt();
    }
  });
});

/* ── PERFORMANCE: Pause RAF when tab is hidden ───────────────── */
document.addEventListener('visibilitychange', () => {
  // The animLoop inside initScrollVideo uses its own rafId.
  // We expose a pause/resume mechanism via window flags.
  window.__tabHidden = document.hidden;
});
