/* Maor Yosef Miara invitation — original interaction (no third-party code). */
(function () {
  "use strict";

  // Flip these when Meital sends the venue and the day's schedule.
  const CONFIG = {
    showVenue: false,
    showSchedule: false,
    venueName: "",
    venueAddress: "",
    wazeUrl: "",
    // Start of the day in Asia/Jerusalem. On 18.3.2027 Israel is still IST (UTC+2);
    // DST begins 26.3.2027. Replace with a precise time when we have one.
    eventDate: "2027-03-18T00:00:00+02:00",
    timeZone: "Asia/Jerusalem",
    schedule: [
      // { time: "17:00", title: "קבלת פנים", note: "" },
    ]
  };

  const envelope = document.getElementById("envelope-stage");
  const invitation = document.getElementById("invitation");
  const sealBtn = document.getElementById("seal-hit");
  const audio = document.getElementById("bg-music");
  const muteBtn = document.getElementById("mute-btn");
  const body = document.body;
  const nav = document.getElementById("invite-nav");
  const navBtn = document.getElementById("nav-next");
  const dotsRoot = document.getElementById("progress-dots");

  if (CONFIG.showVenue) body.classList.add("show-venue");
  if (CONFIG.showSchedule) body.classList.add("show-schedule");
  fillVenue();
  fillSchedule();

  startCountdown();
  setupReveal();
  setupNav();
  const scratchApi = setupScratch();

  const alreadyOpen = /[?&]open=1(?:&|$)/.test(location.search);
  if (alreadyOpen) {
    openImmediate();
  } else if (sealBtn) {
    sealBtn.addEventListener("click", onOpen, { once: true });
  }

  if (muteBtn && audio) {
    muteBtn.addEventListener("click", function () {
      audio.muted = !audio.muted;
      muteBtn.classList.toggle("is-muted", audio.muted);
      muteBtn.setAttribute("aria-pressed", audio.muted ? "true" : "false");
      muteBtn.setAttribute("aria-label", audio.muted ? "הפעלת מוזיקה" : "השתקת מוזיקה");
    });
  }

  function onOpen() {
    startMusic();
    body.classList.add("is-opening");
    envelope.classList.add("is-opening");
    invitation.setAttribute("aria-hidden", "false");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doneAt = reduce ? 400 : 3600;
    window.setTimeout(function () {
      envelope.classList.add("is-done");
      body.classList.remove("is-opening");
      body.classList.add("is-open");
      showNav();
      revealVisible();
      if (scratchApi) scratchApi.prepare();
      updateNav();
    }, doneAt);
  }

  function openImmediate() {
    body.classList.add("is-open");
    if (envelope) {
      envelope.classList.add("is-opening", "is-done");
    }
    if (invitation) invitation.setAttribute("aria-hidden", "false");
    showNav();
    revealVisible();
    if (scratchApi) scratchApi.prepare();
    updateNav();
  }

  function startMusic() {
    if (!audio) return;
    audio.volume = 0;
    const play = audio.play();
    if (play && play.catch) play.catch(function () { /* autoplay blocked; user already tapped, retry */ audio.play().catch(function () {}); });
    fadeVolume(audio, 0.28, 1400);
  }

  function fadeVolume(el, target, ms) {
    const steps = 20;
    const step = target / steps;
    const dt = ms / steps;
    let i = 0;
    const t = window.setInterval(function () {
      i += 1;
      el.volume = Math.min(target, step * i);
      if (i >= steps) window.clearInterval(t);
    }, dt);
  }

  function startCountdown() {
    const root = document.getElementById("countdown");
    if (!root) return;
    const target = new Date(CONFIG.eventDate).getTime();
    const daysEl = root.querySelector("[data-unit=days]");
    const hoursEl = root.querySelector("[data-unit=hours]");
    const minsEl = root.querySelector("[data-unit=minutes]");
    const secsEl = root.querySelector("[data-unit=seconds]");

    function tick() {
      const now = Date.now();
      let diff = Math.max(0, target - now);
      const days = Math.floor(diff / 86400000);
      diff -= days * 86400000;
      const hours = Math.floor(diff / 3600000);
      diff -= hours * 3600000;
      const mins = Math.floor(diff / 60000);
      diff -= mins * 60000;
      const secs = Math.floor(diff / 1000);
      daysEl.textContent = String(days);
      hoursEl.textContent = pad(hours);
      minsEl.textContent = pad(mins);
      secsEl.textContent = pad(secs);
    }
    tick();
    window.setInterval(tick, 1000);
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function setupReveal() {
    const nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { root: invitation, threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    nodes.forEach(function (n) { io.observe(n); });
    window._inviteReveal = function () { revealVisible(); };
  }

  function revealVisible() {
    const h = invitation ? invitation.clientHeight : window.innerHeight;
    document.querySelectorAll(".reveal").forEach(function (n) {
      const r = n.getBoundingClientRect();
      if (r.top < h * 0.92) n.classList.add("is-visible");
    });
  }

  function visibleScreens() {
    return Array.prototype.filter.call(
      document.querySelectorAll("#invitation > .sec"),
      function (s) { return window.getComputedStyle(s).display !== "none"; }
    );
  }

  function currentIndex() {
    const secs = visibleScreens();
    if (!secs.length) return 0;
    const top = invitation.scrollTop;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < secs.length; i++) {
      const d = Math.abs(secs[i].offsetTop - top);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function goTo(index, behavior) {
    const secs = visibleScreens();
    if (!secs.length) return;
    const i = Math.max(0, Math.min(secs.length - 1, index));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    secs[i].scrollIntoView({
      behavior: (behavior === "auto" || reduce) ? "auto" : "smooth",
      block: "start"
    });
    window.setTimeout(function () {
      revealVisible();
      updateNav();
    }, reduce ? 40 : 420);
  }

  function showNav() {
    if (!nav) return;
    nav.hidden = false;
    buildDots();
    updateNav();
  }

  function buildDots() {
    if (!dotsRoot) return;
    const secs = visibleScreens();
    dotsRoot.innerHTML = "";
    secs.forEach(function (_, i) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "מסך " + (i + 1));
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        goTo(i);
      });
      dotsRoot.appendChild(b);
    });
  }

  function updateNav() {
    if (!nav || !navBtn) return;
    const secs = visibleScreens();
    const i = currentIndex();
    const last = i >= secs.length - 1;
    nav.classList.toggle("is-last", last);
    navBtn.textContent = last ? "להתחלה ↑" : "להמשך ↓";
    if (dotsRoot) {
      Array.prototype.forEach.call(dotsRoot.children, function (d, idx) {
        d.classList.toggle("is-active", idx === i);
      });
    }
  }

  function advanceFromNav() {
    const secs = visibleScreens();
    const i = currentIndex();
    const current = secs[i];
    if (current && current.id === "scratch" && scratchApi && !scratchApi.isComplete()) {
      scratchApi.complete();
      window.setTimeout(function () { goTo(i + 1); }, 850);
      return;
    }
    if (i >= secs.length - 1) goTo(0);
    else goTo(i + 1);
  }

  function setupNav() {
    if (navBtn) {
      navBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        advanceFromNav();
      });
    }
    if (invitation) {
      invitation.addEventListener("scroll", function () {
        if (setupNav._tick) return;
        setupNav._tick = window.requestAnimationFrame(function () {
          setupNav._tick = 0;
          updateNav();
        });
      }, { passive: true });

      let ptr = null;
      invitation.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        ptr = { x: e.clientX, y: e.clientY };
      }, { passive: true });
      invitation.addEventListener("pointerup", function (e) {
        if (!ptr) return;
        const dx = e.clientX - ptr.x;
        const dy = e.clientY - ptr.y;
        ptr = null;
        if (Math.hypot(dx, dy) > 16) return;
        if (e.target.closest("a, button, canvas, .scratch-card, .wa-contact, .waze-btn")) return;
        if (e.clientY < window.innerHeight * 0.62) return;
        if (!body.classList.contains("is-open")) return;
        advanceFromNav();
      });
    }
    window.addEventListener("resize", function () {
      updateNav();
    });
  }

  function setupScratch() {
    const card = document.getElementById("scratch-card");
    const canvas = document.getElementById("scratch-canvas");
    const sparkles = document.getElementById("scratch-sparkles");
    if (!card || !canvas) return null;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let ready = false;
    let complete = false;
    let painted = false;
    let scratching = false;
    let last = null;
    let pearlImg = null;
    const img = new Image();
    img.onload = function () { pearlImg = img; if (ready && !complete) paintCover(); };
    img.src = "assets/img/bg-pearl.webp";

    function cssSize() {
      const r = card.getBoundingClientRect();
      return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
    }

    function prepare() {
      window.requestAnimationFrame(function () {
        resize(true);
        ready = true;
      });
    }

    function resize(force) {
      if (complete) return;
      const { w, h } = cssSize();
      if (w < 8 || h < 8) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (!force && painted && canvas.width === pw && canvas.height === ph) return;
      canvas.width = pw;
      canvas.height = ph;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintCover();
    }

    function roundedPath(c, w, h, r) {
      const rad = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(rad, 0);
      c.lineTo(w - rad, 0);
      c.quadraticCurveTo(w, 0, w, rad);
      c.lineTo(w, h - rad);
      c.quadraticCurveTo(w, h, w - rad, h);
      c.lineTo(rad, h);
      c.quadraticCurveTo(0, h, 0, h - rad);
      c.lineTo(0, rad);
      c.quadraticCurveTo(0, 0, rad, 0);
      c.closePath();
    }

    function paintCover() {
      const { w, h } = cssSize();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dpr = canvas.width / w;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      roundedPath(ctx, w, h, 22);
      ctx.clip();

      if (pearlImg) {
        const iw = pearlImg.naturalWidth;
        const ih = pearlImg.naturalHeight;
        const scale = Math.max(w / iw, h / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(pearlImg, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }

      const g1 = ctx.createLinearGradient(0, 0, w, h);
      g1.addColorStop(0, "rgba(236, 214, 208, 0.72)");
      g1.addColorStop(0.45, "rgba(214, 186, 196, 0.7)");
      g1.addColorStop(1, "rgba(232, 208, 196, 0.78)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w * 0.3, h * 0.25, 8, w * 0.3, h * 0.25, w * 0.7);
      g2.addColorStop(0, "rgba(255, 250, 245, 0.55)");
      g2.addColorStop(1, "rgba(255, 250, 245, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // Metallic streaks
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.translate(w * 0.5, h * 0.5);
      ctx.rotate(-0.4);
      for (let i = -6; i <= 6; i++) {
        const lg = ctx.createLinearGradient(i * 28 - 20, -h, i * 28 + 20, h);
        lg.addColorStop(0, "rgba(255,255,255,0)");
        lg.addColorStop(0.5, i % 2 ? "rgba(255,255,250,0.9)" : "rgba(210, 170, 150, 0.65)");
        lg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = lg;
        ctx.fillRect(i * 28 - 10, -h, 14, h * 2);
      }
      ctx.restore();

      // Fine grain
      const n = 280;
      for (let i = 0; i < n; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const a = 0.08 + Math.random() * 0.18;
        ctx.fillStyle = Math.random() > 0.5
          ? "rgba(255,255,250," + a + ")"
          : "rgba(140, 90, 80," + (a * 0.5) + ")";
        ctx.fillRect(x, y, 1.2, 1.2);
      }

      // Inner rim
      roundedPath(ctx, w, h, 22);
      ctx.strokeStyle = "rgba(255, 244, 230, 0.55)";
      ctx.lineWidth = 5;
      ctx.stroke();
      roundedPath(ctx, w, h, 22);
      ctx.strokeStyle = "rgba(160, 110, 90, 0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      painted = true;
    }

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function brush() {
      const { w } = cssSize();
      return Math.max(28, Math.min(56, w * 0.13));
    }

    function stamp(p) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(p.x, p.y, brush(), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function stroke(a, b) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brush() * 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }

    function clearedRatio() {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let cleared = 0;
      let total = 0;
      for (let i = 3; i < data.length; i += 32) {
        total += 1;
        if (data[i] < 40) cleared += 1;
      }
      return total ? cleared / total : 0;
    }

    function maybeComplete() {
      if (complete) return;
      try {
        if (clearedRatio() >= 0.5) finish();
      } catch (err) {
        /* getImageData can fail if the canvas is tainted; ignore */
      }
    }

    function burstSparkles() {
      if (!sparkles) return;
      sparkles.innerHTML = "";
      const spots = [
        [18, 22], [78, 20], [50, 16], [28, 70], [72, 68],
        [14, 48], [86, 46], [42, 82], [60, 30], [36, 38]
      ];
      spots.forEach(function (xy, i) {
        const s = document.createElement("span");
        s.style.left = xy[0] + "%";
        s.style.top = xy[1] + "%";
        s.style.animationDelay = (i * 0.045) + "s";
        sparkles.appendChild(s);
      });
    }

    function finish() {
      if (complete) return;
      complete = true;
      scratching = false;
      card.classList.add("is-complete");
      card.classList.remove("is-scratching");
      burstSparkles();
    }

    function onDown(e) {
      if (complete) return;
      e.preventDefault();
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }
      scratching = true;
      card.classList.add("is-scratching");
      last = pos(e);
      stamp(last);
    }

    function onMove(e) {
      if (!scratching || complete) return;
      e.preventDefault();
      const p = pos(e);
      stroke(last, p);
      last = p;
      maybeComplete();
    }

    function onUp() {
      if (!scratching) return;
      scratching = false;
      last = null;
      maybeComplete();
    }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", function (e) {
      if (scratching && e.buttons === 0) onUp();
    });

    window.addEventListener("resize", function () {
      if (!complete && ready) resize(false);
    });

    return {
      prepare: prepare,
      complete: finish,
      isComplete: function () { return complete; }
    };
  }

  function fillVenue() {
    const name = document.getElementById("venue-name");
    const addr = document.getElementById("venue-address");
    const waze = document.getElementById("waze-btn");
    if (name && CONFIG.venueName) name.textContent = CONFIG.venueName;
    if (addr && CONFIG.venueAddress) addr.textContent = CONFIG.venueAddress;
    if (waze) {
      if (CONFIG.wazeUrl) waze.href = CONFIG.wazeUrl;
      else waze.hidden = true;
    }
  }

  function fillSchedule() {
    const list = document.getElementById("schedule-list");
    if (!list || !CONFIG.schedule.length) return;
    list.innerHTML = "";
    CONFIG.schedule.forEach(function (item) {
      const li = document.createElement("li");
      const time = document.createElement("time");
      time.textContent = item.time || "";
      const wrap = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.title || "";
      wrap.appendChild(title);
      if (item.note) {
        const note = document.createElement("div");
        note.textContent = item.note;
        wrap.appendChild(note);
      }
      li.appendChild(time);
      li.appendChild(wrap);
      list.appendChild(li);
    });
  }
})();
