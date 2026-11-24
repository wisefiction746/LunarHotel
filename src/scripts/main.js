import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initNebula } from './nebula.js';

gsap.registerPlugin(ScrollTrigger);

const EC = 'cubic-bezier(0.65, 0, 0.35, 1)';
const ER = 'cubic-bezier(0.83, 0, 0.17, 1)';

// ─── Lenis ───────────────────────────────────────────────────────
const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });

let nebula = null;

lenis.on('scroll', ({ scroll, limit }) => {
  ScrollTrigger.update();
  if (nebula) nebula.setScroll(limit > 0 ? scroll / limit : 0);
});

gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const el = document.querySelector(a.getAttribute('href'));
    if (el) lenis.scrollTo(el, { offset: -80, duration: 1.8 });
  });
});

// ─── Custom cursor ───────────────────────────────────────────────
const cursor    = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');
let tmx = -200, tmy = -200, cx = -200, cy = -200;

document.addEventListener('mousemove', (e) => {
  tmx = e.clientX; tmy = e.clientY;
  gsap.to(cursorDot, { x: tmx, y: tmy, duration: 0.06, ease: 'none' });
});

gsap.ticker.add(() => {
  cx += (tmx - cx) * 0.15;
  cy += (tmy - cy) * 0.15;
  gsap.set(cursor, { x: cx, y: cy });
});

