// LifeInMoons site — shared interactive pieces.
// Depends on MoonMath (moonmath.js) and the inlined moon images.

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
function fmtLong(d) { return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }

// The small photographic moon, shared by every canvas.
const moonImg = new Image();
let moonImgReady = false;
moonImg.onload = () => { moonImgReady = true; };
moonImg.src = window.MOONSMALL_SRC || "assets/moonsmall.png";
function whenMoonReady(fn) {
  if (moonImgReady) fn();
  else moonImg.addEventListener("load", fn, { once: true });
}

// ---- faint fixed starfield (drawn once; calm, not twinkling) ----
function starfield(canvas) {
  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    // deterministic scatter so resize doesn't reshuffle the sky
    let seed = 9;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 110; i++) {
      const x = rnd() * w, y = rnd() * h;
      const r = rnd() < 0.12 ? 1.1 : 0.6;
      ctx.fillStyle = "rgba(242,231,206," + (0.05 + rnd() * 0.16).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  }
  draw();
  addEventListener("resize", draw);
}

// ---- life grid: the calendar rendered like the app's Canvas ----
// opts: { count, current, animate, height } — draws into `canvas`
// (CSS-sized by its wrapper; height set from the layout solver).
function lifeGrid(canvas, opts) {
  const cssW = canvas.parentElement.clientWidth;
  // probe for proportions, then re-lay out at the true content height so the
  // canvas hugs the grid exactly (no dead band, no clipping)
  const probe = MoonMath.layoutMoons(cssW, cssW * 1.5, opts.count, opts.current, 1);
  const layout = MoonMath.layoutMoons(cssW, probe.height, opts.count, opts.current, 1);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = cssW * dpr; canvas.height = layout.height * dpr;
  canvas.style.height = layout.height + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const RAMP = 260;            // per-moon fade, ms
  const TOTAL = opts.animate && !REDUCE ? 2200 : 0; // ripple duration
  const n = layout.moons.length;
  const rr = layout.dot / 2;
  let t0 = null, rafId = null;

  function drawFrame(now) {
    if (t0 === null) t0 = now;
    const t = now - t0;
    ctx.clearRect(0, 0, cssW, layout.height);
    let done = true;
    for (let i = 0; i < n; i++) {
      const m = layout.moons[i];
      const start = TOTAL ? (i / n) * TOTAL : 0;
      let a = TOTAL ? Math.min(1, Math.max(0, (t - start) / RAMP)) : 1;
      if (a < 1) done = false;
      if (a <= 0) continue;
      if (m.state === "future") {
        ctx.globalAlpha = 0.16 * a;
        ctx.strokeStyle = "#F2E7CE";
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, 7); ctx.stroke();
      } else if (m.state === "past") {
        ctx.globalAlpha = 0.82 * a;
        ctx.drawImage(moonImg, m.x - rr, m.y - rr, layout.dot, layout.dot);
      } else {
        // the current moon breathes, like the app
        const breathe = REDUCE ? 1 : 1 + 0.07 * Math.sin(now / 900);
        const r2 = rr * breathe;
        ctx.globalAlpha = a;
        ctx.drawImage(moonImg, m.x - r2, m.y - r2, r2 * 2, r2 * 2);
        ctx.globalAlpha = 0.35 * a;
        ctx.strokeStyle = "#F2E7CE";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(m.x, m.y, r2 + 3.5, 0, 7); ctx.stroke();
        if (!REDUCE) done = false;
      }
    }
    ctx.globalAlpha = 1;
    if (!done) rafId = requestAnimationFrame(drawFrame);
  }
  whenMoonReady(() => { rafId = requestAnimationFrame(drawFrame); });
  return { stop() { if (rafId) cancelAnimationFrame(rafId); } };
}

