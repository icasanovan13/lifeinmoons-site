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
        // locked view draws the current moon crisp in its own overlay canvas
        if (opts.skipCurrent) { if (a < 1) done = false; continue; }
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
  return { stop() { if (rafId) cancelAnimationFrame(rafId); }, layout };
}

// the visitor's current moon — the one crisp, breathing point above the fog
function currentMoonOverlay(wrap, layout, offsetY, current) {
  const m = layout.moons[Math.max(0, current - 1)];
  const rr = layout.dot / 2;
  const box = Math.max(24, Math.ceil(layout.dot * 3));
  const cv = document.createElement("canvas");
  cv.className = "curmoon";
  cv.setAttribute("aria-hidden", "true");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = box * dpr; cv.height = box * dpr;
  cv.style.width = box + "px"; cv.style.height = box + "px";
  cv.style.left = (m.x - box / 2) + "px";
  cv.style.top = (m.y - offsetY - box / 2) + "px";
  wrap.appendChild(cv);
  const ctx = cv.getContext("2d");
  ctx.scale(dpr, dpr);
  const c = box / 2;
  function draw(now) {
    ctx.clearRect(0, 0, box, box);
    const breathe = REDUCE ? 1 : 1 + 0.07 * Math.sin(now / 900);
    const r2 = rr * breathe;
    if (moonImgReady) ctx.drawImage(moonImg, c - r2, c - r2, r2 * 2, r2 * 2);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#F2E7CE";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(c, c, r2 + 3.5, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (REDUCE) { whenMoonReady(() => draw(0)); return; }
  (function loop(now) {
    if (!cv.isConnected) return; // removed on re-render/unlock
    draw(now || 0);
    requestAnimationFrame(loop);
  })(0);
}

// ---- "How many moons have you lived?" ----
// Free: the count (and blood-moon line). Behind the $2.99 unlock: the full
// dated grid, unblurred, plus the printable A2 poster (js/poster.js) and the
// horizon chips. With the paywall dormant (no config) everything stays free
// except the poster, which simply doesn't appear.
function calculator(root) {
  const input = root.querySelector("input[type=date]");
  const result = root.querySelector(".calcresult");
  const numEl = root.querySelector(".bignum");
  const lineEl = root.querySelector(".calcline");
  const wrap = root.querySelector(".gridwrap");
  const paycard = root.querySelector(".paycard");
  const posterRow = root.querySelector(".posterrow");
  const gridCaption = root.querySelector(".gridcaption");
  let grid = null, countRaf = null, life = null, lastBirthday = null;

  input.max = new Date().toISOString().slice(0, 10);
  input.min = "1920-01-01";

  const horizon = () => Number(localStorage.getItem("lim_horizon")) || 90;
  const horizonWord = h => ({ 80: "eighty", 90: "ninety", 100: "one hundred" })[h] || h;

  function render(birthday, { animate }) {
    lastBirthday = birthday;
    life = MoonMath.build(birthday, horizon());
    life.birthday = birthday;
    life.horizon = horizon();
    const bloods = life.moons.filter(m => m.isEclipse && m.number <= life.current).length;
    result.classList.add("on");

    // count up to the number, easing out — always free, always first
    if (countRaf) cancelAnimationFrame(countRaf);
    const target = life.current, D = animate && !REDUCE ? 1500 : 0;
    const start = performance.now();
    (function tick(now) {
      const p = D ? Math.min(1, (now - start) / D) : 1;
      const eased = 1 - Math.pow(1 - p, 3);
      numEl.textContent = Math.round(target * eased);
      if (p < 1) countRaf = requestAnimationFrame(tick);
    })(start);

    lineEl.innerHTML =
      "full moons lived — " + bloods + " of them blood red.<br>" +
      "At " + horizonWord(life.horizon) + " years, <span class='num'>" +
      (life.count - life.current) + "</span> still wait for you.";

    const gated = Paywall.enabled() && !Paywall.unlocked();
    if (grid) grid.stop();
    wrap.innerHTML = "<canvas aria-label='Your life in moons'></canvas>";
    grid = lifeGrid(wrap.firstChild, { count: life.count, current: life.current,
                                       animate, skipCurrent: gated });
    wrap.classList.toggle("locked", gated);
    if (gated) {
      // keep the visitor's breathing moon inside the visible window: if their
      // current moon sits deep in the grid, shift the canvas up so "now"
      // lands about a third in — then draw it crisp above the fog
      const clipH = Math.min(grid.layout.height, window.innerHeight * 0.38);
      const cur = grid.layout.moons[Math.max(0, life.current - 1)];
      const offset = Math.max(0, Math.min(cur.y - clipH * 0.32,
                                          grid.layout.height - clipH));
      wrap.firstChild.style.transform = offset ? "translateY(" + (-offset) + "px)" : "";
      currentMoonOverlay(wrap, grid.layout, offset, life.current);
    }
    if (paycard) paycard.hidden = !gated;
    if (posterRow) posterRow.hidden = !(Paywall.enabled() && Paywall.unlocked());
    if (gridCaption) gridCaption.hidden = gated;
    root.querySelectorAll(".chip").forEach(ch =>
      ch.classList.toggle("chip--on", Number(ch.dataset.h) === life.horizon));
  }

  input.addEventListener("change", () => {
    if (!input.value) return;
    const [y, mo, d] = input.value.split("-").map(Number);
    if (y < 1920) { lineEl.textContent = "The calendar begins in 1920."; result.classList.add("on"); return; }
    const birthday = new Date(y, mo - 1, d);
    if (birthday > new Date()) { lineEl.textContent = "That moon hasn't risen yet."; result.classList.add("on"); return; }
    try { localStorage.setItem("lim_birthday", input.value); } catch {}
    render(birthday, { animate: true });
  });

  // buy → Stripe (the birthday stays home in localStorage)
  const buyBtn = root.querySelector(".buybtn");
  if (buyBtn) buyBtn.addEventListener("click", () => {
    buyBtn.disabled = true;
    Paywall.checkout().then(() => { buyBtn.disabled = false; refresh(); });
  });

  // the $4.99 app — the second call; becomes a real link once the App Store URL exists
  const appBtn = root.querySelector(".appbtn");
  const appURL = (window.LIM_CONFIG || {}).appStoreURL || "";
  if (appBtn && appURL) {
    appBtn.href = appURL;
    appBtn.classList.remove("button--soon");
    appBtn.textContent = "The full app · $4.99";
  }

  // restore by receipt email
  const restoreLink = root.querySelector(".restorelink");
  const restoreRow = root.querySelector(".restorerow");
  if (restoreLink) restoreLink.addEventListener("click", () => {
    restoreRow.hidden = !restoreRow.hidden;
    if (!restoreRow.hidden) restoreRow.querySelector("input").focus();
  });
  if (restoreRow) restoreRow.querySelector("button").addEventListener("click", async () => {
    const msg = root.querySelector(".restoremsg");
    const email = restoreRow.querySelector("input").value;
    if (!email) return;
    msg.textContent = "Looking for your moons…";
    const d = await Paywall.restore(email);
    msg.textContent = d.ok ? "" : "No purchase found for that email.";
    if (d.ok) refresh();
  });

  // horizon chips (post-unlock)
  root.querySelectorAll(".chip").forEach(ch => ch.addEventListener("click", () => {
    try { localStorage.setItem("lim_horizon", ch.dataset.h); } catch {}
    if (lastBirthday) render(lastBirthday, { animate: false });
  }));

  // poster download
  const posterBtn = root.querySelector(".posterbtn");
  if (posterBtn) posterBtn.addEventListener("click", () => {
    if (life && Paywall.unlocked()) Poster.download(life);
  });

  function refresh() {
    if (lastBirthday) render(lastBirthday, { animate: false });
  }

  // returning visitor / returning buyer: restore their calendar quietly
  function boot() {
    const saved = localStorage.getItem("lim_birthday");
    if (saved) {
      input.value = saved;
      const [y, mo, d] = saved.split("-").map(Number);
      render(new Date(y, mo - 1, d), { animate: false });
    }
    Paywall.handleReturn().then(status => {
      if (status === "unlocked") {
        refresh();
        root.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth" });
      } else if (status === "failed") {
        const msg = root.querySelector(".restoremsg");
        if (msg) msg.textContent =
          "We couldn't confirm that payment — if you were charged, use Restore with your receipt email.";
        if (paycard) paycard.hidden = false;
      }
    });
  }
  boot();
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

// ---- page boot ----
document.addEventListener("DOMContentLoaded", () => {
  const sky = document.getElementById("sky");
  if (sky) starfield(sky);
  const globe = document.getElementById("globe");
  if (globe) MoonGlobe(globe, { src: window.MOONTEX_SRC || "assets/moontex.jpg" });
  const calc = document.getElementById("calc");
  if (calc) calculator(calc);
  const t = document.getElementById("tonight");
  if (t) tonight(t);
  reveals();
});