document.querySelectorAll('a, button, .residence-panel, input, select').forEach((el) => {
  el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

// ─── Film grain ──────────────────────────────────────────────────
function initGrain() {
  const canvas = document.getElementById('grain-canvas');
  if (!canvas) return;
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(256, 256);
  let last = 0;

  (function draw(ts) {
    requestAnimationFrame(draw);
    if (ts - last < 42) return; // ~24fps — cinema rate
    last = ts;
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = g;
      d[i + 3] = (Math.random() * 22) | 0;
    }
    ctx.putImageData(img, 0, 0);
  })(0);
}

// ─── Cursor-reactive starfield ───────────────────────────────────
let starMouseX = -999, starMouseY = -999;
document.addEventListener('mousemove', (e) => {
  starMouseX = e.clientX; starMouseY = e.clientY;
});

function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const resize = () => {
    canvas.width = innerWidth; canvas.height = innerHeight;
  };
  resize();
  addEventListener('resize', resize);

  const stars = Array.from({ length: 220 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    ox: 0, oy: 0,      // current position offset from origin
    r:  Math.random() * 1.1 + 0.15,
    o:  Math.random() * 0.50 + 0.08,
    s:  Math.random() * 0.14 + 0.025,
    t:  Math.random() * Math.PI * 2,
  }));

  const R = 160; // cursor influence radius

  (function draw() {
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stars.forEach((s) => {
      s.t += 0.008;

      // Cursor gravity
      const dx = starMouseX - (s.x + s.ox);
      const dy = starMouseY - (s.y + s.oy);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < R && dist > 0) {
        const f = (1 - dist / R) * 0.018;
        s.ox += dx * f;
        s.oy += dy * f;
      }
      // Drift ox/oy back toward 0
      s.ox *= 0.97;
      s.oy *= 0.97;

      const brightBoost = dist < R ? (1 - dist / R) * 0.45 : 0;
      const alpha = Math.min(1, s.o * (0.7 + 0.3 * Math.sin(s.t)) + brightBoost);

      ctx.beginPath();
      ctx.arc(s.x + s.ox, s.y + s.oy, s.r * (1 + brightBoost), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(244,237,224,${alpha})`;
      ctx.fill();

      // Natural slow drift
      s.x -= s.s * 0.38;
      s.y -= s.s * 0.11;
      if (s.x < -10) s.x = canvas.width + 10;
      if (s.y < -10) s.y = canvas.height + 10;
    });
  })();
}

// ─── Lunar Time widget ───────────────────────────────────────────
function initLunarTime() {
  const el = document.getElementById('lunar-time');
  if (!el) return;

  const REF_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
  const SYNODIC_MS   = 29.53059 * 86400000;
  const LON_OFFSET   = 23.47 / 360; // Mare Tranquillitatis longitude → fraction of day

  function update() {
    const elapsed  = Date.now() - REF_NEW_MOON;
    const ageDays  = ((elapsed % SYNODIC_MS) + SYNODIC_MS) % SYNODIC_MS / 86400000;
    const phaseFrac = ageDays / 29.53059;

    // Lunar "local hour" at the landing site
    const lunarHour = ((phaseFrac + LON_OFFSET) * 24) % 24;
    const h = String(Math.floor(lunarHour)).padStart(2, '0');
    const m = String(Math.floor((lunarHour % 1) * 60)).padStart(2, '0');

    // Surface temperature: +127°C midday, -173°C midnight (very rough model)
    const isDay = phaseFrac > 0.05 && phaseFrac < 0.48;
    const temp  = isDay
      ? '+' + Math.round(80 + Math.sin(phaseFrac * Math.PI / 0.43) * 47) + '°C'
      : '−' + Math.round(155 + Math.random() * 18) + '°C';

    const sol = Math.floor(ageDays * 2);

    el.innerHTML =
      `<span class="lt-loc">Mare Tranquillitatis</span>` +
      `<span class="lt-sep">·</span>` +
      `<span class="lt-time">${h}:${m} LST</span>` +
      `<span class="lt-sep">·</span>` +
      `<span class="lt-temp">${temp}</span>` +
      `<span class="lt-sep">·</span>` +
      `<span class="lt-sol">Sol ${sol}</span>`;
  }

  update();
  setInterval(update, 60000);
}

// ─── Guests counter ──────────────────────────────────────────────
function initGuestsCounter() {
  const resEl     = document.getElementById('guests-res');
  const transitEl = document.getElementById('guests-transit');
  if (!resEl || !transitEl) return;

  let res     = 3 + Math.floor(Math.random() * 4);
  let transit = 8 + Math.floor(Math.random() * 8);

  function update() {
    resEl.textContent     = res;
    transitEl.textContent = transit;
  }

  update();
  setInterval(() => {
    if (Math.random() < 0.35) res     = Math.max(1, Math.min(8,  res     + (Math.random() > 0.5 ? 1 : -1)));
    if (Math.random() < 0.35) transit = Math.max(4, Math.min(20, transit + (Math.random() > 0.5 ? 1 : -1)));
    update();
  }, 9000 + Math.random() * 8000);
}

// ─── Easter egg — sovereign residence ────────────────────────────
function initEasterEgg() {
  const logo = document.querySelector('.nav-logo');
  const overlay = document.getElementById('sovereign-overlay');
  const close   = document.getElementById('sovereign-close');
  if (!logo || !overlay) return;

  let holdTimer = null;

  logo.addEventListener('mousedown', () => {
    holdTimer = setTimeout(() => {
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('active');
      gsap.timeline()
        .set(overlay, { opacity: 0 })
        .to(overlay,  { opacity: 1, duration: 1.4, ease: 'power2.inOut' })
        .from('.sovereign-inner > *', {
          y: 30, opacity: 0, stagger: 0.12, duration: 1.0, ease: EC,
        }, '-=0.6');
    }, 3000);
  });

  ['mouseup', 'mouseleave'].forEach((ev) => {
    logo.addEventListener(ev, () => clearTimeout(holdTimer));
  });

  close?.addEventListener('click', () => {
    gsap.to(overlay, {
      opacity: 0, duration: 0.8, ease: EC,
      onComplete: () => {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
      },
    });
  });
}

// ─── Intro sequence ──────────────────────────────────────────────
function prepareHero() {
  const el = document.getElementById('hero-selene');
  if (!el) return;
  el.innerHTML = '';
  [...'SELENE'].forEach((ch) => {
    const s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch;
    el.appendChild(s);
  });
}

function playIntro() {
  const overlay  = document.getElementById('intro-overlay');
  const orb      = document.getElementById('intro-orb');
  const text     = document.getElementById('intro-text');
  const iRule    = document.getElementById('intro-rule');
  const nav      = document.getElementById('site-nav');
  const chars    = document.querySelectorAll('#hero-selene .char');
  const hRule    = document.getElementById('hero-rule');
  const grand    = document.getElementById('hero-grand');
  const tagline  = document.getElementById('hero-tagline');
  const hint     = document.getElementById('scroll-hint');
  const content  = document.getElementById('hero-content');

  gsap.set([nav, content], { opacity: 0 });
  gsap.set(chars,    { opacity: 0, y: 16, filter: 'blur(9px)' });
  gsap.set(hRule,    { width: 0 });
  gsap.set([grand, tagline, hint], { opacity: 0 });

  gsap.timeline({ onComplete: initScrollAnimations })
    // Orb expands from dot → circle
    .to(orb, {
      width: 96, height: 96,
      background: 'transparent',
      boxShadow: '0 0 0 1px rgba(244,237,224,0.18), 0 0 60px 0 rgba(139,45,92,0.12)',
      duration: 0.9, ease: 'power3.out',
    })
    // Wordmark materialises beneath orb
    .to(text, { opacity: 1, duration: 1.2, ease: 'power2.inOut' }, '-=0.2')
    // Brass rule draws in
    .to(iRule, { width: '36%', duration: 0.8, ease: ER }, '-=0.6')
    // Hold
    .to({}, { duration: 0.5 })
    // Overlay dissolves
    .to(overlay, { opacity: 0, duration: 1.1, ease: 'power2.inOut' })
    .set(overlay, { display: 'none' })
    // Nav
    .to(nav,    { opacity: 1, duration: 0.9, ease: EC }, '-=0.5')
    .to(content,{ opacity: 1, duration: 0.7, ease: EC }, '-=0.8')
    // Letters blur-to-focus
    .to(chars,  { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.052, duration: 0.9, ease: 'power3.out' }, '-=0.5')
    .to(hRule,  { width: '3rem', duration: 0.75, ease: ER }, '-=0.3')
    .to(grand,  { opacity: 1, duration: 0.7, ease: EC },    '-=0.45')
    .to(tagline,{ opacity: 1, duration: 0.8, ease: EC },    '-=0.3')
    .to(hint,   { opacity: 1, duration: 0.6, ease: 'power2.out' }, '+=0.5');
}

// ─── Mouse parallax ──────────────────────────────────────────────
let normX = 0, normY = 0, smX = 0, smY = 0;
document.addEventListener('mousemove', (e) => {
  normX = (e.clientX / innerWidth  - 0.5) * 2;
  normY = (e.clientY / innerHeight - 0.5) * 2;
});
gsap.ticker.add(() => {
  smX += (normX - smX) * 0.045;
  smY += (normY - smY) * 0.045;
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const s = parseFloat(el.dataset.parallax);
    gsap.set(el, { x: smX * s, y: smY * (s * 0.55) });
  });
});

// ─── Manifesto word-by-word ───────────────────────────────────────
function initManifesto() {
  const el = document.getElementById('manifesto-text');
  if (!el) return;

  const drop = el.querySelector('.manifesto-drop');

  // Collect text from non-drop-cap nodes to avoid merging the drop cap letter
  let rawText = '';
  el.childNodes.forEach((node) => {
    if (node === drop) return;
    if (node.nodeType === Node.TEXT_NODE) rawText += node.textContent;
  });
  rawText = rawText.replace(/\s+/g, ' ').trim();

  el.innerHTML = '';
  if (drop) el.appendChild(drop);

  rawText.split(' ').filter(Boolean).forEach((w, i) => {
    if (i > 0) el.appendChild(document.createTextNode(' '));
    const span = document.createElement('span');
    span.className = 'word';
    span.innerHTML = `<span class="word-inner">${w}</span>`;
    el.appendChild(span);
  });

  ScrollTrigger.create({
    trigger: el, start: 'top 78%',
    onEnter: () => {
      gsap.to(el.querySelectorAll('.word-inner'), {
        y: 0, opacity: 1,
        stagger: 0.028, duration: 0.72, ease: 'power3.out',
      });
    },
    once: true,
  });
}

// ─── Color-grade image reveals ────────────────────────────────────
function initColorGrade() {
  document.querySelectorAll('.grade-on-enter').forEach((img) => {
    gsap.set(img, { filter: 'saturate(0.08) brightness(0.65)' });
    ScrollTrigger.create({
      trigger: img, start: 'top 82%',
      onEnter: () => gsap.to(img, {
        filter: 'saturate(1) brightness(1)',
        duration: 1.4, ease: 'power2.inOut',
      }),
      once: true,
    });
  });
}

// ─── Generic reveals ─────────────────────────────────────────────
function initReveal() {
  document.querySelectorAll('.reveal').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 87%',
      onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: EC }),
      once: true,
    });
  });
}

function initClipReveal() {
  document.querySelectorAll('.reveal-clip').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 84%',
      onEnter: () => gsap.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: ER }),
      once: true,
    });
  });
}

// ─── Viewport-pinned headline ─────────────────────────────────────
function initPinnedHeadlines() {
  document.querySelectorAll('.pin-to-viewport').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: '+=280',
      pin: true,
      pinSpacing: true,
    });
  });
}

// ─── Hero zoom on scroll ─────────────────────────────────────────
function initHeroZoom() {
  gsap.to('#hero-bg', {
    scale: 1.13, y: '-5%', ease: 'none',
    scrollTrigger: {
      trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true,
    },
  });
}

// ─── Letterbox on hero ────────────────────────────────────────────
function initLetterbox() {
  const top = document.querySelector('.letterbox-top');
  const bot = document.querySelector('.letterbox-bot');
  if (!top || !bot) return;

  gsap.to([top, bot], {
    scaleY: 1, ease: 'none',
    scrollTrigger: {
      trigger: '#hero', start: 'top top', end: 'bottom top',
      scrub: 1.2,
    },
  });
}

// ─── Restaurant parallax ─────────────────────────────────────────
function initRestaurantParallax() {
  gsap.to('#restaurant-parallax', {
    yPercent: -14, ease: 'none',
    scrollTrigger: {
      trigger: '#restaurant', start: 'top bottom', end: 'bottom top', scrub: true,
    },
  });
}

// ─── Residences horizontal + depth parallax ──────────────────────
function initResidences() {
  const track = document.getElementById('residences-track');
  const fill  = document.getElementById('residences-progress-fill');
  if (!track) return;

  const getTravel = () =>
    track.scrollWidth - track.closest('.residences-viewport').offsetWidth;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    const mainTween = gsap.to(track, {
      x: () => -getTravel(), ease: 'none',
      scrollTrigger: {
        trigger: '#residences', start: 'top top',
        end: () => '+=' + (getTravel() + innerHeight * 0.25),
        pin: true, scrub: 1.5, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (s) => { if (fill) fill.style.width = (s.progress * 100) + '%'; },
      },
    });

    // Background image parallaxes at different rate than panel — creates depth
    document.querySelectorAll('.residence-panel').forEach((panel) => {
      const bg = panel.querySelector('.residence-bg');
      gsap.fromTo(bg,
        { xPercent: -7 },
        {
          xPercent: 7, ease: 'none',
          scrollTrigger: {
            containerAnimation: mainTween,
            trigger: panel, start: 'left right', end: 'right left', scrub: true,
          },
        }
      );
    });

    return () => mainTween.scrollTrigger?.kill();
  });
}

// ─── Journey stagger ─────────────────────────────────────────────
function initJourney() {
  const steps = document.querySelectorAll('.journey-step');
  if (!steps.length) return;
  ScrollTrigger.create({
    trigger: '#journey .journey-track', start: 'top 80%',
    onEnter: () => gsap.to(steps, {
      opacity: 1, y: 0, stagger: 0.11, duration: 1.0, ease: EC,
    }),
    once: true,
  });
}

// ─── Press section ────────────────────────────────────────────────
function initPress() {
  document.querySelectorAll('.press-item').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, y: 40, duration: 1.1, ease: EC, delay: i * 0.15,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
}

// ─── Nav scroll state ────────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;
  ScrollTrigger.create({
    start: 'top -90',
    onUpdate: (s) => {
      const scrolled = s.progress > 0;
      nav.style.background     = scrolled ? 'rgba(10,10,15,0.88)' : 'transparent';
      nav.style.backdropFilter = scrolled ? 'blur(18px)' : 'none';
      nav.style.transition     = 'background 1s ease, backdrop-filter 1s ease';
    },
  });
}

// ─── Form ────────────────────────────────────────────────────────
function initForm() {
  const form = document.getElementById('res-form');
  const conf = document.getElementById('res-confirmation');
  if (!form || !conf) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    gsap.timeline()
      .to(form, {
        opacity: 0, y: -14, duration: 0.7, ease: EC,
        onComplete: () => { form.style.display = 'none'; },
      })
      .call(() => conf.classList.add('visible'))
      .from(conf, { opacity: 0, y: 24, duration: 1.0, ease: EC });
  });
}

// ─── Boot ────────────────────────────────────────────────────────
function initScrollAnimations() {
  initHeroZoom();
  initLetterbox();
  initRestaurantParallax();
  initManifesto();
  initColorGrade();
  initReveal();
  initClipReveal();
  initPinnedHeadlines();
  initResidences();
  initJourney();
  initPress();
  initNav();
  initForm();
  initLunarTime();
  initGuestsCounter();
  initEasterEgg();
  ScrollTrigger.refresh();
}

document.documentElement.style.overflow = 'hidden';

window.addEventListener('DOMContentLoaded', () => {
  nebula = initNebula();
  prepareHero();
  initStarfield();
  initGrain();

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.style.overflow = '';
    playIntro();
  }));
});