// ---- "How many moons have you lived?" ----
function calculator(root) {
  const input = root.querySelector("input[type=date]");
  const result = root.querySelector(".calcresult");
  const numEl = root.querySelector(".bignum");
  const lineEl = root.querySelector(".calcline");
  const wrap = root.querySelector(".gridwrap");
  let grid = null, countRaf = null;

  input.max = new Date().toISOString().slice(0, 10);
  input.min = "1920-01-01";

  input.addEventListener("change", () => {
    if (!input.value) return;
    const [y, mo, d] = input.value.split("-").map(Number);
    if (y < 1920) { lineEl.textContent = "The calendar begins in 1920."; return; }
    const birthday = new Date(y, mo - 1, d);
    if (birthday > new Date()) { lineEl.textContent = "That moon hasn't risen yet."; return; }

    const life = MoonMath.build(birthday, 90);
    const bloods = life.moons.filter(m => m.isEclipse && m.number <= life.current).length;
    result.classList.add("on");

    // count up to the number, easing out
    if (countRaf) cancelAnimationFrame(countRaf);
    const target = life.current, D = REDUCE ? 0 : 1500;
    const start = performance.now();
    (function tick(now) {
      const p = D ? Math.min(1, (now - start) / D) : 1;
      const eased = 1 - Math.pow(1 - p, 3);
      numEl.textContent = Math.round(target * eased);
      if (p < 1) countRaf = requestAnimationFrame(tick);
    })(start);

    lineEl.innerHTML =
      "full moons lived — " + bloods + " of them blood red.<br>" +
      "At ninety years, <span class='num'>" + (life.count - life.current) +
      "</span> still wait for you.";

    if (grid) grid.stop();
    wrap.innerHTML = "<canvas aria-label='Your life in moons'></canvas>";
    grid = lifeGrid(wrap.firstChild, { count: life.count, current: life.current, animate: true });
  });
}

// ---- tonight's sky: real phase + next full moon ----
function tonight(root) {
  const now = new Date();
  const s = MoonMath.surroundingFullMoons(now);
  const f = MoonMath.phaseFraction(s.lastFull, s.nextFull, now);
  const nights = Math.ceil((s.nextFull - now) / 86400000);

  const wrap = root.querySelector(".phasewrap");
  const cv = wrap.querySelector("canvas");
  const size = 148, dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = cv.height = size * dpr;
  const ctx = cv.getContext("2d");
  ctx.scale(dpr, dpr);

  whenMoonReady(() => {
    ctx.clearRect(0, 0, size, size);
    // cycle-progress arc, hairline
    const c = size / 2, arcR = c - 2;
    ctx.strokeStyle = "rgba(242,231,206,0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(c, c, arcR, 0, 7); ctx.stroke();
    ctx.strokeStyle = "rgba(242,231,206,0.55)";
    ctx.beginPath(); ctx.arc(c, c, arcR, -Math.PI / 2, -Math.PI / 2 + f * 2 * Math.PI); ctx.stroke();
    // the moon, tonight's actual shape
    const mR = c - 18, mS = mR * 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(c, c, mR, 0, 7); ctx.clip();
    ctx.drawImage(moonImg, c - mR, c - mR, mS, mS);
    ctx.translate(c - mR, c - mR);
    if (MoonMath.traceShadow(ctx, mS, f)) {
      ctx.fillStyle = "rgba(10,14,25,0.93)";
      ctx.fill();
    }
    ctx.restore();
  });

  root.querySelector(".t-last").textContent = "Last full moon — " + fmtLong(s.lastFull);
  root.querySelector(".t-next").textContent =
    "Next full moon — " + fmtLong(s.nextFull) + " · in " + nights + (nights === 1 ? " night" : " nights");
}

// ---- scroll reveals ----
function reveals() {
  if (REDUCE || !("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("vis"));
    return;
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); }
  }), { threshold: 0.22 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
}

// ---- scroll-linked field: faint outlines accumulate as you read (direction B) ----
function scrollField(canvas, count) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let layout, w, h;
  function size() {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    layout = MoonMath.layoutMoons(w, h, count, 0, 1);
  }
  size(); addEventListener("resize", () => { size(); paint(); });
  const ctx = canvas.getContext("2d");
  let painted = -1;
  function paint() {
    const doc = document.documentElement;
    const p = Math.min(1, doc.scrollTop / (doc.scrollHeight - innerHeight));
    const k = Math.round(Math.min(1, p * 1.25) * layout.moons.length);
    if (k === painted) return;
    painted = k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const rr = layout.dot / 2;
    ctx.strokeStyle = "rgba(242,231,206,0.10)";
    ctx.lineWidth = 0.7;
    for (let i = 0; i < k; i++) {
      const m = layout.moons[i];
      ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, 7); ctx.stroke();
    }
  }
  if (REDUCE) { painted = -1; document.addEventListener("scroll", paint, { passive: true }); paint(); }
  else document.addEventListener("scroll", () => requestAnimationFrame(paint), { passive: true });
  paint();
}
