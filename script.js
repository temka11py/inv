/* =========================================================
   Чамд зориулсан урилга — script.js

   1. Helpers
   2. Painted flowers (small SVG generator)
   3. Drifting petals, sparkles and butterflies
   4. Scene transitions
   5. The runaway "Үгүй" button
   6. Celebration
   7. Start
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 1. Helpers ---------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const f = (n) => n.toFixed(1);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  /** Seeded random numbers, so each painted flower looks the same on every visit. */
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 2. Painted flowers ----------
     Every flower is built from the same petal shape. Each petal gets a
     watercolor fill plus a separately-jittered pencil outline, so paint and
     line never match perfectly — the way they don't on a real hand-made card. */

  /** A petal (or leaf) path: base at 0,0, tip pointing up, with a little wobble. */
  function petalPath(length, width, r, wobble) {
    const j = () => (r() - 0.5) * wobble;
    return (
      `M0 0C${f(-width * 0.95 + j())} ${f(-length * 0.22 + j())} ${f(-width * 1.05 + j())} ${f(-length * 0.86 + j())} ${f(j())} ${f(-length + j())}` +
      `C${f(width * 1.05 + j())} ${f(-length * 0.86 + j())} ${f(width * 0.95 + j())} ${f(-length * 0.22 + j())} 0 0Z`
    );
  }

  /** One flower head centred on 0,0. `delay` (seconds) is when it starts to open. */
  function flowerHead({ radius, tone = 'rose', seed = 1, delay = 0 }) {
    const r = seeded(seed);
    const big = radius >= 40;
    // Outer ring first (it sits underneath and opens first), then inwards.
    const rings = big
      ? [
          { count: 8, length: radius, width: radius * 0.4, fill: tone, turn: 0 },
          { count: 7, length: radius * 0.72, width: radius * 0.34, fill: 'blush', turn: 22 },
          { count: 5, length: radius * 0.46, width: radius * 0.26, fill: tone, turn: 8 },
        ]
      : [
          { count: 7, length: radius, width: radius * 0.42, fill: tone, turn: 0 },
          { count: 5, length: radius * 0.6, width: radius * 0.32, fill: 'blush', turn: 26 },
        ];

    let svg = '';
    rings.forEach((ring, ringIndex) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = ring.turn + (i * 360) / ring.count + (r() - 0.5) * 10;
        const length = ring.length * (0.92 + r() * 0.16);
        const opensAt = delay + ringIndex * 0.38 + i * 0.07;
        svg +=
          `<g transform="rotate(${f(angle)})"><g class="petal" style="--d:${opensAt.toFixed(2)}s">` +
          `<path d="${petalPath(length, ring.width, r, radius * 0.05)}" fill="url(#wc-${ring.fill})"/>` +
          `<path class="pencil" d="${petalPath(length, ring.width, r, radius * 0.08)}"/>` +
          `<path class="pencil pencil--vein" d="M0 ${f(-length * 0.14)}Q${f((r() - 0.5) * ring.width * 0.5)} ${f(-length * 0.5)} ${f((r() - 0.5) * 4)} ${f(-length * 0.8)}"/>` +
          `</g></g>`;
      }
    });

    // Centre: an ochre dab, a pencil ring and a few stamen dots.
    let stamens = '';
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * radius * 0.11;
      stamens += `<circle class="stamen" cx="${f(Math.cos(a) * d)}" cy="${f(Math.sin(a) * d)}" r="${f(radius * 0.016 + r() * radius * 0.012)}"/>`;
    }
    const eyeAt = delay + rings.length * 0.38 + 0.3;
    svg +=
      `<g class="flower-eye" style="--d:${eyeAt.toFixed(2)}s">` +
      `<circle r="${f(radius * 0.17)}" fill="url(#wc-ochre)"/>` +
      `<circle class="pencil" r="${f(radius * 0.185)}" cx="${f((r() - 0.5) * 2)}" cy="${f((r() - 0.5) * 2)}"/>` +
      stamens +
      `</g>`;
    return svg;
  }

  /** A leaf growing from (x, y) in the direction `angle` (0 = straight up). */
  function leaf(r, x, y, angle, length, delay) {
    return (
      `<g transform="translate(${x} ${y}) rotate(${angle})"><g class="leaf" style="--d:${delay.toFixed(2)}s">` +
      `<path d="${petalPath(length, length * 0.3, r, 3)}" fill="url(#wc-sage)"/>` +
      `<path class="pencil" d="${petalPath(length, length * 0.3, r, 4)}"/>` +
      `<path class="pencil pencil--vein" d="M0 0L${f((r() - 0.5) * 3)} ${f(-length * 0.86)}"/>` +
      `</g></g>`
    );
  }

  /** Page 1: seed → stem → leaves → bloom → sparkles. viewBox 0 0 300 400. */
  function paintIntroFlower(svg) {
    const r = seeded(11);
    const sparkles = [
      [34, 64, 16, 4.3], [258, 92, 13, 4.7], [66, 214, 11, 5.0],
      [236, 226, 15, 4.5], [143, 14, 12, 4.9], [270, 168, 9, 5.3],
    ]
      .map(([x, y, size, at]) => `<use href="#i-star" class="twinkle" x="${x}" y="${y}" width="${size}" height="${size}" style="--d:${at}s"/>`)
      .join('');

    svg.innerHTML =
      `<path class="pencil ground" d="M84 389c22-5 40 3 62-1s44-4 70 1"/>` +
      `<ellipse class="seed" cx="150" cy="386" rx="7" ry="4.6" transform="rotate(-18 150 386)"/>` +
      `<g class="plant">` +
      `<path class="stem stem--paint" pathLength="1" d="M150 386C141 330 164 268 152 176"/>` +
      `<path class="stem stem--pencil" pathLength="1" d="M151 386C143 331 165 270 153 178"/>` +
      leaf(r, 147, 318, -62, 56, 1.8) +
      leaf(r, 156, 262, 58, 48, 2.15) +
      `<g transform="translate(152 150)">${flowerHead({ radius: 92, tone: 'rose', seed: 7, delay: 2.5 })}</g>` +
      `</g>` +
      sparkles;
  }

  /** Page 2: a bouquet across the top of the card. viewBox 0 0 320 150. */
  function paintCardFlower(svg) {
    const r = seeded(21);
    const t = 0.9; // wait for the card to land first
    svg.innerHTML =
      leaf(r, 160, 98, -74, 78, t) +
      leaf(r, 160, 98, 74, 78, t + 0.1) +
      leaf(r, 160, 102, -116, 52, t + 0.25) +
      leaf(r, 160, 102, 116, 52, t + 0.3) +
      `<g transform="translate(76 92)">${flowerHead({ radius: 34, tone: 'peach', seed: 5, delay: t + 0.5 })}</g>` +
      `<g transform="translate(246 90)">${flowerHead({ radius: 36, tone: 'mauve', seed: 9, delay: t + 0.7 })}</g>` +
      `<g transform="translate(160 80)">${flowerHead({ radius: 60, tone: 'rose', seed: 3, delay: t + 0.2 })}</g>` +
      `<use href="#i-bloom" class="twinkle t-rose" x="14" y="22" width="15" height="15" style="--d:${t + 1.6}s"/>` +
      `<use href="#i-star" class="twinkle" x="294" y="20" width="14" height="14" style="--d:${t + 2}s"/>` +
      `<use href="#i-star" class="twinkle" x="26" y="122" width="10" height="10" style="--d:${t + 2.4}s"/>` +
      `<use href="#i-bloom" class="twinkle t-mauve" x="290" y="124" width="12" height="12" style="--d:${t + 2.8}s"/>`;
  }

  /** Page 3: one corner bouquet (drawn for the top-left corner, mirrored by CSS). viewBox 0 0 240 240. */
  function cornerBouquet(seed, tones, t) {
    const r = seeded(seed);
    return (
      `<path class="pencil" d="M108 108Q150 142 186 190"/>` +
      `<path class="pencil" d="M96 122Q118 168 112 214"/>` +
      `<circle class="bud" cx="187" cy="192" r="6"/><circle class="bud" cx="112" cy="216" r="5"/>` +
      leaf(r, 104, 104, 135, 92, t + 0.1) +
      leaf(r, 150, 66, 104, 62, t + 0.35) +
      leaf(r, 66, 150, 166, 62, t + 0.45) +
      leaf(r, 150, 150, 120, 30, t + 0.9) +
      `<g transform="translate(172 48)">${flowerHead({ radius: 36, tone: tones[1], seed: seed + 1, delay: t + 0.7 })}</g>` +
      `<g transform="translate(46 174)">${flowerHead({ radius: 32, tone: tones[2], seed: seed + 2, delay: t + 1 })}</g>` +
      `<g transform="translate(76 76)">${flowerHead({ radius: 58, tone: tones[0], seed, delay: t + 0.2 })}</g>`
    );
  }

  function paintGarden(garden) {
    const corners = [
      ['tl', 31, ['rose', 'peach', 'mauve']],
      ['tr', 47, ['mauve', 'rose', 'peach']],
      ['bl', 59, ['peach', 'mauve', 'rose']],
      ['br', 73, ['rose', 'mauve', 'peach']],
    ];
    garden.innerHTML = corners
      .map(([place, seed, tones], i) =>
        `<svg class="garden__corner garden__corner--${place}" viewBox="0 0 240 240" data-bloom>${cornerBouquet(seed, tones, 0.4 + i * 0.35)}</svg>`)
      .join('');
  }

  /* ---------- 3. Drifting petals, sparkles and butterflies ---------- */
  const drift = $('#drift');
  const TINTS = ['t-rose', 't-blush', 't-deep', 't-peach', 't-mauve'];

  function addDrifter(className, symbol, vars) {
    const el = document.createElement('span');
    el.className = className;
    el.innerHTML = `<svg><use href="#${symbol}"/></svg>`;
    Object.entries(vars).forEach(([name, value]) => el.style.setProperty(name, value));
    drift.appendChild(el);
  }

  function scatterPetalsAndSparkles() {
    const small = window.innerWidth < 600;
    for (let i = 0; i < (small ? 9 : 15); i++) {
      const dur = rand(11, 20);
      addDrifter(`drift__petal ${pick(TINTS)}`, 'i-petal', {
        '--x': `${rand(0, 100).toFixed(1)}%`,
        '--s': `${rand(12, 24).toFixed(0)}px`,
        '--o': rand(0.45, 0.85).toFixed(2),
        '--wind': `${rand(-90, 90).toFixed(0)}px`,
        '--dur': `${dur.toFixed(1)}s`,
        '--delay': `${(-rand(0, dur)).toFixed(1)}s`, // negative: already mid-air on load
        '--flutter': `${rand(2.2, 4.2).toFixed(1)}s`,
      });
    }
    for (let i = 0; i < (small ? 8 : 13); i++) {
      addDrifter('drift__sparkle', 'i-star', {
        '--x': `${rand(3, 95).toFixed(1)}%`,
        '--y': `${rand(4, 92).toFixed(1)}%`,
        '--s': `${rand(7, 14).toFixed(0)}px`,
        '--dur': `${rand(2.6, 5).toFixed(1)}s`,
        '--delay': `${rand(0, 5).toFixed(1)}s`,
      });
    }
  }

  /** A few butterflies that keep fluttering up across the last page. */
  function releaseButterflies() {
    const count = window.innerWidth < 600 ? 6 : 9;
    for (let i = 0; i < count; i++) {
      const dur = rand(9, 15);
      addDrifter(`drift__fly ${pick(['t-rose', 't-deep', 't-peach', 't-mauve'])}`, 'i-butterfly', {
        '--x': `${rand(4, 94).toFixed(1)}%`,
        '--s': `${rand(18, 30).toFixed(0)}px`,
        '--o': rand(0.6, 0.9).toFixed(2),
        '--wind': `${rand(-120, 120).toFixed(0)}px`,
        '--tilt': `${rand(-28, 28).toFixed(0)}deg`,
        '--dur': `${dur.toFixed(1)}s`,
        '--delay': `${rand(0, dur).toFixed(1)}s`,
        '--flutter': `${rand(0.5, 0.9).toFixed(2)}s`,
      });
    }
  }

  /* ---------- 4. Scene transitions ---------- */
  const scenes = {
    intro: $('#scene-intro'),
    invite: $('#scene-invite'),
    final: $('#scene-final'),
  };

  function show(name) {
    const next = scenes[name];
    const current = $('.scene.is-active');
    if (current === next) return;

    if (current) {
      current.classList.add('is-leaving');
      current.classList.remove('is-active');
      current.inert = true;
      current.setAttribute('aria-hidden', 'true');
      setTimeout(() => current.classList.remove('is-leaving'), 1000);
    }

    next.inert = false;
    next.removeAttribute('aria-hidden');
    next.classList.add('is-active');
    // Illustrations on the new page start blooming as it arrives.
    next.querySelectorAll('[data-bloom]').forEach((el) => el.classList.add('bloom'));
    // Move keyboard / screen-reader focus to the new page's heading.
    const heading = next.querySelector('h1, h2');
    if (heading) heading.focus({ preventScroll: true });
  }

  /* ---------- 5. The runaway "Үгүй" button ----------
     It can never be pressed: it jumps away when a cursor comes close, when a
     finger touches down on or near it, and even if a click somehow reaches it.
     Each jump lands fully on screen and clear of the "Тэгье!" button. */
  const stage = $('#stage');
  const yesBtn = $('#btn-yes');
  const noBtn = $('#btn-no');
  const noSlot = $('#no-slot');
  const hop = $('.btn__hop', noBtn);

  const EDGE = 20;       // keep this far inside the screen (covers the tilt and pencil outline)
  const YES_ZONE = 26;   // keep this far away from the yes button
  const NEAR = coarsePointer ? 56 : 86; // how close a pointer may get before it runs

  let dodging = false;   // only while the invitation page is showing
  let loose = false;     // true once the button has left its slot
  let spot = { x: 0, y: 0 };            // its current top-left corner on screen
  let pointer = { x: -9999, y: -9999 }; // last known pointer position
  let lastJump = 0;
  let escapes = 0;

  const boxAt = (x, y, w, h) => ({ left: x, top: y, right: x + w, bottom: y + h });
  const grow = (b, by) => ({ left: b.left - by, top: b.top - by, right: b.right + by, bottom: b.bottom + by });
  const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  /** Distance from a point to the nearest edge of a box (0 when inside it). */
  function gap(px, py, b) {
    const dx = Math.max(b.left - px, 0, px - b.right);
    const dy = Math.max(b.top - py, 0, py - b.bottom);
    return Math.hypot(dx, dy);
  }

  /** The area the button may land in: the visible stage, minus a margin. */
  function playground() {
    const s = stage.getBoundingClientRect();
    return { left: s.left + EDGE, top: s.top + EDGE, right: s.right - EDGE, bottom: s.bottom - EDGE };
  }

  function steer(x, y, tilt) {
    spot = { x, y };
    noBtn.style.setProperty('--x', `${x.toFixed(1)}px`);
    noBtn.style.setProperty('--y', `${y.toFixed(1)}px`);
    noBtn.style.setProperty('--r', `${tilt.toFixed(1)}deg`);
  }

  /** First escape: lift the button out of the card so it can roam the whole screen. */
  function setLoose() {
    if (loose) return;
    const rect = noBtn.getBoundingClientRect();
    const w = noBtn.offsetWidth;
    const h = noBtn.offsetHeight;
    // The empty slot keeps its size, so the yes button does not shift.
    noSlot.style.width = `${w}px`;
    noSlot.style.height = `${h}px`;
    $('#runaway').appendChild(noBtn);
    noBtn.classList.add('is-loose');
    // Start exactly where it was sitting, without animating there.
    noBtn.style.transition = 'none';
    steer(rect.left + (rect.width - w) / 2, rect.top + (rect.height - h) / 2, -1.1);
    void noBtn.offsetWidth;
    noBtn.style.transition = '';
    loose = true;
  }

  /** Choose a random landing spot: on screen, clear of "Тэгье!", away from the pointer. */
  function findSpot(px, py) {
    const area = playground();
    const w = noBtn.offsetWidth;
    const h = noBtn.offsetHeight;
    const maxX = Math.max(area.left, area.right - w);
    const maxY = Math.max(area.top, area.bottom - h);
    const yes = grow(yesBtn.getBoundingClientRect(), YES_ZONE);
    const farEnough = Math.min(260, Math.hypot(area.right - area.left, area.bottom - area.top) * 0.34);

    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < 80; i++) {
      const x = rand(area.left, maxX);
      const y = rand(area.top, maxY);
      if (overlap(boxAt(x, y, w, h), yes)) continue;

      // Far from the pointer matters most; a decent hop from here helps;
      // the random part keeps it unpredictable.
      let score =
        Math.min(gap(px, py, boxAt(x, y, w, h)), farEnough) +
        Math.min(Math.hypot(x - spot.x, y - spot.y), 160) * 0.25 +
        Math.random() * 40;

      // Avoid flight paths that would sweep across the yes button.
      const crossesYes = [0.2, 0.4, 0.6, 0.8].some((k) =>
        overlap(boxAt(spot.x + (x - spot.x) * k, spot.y + (y - spot.y) * k, w, h), yes));
      if (crossesYes) score -= 1000;

      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }

    if (!best) {
      // Tiny screens: fall back to whichever corner is farthest from the yes button.
      const yesX = (yes.left + yes.right) / 2;
      const yesY = (yes.top + yes.bottom) / 2;
      best = [
        { x: area.left, y: area.top }, { x: maxX, y: area.top },
        { x: area.left, y: maxY }, { x: maxX, y: maxY },
      ].sort((a, b) => Math.hypot(b.x - yesX, b.y - yesY) - Math.hypot(a.x - yesX, a.y - yesY))[0];
    }
    return best;
  }

  /** Run away from the point (px, py). `direct` = the button itself was touched. */
  function flee(px, py, direct) {
    if (!dodging) return;
    const now = performance.now();
    if (now - lastJump < (direct ? 70 : 170)) return; // let the current hop get going first
    lastJump = now;

    setLoose();
    const from = { x: spot.x + noBtn.offsetWidth / 2, y: spot.y + noBtn.offsetHeight / 2 };
    const to = findSpot(px, py);
    steer(to.x, to.y, rand(-12, 12));

    // Playful squish, and a few petals left behind where it stood.
    hop.classList.remove('is-hopping');
    void hop.offsetWidth;
    hop.classList.add('is-hopping');
    burst(from.x, from.y, 4, ['petal', 'petal', 'star'], 0.3);

    // The yes button gets a little more inviting each time.
    escapes += 1;
    yesBtn.style.setProperty('--grow', Math.min(1 + escapes * 0.03, 1.18).toFixed(2));
  }

  function watchPointer(event) {
    pointer = { x: event.clientX, y: event.clientY };
    if (!dodging) return;
    if (gap(pointer.x, pointer.y, noBtn.getBoundingClientRect()) < NEAR) {
      flee(pointer.x, pointer.y, false);
    }
  }

  function setUpRunaway() {
    // Cursor coming close, or a finger landing nearby.
    document.addEventListener('pointermove', watchPointer, { passive: true });
    document.addEventListener('pointerdown', watchPointer, { passive: true, capture: true });

    // Anything that reaches the button itself only makes it jump.
    const dodge = (event) => {
      const touch = event.touches && event.touches[0];
      const x = touch ? touch.clientX : event.clientX ?? pointer.x;
      const y = touch ? touch.clientY : event.clientY ?? pointer.y;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      flee(x || pointer.x, y || pointer.y, true);
    };
    noBtn.addEventListener('pointerenter', dodge);
    noBtn.addEventListener('pointerdown', dodge);
    noBtn.addEventListener('touchstart', dodge, { passive: false });
    noBtn.addEventListener('click', dodge);   // also covers keyboard / assistive activation
    noBtn.addEventListener('focus', () => noBtn.blur());

    // If the window changes size, make sure it is still on screen and clear of "Тэгье!".
    window.addEventListener('resize', () => {
      if (!loose || !dodging) return;
      const area = playground();
      const here = boxAt(spot.x, spot.y, noBtn.offsetWidth, noBtn.offsetHeight);
      const outside = here.left < area.left || here.top < area.top || here.right > area.right || here.bottom > area.bottom;
      if (outside || overlap(here, grow(yesBtn.getBoundingClientRect(), YES_ZONE))) {
        lastJump = 0;
        flee(pointer.x, pointer.y, true);
      }
    });
  }

  /* ---------- 6. Celebration ---------- */
  const fx = $('#fx');
  const FX_TINTS = [...TINTS, 't-ochre'];
  const FX_SHAPES = {
    fly: '<svg><use href="#i-butterfly"/></svg>',
    bloom: '<svg><use href="#i-bloom"/></svg>',
    petal: '<svg><use href="#i-petal"/></svg>',
    star: '<svg><use href="#i-star"/></svg>',
    bit: '<i class="fx__bit"></i>',
  };

  function particle(kind, vars, lifeMs) {
    const el = document.createElement('span');
    el.className = `fx__p ${pick(FX_TINTS)}`;
    el.innerHTML = FX_SHAPES[kind];
    Object.entries(vars).forEach(([name, value]) => el.style.setProperty(name, value));
    fx.appendChild(el);
    setTimeout(() => el.remove(), lifeMs);
  }

  /** Throw `count` particles up and out from (x, y); they arc over and fall. */
  function burst(x, y, count, kinds, power = 1) {
    if (reduceMotion) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const dur = rand(1.9, 3.3) * (power < 1 ? 0.6 : 1);
      const delay = rand(0, 0.22);
      particle(pick(kinds), {
        '--x0': `${x.toFixed(0)}px`,
        '--y0': `${y.toFixed(0)}px`,
        '--dx': `${(rand(-1, 1) * Math.min(vw * 0.48, 420) * power).toFixed(0)}px`,
        '--up': `${(-rand(90, Math.min(vh * 0.55, 460)) * power).toFixed(0)}px`,
        '--down': `${(rand(vh * 0.25, vh * 0.8) * power).toFixed(0)}px`,
        '--rot': `${rand(-540, 540).toFixed(0)}deg`,
        '--s': `${(rand(12, 30) * (power < 1 ? 0.7 : 1)).toFixed(0)}px`,
        '--dur': `${dur.toFixed(2)}s`,
        '--delay': `${delay.toFixed(2)}s`,
      }, (dur + delay) * 1000 + 200);
    }
  }

  /** Let confetti, petals and flowers rain down from the top of the screen. */
  function shower(count) {
    if (reduceMotion) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const dur = rand(3.2, 5.4);
      const delay = rand(0, 1.9);
      particle(pick(['bit', 'bit', 'bloom', 'petal', 'petal']), {
        '--x0': `${rand(0, vw).toFixed(0)}px`,
        '--y0': '-24px',
        '--dx': `${rand(-90, 90).toFixed(0)}px`,
        '--up': `${(vh * 0.3).toFixed(0)}px`,
        '--down': `${(vh + 80).toFixed(0)}px`,
        '--rot': `${rand(-720, 720).toFixed(0)}deg`,
        '--s': `${rand(12, 26).toFixed(0)}px`,
        '--dur': `${dur.toFixed(2)}s`,
        '--delay': `${delay.toFixed(2)}s`,
      }, (dur + delay) * 1000 + 200);
    }
  }

  let answered = false;
  let yesReadyAt = 0;

  function sayYes() {
    // Ignore a stray double-click carried over from the "Үргэлжлүүлэх" button.
    if (answered || performance.now() < yesReadyAt) return;
    answered = true;
    dodging = false;

    // "Үгүй" quietly disappears.
    noBtn.classList.add('is-gone');
    setTimeout(() => noBtn.remove(), 600);

    const rect = yesBtn.getBoundingClientRect();
    const small = window.innerWidth < 600;
    const everything = ['fly', 'bloom', 'bloom', 'petal', 'bit', 'bit', 'star'];
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, small ? 44 : 70, everything);
    shower(small ? 30 : 50);

    setTimeout(() => {
      show('final');
      releaseButterflies();
      // A second, softer burst once the last page has arrived.
      setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.45, small ? 24 : 40, everything, 0.9), 700);
    }, reduceMotion ? 0 : 950);
  }

  /* ---------- 7. Start ---------- */
  function start() {
    document.documentElement.lang = 'mn';

    const introFlower = $('#intro-flower');
    paintIntroFlower(introFlower);
    paintCardFlower($('#card-flower'));
    paintGarden($('#garden'));
    scatterPetalsAndSparkles();
    setUpRunaway();

    // Let the first frame paint, then start the seed → bloom sequence.
    requestAnimationFrame(() => requestAnimationFrame(() => introFlower.classList.add('bloom')));

    $('#btn-continue').addEventListener('click', () => {
      show('invite');
      yesReadyAt = performance.now() + 700;
      setTimeout(() => { dodging = true; }, 500);
    });

    yesBtn.addEventListener('click', sayYes);
  }

  start();
})();
