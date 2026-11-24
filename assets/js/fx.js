/* Maor invitation — celebratory effects layer (original code, no libraries).
   Purely decorative: every canvas is pointer-events:none and never blocks taps. */
(function () {
  "use strict";

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduce = function () { return mq.matches; };
  const body = document.body;
  const scroller = document.getElementById("invitation");
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const GOLDS = ["#f6e4c0", "#e8c9a0", "#d9ae6f", "#c08960", "#fff4dc", "#e9cfa0", "#b98b58"];

  function makeCanvas(cls) {
    const c = document.createElement("canvas");
    c.className = "fx-canvas " + cls;
    c.setAttribute("aria-hidden", "true");
    body.appendChild(c);
    return c;
  }
  function fit(c) {
    const w = window.innerWidth, h = window.innerHeight;
    c.width = Math.round(w * DPR);
    c.height = Math.round(h * DPR);
    c.style.width = w + "px";
    c.style.height = h + "px";
    const ctx = c.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return ctx;
  }

  /* ---------- 1. Confetti / sparkle bursts ---------- */
  const burstCanvas = makeCanvas("fx-burst");
  let bctx = fit(burstCanvas);
  let pieces = [];
  let burstRAF = 0;
  let lastT = 0;

  function burst(x, y, opts) {
    if (reduce()) return;
    opts = opts || {};
    const n = opts.count || 110;
    const power = opts.power || 1;
    for (let i = 0; i < n; i++) {
      const a = (opts.spread ? (-Math.PI / 2 + (Math.random() - 0.5) * opts.spread) : Math.random() * Math.PI * 2);
      const v = (4 + Math.random() * 9) * power;
      const kind = Math.random();
      pieces.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (opts.lift || 2.5),
        g: 0.16 + Math.random() * 0.08,
        drag: 0.965 + Math.random() * 0.02,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        tilt: Math.random() * Math.PI * 2,
        vt: 0.08 + Math.random() * 0.12,
        size: kind < 0.55 ? 5 + Math.random() * 5 : 2 + Math.random() * 2.6,
        shape: kind < 0.55 ? "rect" : (kind < 0.85 ? "spark" : "dot"),
        color: GOLDS[(Math.random() * GOLDS.length) | 0],
        life: 0,
        max: 150 + Math.random() * 90
      });
    }
    if (!burstRAF) { lastT = performance.now(); burstRAF = requestAnimationFrame(stepBurst); }
  }

  function drawSpark(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s * 2.2); ctx.quadraticCurveTo(0, 0, s * 2.2, 0);
    ctx.quadraticCurveTo(0, 0, 0, s * 2.2); ctx.quadraticCurveTo(0, 0, -s * 2.2, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s * 2.2);
    ctx.fill();
  }

  function stepBurst(t) {
    const dt = Math.min(3, (t - lastT) / 16.67);
    lastT = t;
    const w = window.innerWidth, h = window.innerHeight;
    bctx.clearRect(0, 0, w, h);
    const next = [];
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      p.life += dt;
      p.vx *= Math.pow(p.drag, dt);
      p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
      p.x += p.vx * dt + Math.sin(p.tilt) * 0.6 * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.tilt += p.vt * dt;
      if (p.life > p.max || p.y > h + 30) continue;
      const fade = Math.min(1, (p.max - p.life) / 40);
      bctx.save();
      bctx.globalAlpha = fade;
      bctx.translate(p.x, p.y);
      bctx.rotate(p.rot);
      bctx.fillStyle = p.color;
      if (p.shape === "rect") {
        bctx.scale(1, Math.abs(Math.cos(p.tilt)) * 0.9 + 0.1);
        bctx.fillRect(-p.size / 2, -p.size / 3.2, p.size, p.size / 1.6);
      } else if (p.shape === "spark") {
        bctx.shadowColor = "rgba(255, 230, 170, 0.9)";
        bctx.shadowBlur = 8;
        drawSpark(bctx, p.size * (0.7 + 0.3 * Math.abs(Math.sin(p.tilt * 2))));
      } else {
        bctx.shadowColor = "rgba(255, 230, 170, 0.9)";
        bctx.shadowBlur = 6;
        bctx.beginPath(); bctx.arc(0, 0, p.size * 0.7, 0, Math.PI * 2); bctx.fill();
      }
      bctx.restore();
      next.push(p);
    }
    pieces = next;
    if (pieces.length) burstRAF = requestAnimationFrame(stepBurst);
    else { burstRAF = 0; bctx.clearRect(0, 0, w, h); }
  }

  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ---------- 2. Floating golden bokeh (after opening) ---------- */
  const bokehCanvas = makeCanvas("fx-bokeh");
  let kctx = fit(bokehCanvas);
  let motes = [];
  let bokehRAF = 0;
  let bokehOn = false;
  let kLast = 0;

  function seedMotes() {
    const w = window.innerWidth, h = window.innerHeight;
    const count = Math.round(Math.min(26, Math.max(14, (w * h) / 22000)));
    motes = [];
    for (let i = 0; i < count; i++) motes.push(newMote(w, h, true));
  }
  function newMote(w, h, anywhere) {
    const big = Math.random() < 0.22;
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 20,
      r: big ? 9 + Math.random() * 14 : 1.2 + Math.random() * 2.4,
      big: big,
      vy: -(0.12 + Math.random() * 0.32),
      sway: 0.3 + Math.random() * 0.7,
      ph: Math.random() * Math.PI * 2,
      a: big ? 0.12 + Math.random() * 0.1 : 0.45 + Math.random() * 0.4,
      tw: 0.02 + Math.random() * 0.03
    };
  }
  function stepBokeh(t) {
    const dt = Math.min(3, (t - kLast) / 16.67 || 1);
    kLast = t;
    const w = window.innerWidth, h = window.innerHeight;
    kctx.clearRect(0, 0, w, h);
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.ph += m.tw * dt;
      m.y += m.vy * dt;
      m.x += Math.sin(m.ph) * 0.18 * m.sway * dt;
      if (m.y < -40) motes[i] = newMote(w, h, false);
      const tw = 0.6 + 0.4 * Math.sin(m.ph * 2.3);
      const g = kctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * (m.big ? 1 : 3.2));
      if (m.big) {
        g.addColorStop(0, "rgba(246, 222, 170," + (m.a * tw) + ")");
        g.addColorStop(0.65, "rgba(222, 180, 120," + (m.a * 0.7 * tw) + ")");
        g.addColorStop(1, "rgba(222, 180, 120, 0)");
      } else {
        g.addColorStop(0, "rgba(255, 250, 235," + Math.min(1, m.a * 1.3 * tw) + ")");
        g.addColorStop(0.3, "rgba(226, 180, 108," + (m.a * 0.8 * tw) + ")");
        g.addColorStop(1, "rgba(214, 168, 100, 0)");
      }
      kctx.fillStyle = g;
      kctx.beginPath();
      kctx.arc(m.x, m.y, m.r * (m.big ? 1 : 3.2), 0, Math.PI * 2);
      kctx.fill();
    }
    bokehRAF = requestAnimationFrame(stepBokeh);
  }
  function startBokeh() {
    if (reduce() || bokehOn) return;
    bokehOn = true;
    seedMotes();
    bokehCanvas.classList.add("is-on");
    kLast = performance.now();
    bokehRAF = requestAnimationFrame(stepBokeh);
  }
  function pauseBokeh() { if (bokehRAF) cancelAnimationFrame(bokehRAF); bokehRAF = 0; }
  document.addEventListener("visibilitychange", function () {
    if (!bokehOn) return;
    if (document.hidden) pauseBokeh();
    else if (!bokehRAF) { kLast = performance.now(); bokehRAF = requestAnimationFrame(stepBokeh); }
  });

  window.addEventListener("resize", function () {
    bctx = fit(burstCanvas);
    kctx = fit(bokehCanvas);
    if (bokehOn) seedMotes();
  });

  /* ---------- 3. Seal tap: burst + start ambient ---------- */
  const seal = document.getElementById("seal-hit");
  if (seal) {
    seal.addEventListener("click", function () {
      const c = centerOf(seal);
      burst(c.x, c.y, { count: 120, power: 1.05 });
      setTimeout(function () { burst(c.x, c.y - 10, { count: 60, power: 0.8, spread: Math.PI * 0.9, lift: 4 }); }, 260);
      // Gentle shower from the top as the card reveals.
      setTimeout(function () {
        const w = window.innerWidth;
        burst(w * 0.2, -10, { count: 40, power: 0.45, spread: Math.PI * 0.6, lift: -3 });
        burst(w * 0.8, -10, { count: 40, power: 0.45, spread: Math.PI * 0.6, lift: -3 });
      }, 2300);
      setTimeout(startBokeh, 1600);
    }, { once: true });
  }
  if (/[?&]open=1(?:&|$)/.test(location.search)) startBokeh();

  /* ---------- 4. Scratch complete: small golden pop ---------- */
  const scratch = document.getElementById("scratch-card");
  if (scratch && "MutationObserver" in window) {
    const mo = new MutationObserver(function () {
      if (scratch.classList.contains("is-complete")) {
        mo.disconnect();
        const c = centerOf(scratch);
        burst(c.x, c.y, { count: 70, power: 0.75 });
      }
    });
    mo.observe(scratch, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---------- 5. RSVP success celebration ---------- */
  const form = document.getElementById("rsvp-form");
  const done = document.getElementById("rsvp-done");
  let submittedAt = 0;
  if (form) form.addEventListener("submit", function () { submittedAt = Date.now(); }, true);
  if (done && "MutationObserver" in window) {
    new MutationObserver(function () {
      if (done.hidden || !submittedAt || Date.now() - submittedAt > 20000) return;
      submittedAt = 0;
      const ic = done.querySelector(".rsvp-done-ic") || done;
      setTimeout(function () {
        const c = centerOf(ic);
        burst(c.x, c.y, { count: 130, power: 1 });
        setTimeout(function () { burst(c.x, c.y, { count: 60, power: 0.7, spread: Math.PI * 0.8, lift: 4 }); }, 220);
      }, 120);
      done.classList.add("fx-celebrate");
      setTimeout(function () { done.classList.remove("fx-celebrate"); }, 1600);
    }).observe(done, { attributes: true, attributeFilter: ["hidden"] });
  }

  /* ---------- 6. Subtle parallax on the portrait + card ---------- */
  const portrait = document.querySelector(".sec-portrait img");
  const portraitSec = document.getElementById("portrait");
  const cardText = document.querySelector(".card-text");
  const cardSec = document.getElementById("card");
  let pxTick = 0;
  function parallax() {
    pxTick = 0;
    if (reduce()) return;
    const vh = window.innerHeight;
    if (portrait && portraitSec) {
      const r = portraitSec.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const p = Math.max(-1, Math.min(1, r.top / vh)); // -1..1
        portrait.style.transform = "translate3d(0," + (p * -22).toFixed(1) + "px,0) scale(1.07)";
      }
    }
    if (cardText && cardSec) {
      const r2 = cardSec.getBoundingClientRect();
      if (r2.bottom > 0) {
        const p2 = Math.max(0, Math.min(1, -r2.top / vh));
        cardText.style.setProperty("--fx-par", (p2 * 38).toFixed(1) + "px");
      }
    }
  }
  if (scroller) {
    scroller.addEventListener("scroll", function () {
      if (!pxTick) pxTick = requestAnimationFrame(parallax);
    }, { passive: true });
  }

  /* ---------- 7. Countdown seconds: soft tick ---------- */
  const secEl = document.querySelector('.count-num[data-unit="seconds"]');
  if (secEl && "MutationObserver" in window) {
    new MutationObserver(function () {
      if (reduce()) return;
      secEl.classList.remove("fx-tick");
      void secEl.offsetWidth;
      secEl.classList.add("fx-tick");
    }).observe(secEl, { childList: true, characterData: true, subtree: true });
  }

  body.classList.add("fx-ready");
  window.InviteFX = { burst: burst };
})();
