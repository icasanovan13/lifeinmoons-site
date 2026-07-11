// LifeInMoons — moon math, ported line-for-line from the app.
// Sources: LifeInMoons/Model.swift (LunarMath, layoutMoons),
//          LifeInMoons/PhaseGeometry.swift (phaseFraction, terminator),
//          LifeInMoons/Eclipses.swift (NASA Five Millennium Canon).
// The calendar is pure computation — no network, accurate to the minute.

const MoonMath = (() => {
  const d2r = Math.PI / 180;

  // Meeus, Astronomical Algorithms ch. 49. Full moon => k = integer + 0.5.
  function fullMoonJDE(k) {
    const T = k / 1236.85;
    let jde = 2451550.09766 + 29.530588861 * k
      + 0.00015437 * T * T
      - 0.00000015 * T * T * T
      + 0.00000000073 * T * T * T * T;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const M  = (2.5534 + 29.1053567 * k - 0.0000014 * T * T - 0.00000011 * T * T * T) * d2r;
    const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T * T * T - 0.000000058 * T * T * T * T) * d2r;
    const F  = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T * T * T + 0.000000011 * T * T * T * T) * d2r;
    const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T * T * T) * d2r;

    let c = 0;
    c += -0.40614 * Math.sin(Mp);
    c +=  0.17302 * E * Math.sin(M);
    c +=  0.01614 * Math.sin(2 * Mp);
    c +=  0.01043 * Math.sin(2 * F);
    c +=  0.00734 * E * Math.sin(Mp - M);
    c += -0.00514 * E * Math.sin(Mp + M);
    c +=  0.00209 * E * E * Math.sin(2 * M);
    c += -0.00111 * Math.sin(Mp - 2 * F);
    c += -0.00057 * Math.sin(Mp + 2 * F);
    c +=  0.00056 * E * Math.sin(2 * Mp + M);
    c += -0.00042 * Math.sin(3 * Mp);
    c +=  0.00042 * E * Math.sin(M + 2 * F);
    c +=  0.00038 * E * Math.sin(M - 2 * F);
    c += -0.00024 * E * Math.sin(2 * Mp - M);
    c += -0.00017 * Math.sin(Om);
    jde += c;

    const A = [
      299.77 + 0.107408 * k - 0.009173 * T * T,
      251.88 + 0.016321 * k,
      251.83 + 26.651886 * k,
      349.42 + 36.412478 * k,
      84.66 + 18.206239 * k,
      141.74 + 53.303771 * k,
      207.14 + 2.453732 * k,
      154.84 + 7.30686 * k,
      34.52 + 27.261239 * k,
      207.19 + 0.121824 * k,
      291.34 + 1.844379 * k,
      161.72 + 24.198154 * k,
      239.56 + 25.513099 * k,
      331.55 + 3.592518 * k,
    ];
    const Ac = [
      0.000325, 0.000165, 0.000164, 0.000126, 0.00011, 0.000062, 0.00006,
      0.000056, 0.000047, 0.000042, 0.00004, 0.000037, 0.000035, 0.000023,
    ];
    for (let i = 0; i < A.length; i++) jde += Ac[i] * Math.sin(A[i] * d2r);
    return jde; // Dynamical Time
  }

  // Approximate ΔT (seconds), Dynamical Time → UT. Sub-minute over a lifespan.
  function deltaTsec(year) {
    const t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }

  // Greatest-eclipse instants (UTC ms) of every total lunar eclipse 1920–2130.
  const eclipseInstants = [
    "1920-05-03T01:51", "1920-10-27T14:11", "1921-04-22T07:44", "1924-02-20T16:08",
    "1924-08-14T20:20", "1927-06-15T08:24", "1927-12-08T17:35", "1928-06-03T12:09",
    "1928-11-27T09:01", "1931-04-02T20:07", "1931-09-26T19:48", "1935-01-19T15:47",
    "1935-07-16T05:00", "1936-01-08T18:09", "1938-05-14T08:44", "1938-11-07T22:26",
    "1939-05-03T15:11", "1942-03-03T00:21", "1942-08-26T03:48", "1945-12-19T02:20",
    "1946-06-14T18:39", "1946-12-08T17:48", "1949-04-13T04:11", "1949-10-07T02:56",
    "1950-04-02T20:44", "1950-09-26T04:17", "1953-01-29T23:47", "1953-07-26T12:21",
    "1954-01-19T02:32", "1956-11-18T06:48", "1957-05-13T22:31", "1957-11-07T14:27",
    "1960-03-13T08:28", "1960-09-05T11:21", "1963-12-30T11:07", "1964-06-25T01:06",
    "1964-12-19T02:37", "1967-04-24T12:07", "1967-10-18T10:15", "1968-04-13T04:48",
    "1968-10-06T11:42", "1971-02-10T07:45", "1971-08-06T19:43", "1972-01-30T10:54",
    "1974-11-29T15:14", "1975-05-25T05:48", "1975-11-18T22:24", "1978-03-24T16:23",
    "1978-09-16T19:05", "1979-09-06T10:55", "1982-01-09T19:56", "1982-07-06T07:31",
    "1982-12-30T11:29", "1985-05-04T19:57", "1985-10-28T17:43", "1986-04-24T12:43",
    "1986-10-17T19:18", "1989-02-20T15:36", "1989-08-17T03:09", "1990-02-09T19:12",
    "1992-12-09T23:45", "1993-06-04T13:01", "1993-11-29T06:27", "1996-04-04T00:10",
    "1996-09-27T02:55", "1997-09-16T18:47", "2000-01-21T04:44", "2000-07-16T13:56",
    "2001-01-09T20:21", "2003-05-16T03:41", "2003-11-09T01:19", "2004-05-04T20:31",
    "2004-10-28T03:05", "2007-03-03T23:21", "2007-08-28T10:38", "2008-02-21T03:27",
    "2010-12-21T08:18", "2011-06-15T20:13", "2011-12-10T14:32", "2014-04-15T07:46",
    "2014-10-08T10:55", "2015-04-04T12:01", "2015-09-28T02:48", "2018-01-31T13:31",
    "2018-07-27T20:22", "2019-01-21T05:13", "2021-05-26T11:19", "2022-05-16T04:12",
    "2022-11-08T11:00", "2025-03-14T06:59", "2025-09-07T18:12", "2026-03-03T11:34",
    "2028-12-31T16:53", "2029-06-26T03:23", "2029-12-20T22:43", "2032-04-25T15:14",
    "2032-10-18T19:03", "2033-04-14T19:13", "2033-10-08T10:56", "2036-02-11T22:13",
    "2036-08-07T02:52", "2037-01-31T14:01", "2040-05-26T11:46", "2040-11-18T19:04",
    "2043-03-25T14:32", "2043-09-19T01:51", "2044-03-13T19:38", "2044-09-07T11:20",
    "2047-01-12T01:26", "2047-07-07T10:35", "2048-01-01T06:53", "2050-05-06T22:32",
    "2050-10-30T03:21", "2051-04-26T02:16", "2051-10-19T19:11", "2054-02-22T06:51",
    "2054-08-18T09:26", "2055-02-11T22:46", "2058-06-06T19:15", "2058-11-30T03:16",
    "2061-04-04T21:54", "2061-09-29T09:38", "2062-03-25T03:33", "2062-09-18T18:34",
    "2065-01-22T09:58", "2065-07-17T17:48", "2066-01-11T15:04", "2068-11-09T11:47",
    "2069-05-06T09:09", "2069-10-30T03:35", "2072-03-04T15:23", "2072-08-28T16:05",
    "2073-02-22T07:24", "2073-08-17T17:42", "2076-06-17T02:39", "2076-12-10T11:34",
    "2079-10-10T17:30", "2080-04-04T11:23", "2080-09-29T01:52", "2083-02-02T18:26",
    "2083-07-29T01:05", "2084-01-22T23:13", "2087-05-17T15:55", "2087-11-10T12:05",
    "2090-03-15T23:48", "2090-09-08T22:52", "2091-03-05T15:58", "2091-08-29T00:38",
    "2094-06-28T10:01", "2094-12-21T19:56", "2097-10-21T01:30", "2098-04-15T19:04",
    "2098-10-10T09:19", "2101-02-14T02:50", "2101-08-09T08:25", "2102-02-03T07:18",
    "2102-07-30T00:29", "2105-05-28T22:34", "2105-11-21T20:42", "2108-03-27T08:06",
    "2109-03-17T00:22", "2109-09-09T07:43", "2112-07-09T17:19", "2113-01-02T04:22",
    "2116-04-27T02:41", "2116-10-21T16:53", "2119-02-25T11:05", "2119-08-20T15:51",
    "2120-02-14T15:17", "2120-08-09T08:01", "2123-06-09T05:06", "2123-12-03T05:24",
    "2126-04-07T16:17", "2127-03-28T08:40", "2127-09-20T14:56", "2130-07-21T00:38",
  ].map(s => Date.parse(s + ":00Z"));

  // Total eclipse when a full moon falls within 36h of a catalogued instant.
  function isTotalEclipse(ms) {
    let lo = 0, hi = eclipseInstants.length - 1;
    const tol = 36 * 3600 * 1000;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const diff = eclipseInstants[mid] - ms;
      if (Math.abs(diff) <= tol) return true;
      if (diff < 0) lo = mid + 1; else hi = mid - 1;
    }
    return false;
  }

  // Every full moon from the birth year through the horizon, numbered from the
  // first full moon on/after the birthday (local midnight, like the app).
  // Returns { moons: [{number, date, year, isEclipse}], current, count }.
  function build(birthday, horizon, now = new Date()) {
    const by = birthday.getFullYear();
    const ey = by + horizon;
    const birthStart = new Date(birthday.getFullYear(), birthday.getMonth(), birthday.getDate()).getTime();

    let k = Math.floor((by - 2000) * 12.3685) - 2;
    const kEnd = Math.ceil((ey + 1 - 2000) * 12.3685) + 2;

    const dates = [];
    while (k <= kEnd) {
      const kk = k + 0.5;
      const yr = 2000 + kk / 12.3685;
      const jd = fullMoonJDE(kk) - deltaTsec(yr) / 86400;
      dates.push((jd - 2440587.5) * 86400 * 1000);
      k += 1;
    }

    const moons = dates
      .filter(ms => ms >= birthStart)
      .sort((a, b) => a - b)
      .map((ms, i) => {
        const d = new Date(ms);
        return { number: i + 1, date: d, year: d.getFullYear(), isEclipse: isTotalEclipse(ms) };
      });

    const nowMs = now.getTime();
    let current = 0;
    for (const m of moons) if (m.date.getTime() <= nowMs) current = m.number;
    return { moons, current, count: moons.length };
  }

  // Position within the current synodic cycle. 0 = full, 0.5 = new, 1 = full.
  function phaseFraction(lastFull, nextFull, now = new Date()) {
    const span = nextFull.getTime() - lastFull.getTime();
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, (now.getTime() - lastFull.getTime()) / span));
  }

  // The grid solver from Model.swift — same proportions as the app's screen.
  // Returns { moons: [{number, x, y, state}], dot, cell, height }.
  function layoutMoons(width, height, count, current, scale = 1) {
    const n = Math.max(1, count);
    const pad = 12;
    const w = width - pad * 2;
    const h = height - pad * 2;
    if (w <= 0 || h <= 0) return { moons: [], dot: 6, cell: 6, height };

    let cols = Math.max(1, Math.ceil(Math.sqrt(n * w / h)));
    while (Math.ceil(n / cols) * (w / cols) > h) cols += 1;
    cols = Math.max(3, Math.round(cols / scale));
    while (Math.ceil(n / cols) * (w / cols) > 2 * height) cols += 1;
    const cell = w / cols;
    const ratio = cell <= 16 ? 0.55 : Math.min(0.75, 0.55 + (cell - 16) * 0.008);
    const dot = cell * ratio;
    const rows = Math.ceil(n / cols);
    const contentH = rows * cell + pad * 2;
    const ox = pad;
    const oy = contentH <= height ? (height - rows * cell) / 2 : pad;

    const out = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const number = i + 1;
      out.push({
        number,
        x: ox + c * cell + cell / 2,
        y: oy + r * cell + cell / 2,
        state: number < current ? "past" : number === current ? "current" : "future",
      });
    }
    return { moons: out, dot, cell, height: contentH };
  }

  // Terminator shadow for a canvas of size s — the app's phaseShadowPath.
  // fraction: 0 = full, 0.25 = last quarter, 0.5 = new, 0.75 = first quarter.
  // Waning shadows grow from the right limb, waxing recede toward the left
  // (northern hemisphere). Draws into ctx; caller sets fill and calls fill().
  function traceShadow(ctx, size, fraction) {
    const f = fraction - Math.floor(fraction);
    if (f < 0.02 || f > 0.98) return false; // effectively full
    const r = size / 2, cx = size / 2, cy = size / 2;
    const waning = f < 0.5;
    const cRaw = Math.cos(2 * Math.PI * f) * r;
    const crossing = waning ? cRaw : -cRaw;
    const s = crossing / r;
    const k = 0.5522847498;

    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    // dark-side limb arc, top → bottom (right limb waning, left waxing)
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waning);
    // terminator, bottom → top: half-ellipse through (crossing, 0)
    ctx.bezierCurveTo(cx + k * r * s, cy + r, cx + r * s, cy + k * r, cx + r * s, cy);
    ctx.bezierCurveTo(cx + r * s, cy - k * r, cx + k * r * s, cy - r, cx, cy - r);
    ctx.closePath();
    return true;
  }

  // Surrounding full moons of `now` (for the live widget): { lastFull, nextFull }.
  function surroundingFullMoons(now = new Date()) {
    const yr = now.getFullYear() + (now.getMonth() + 1) / 12;
    let k = Math.floor((yr - 2000) * 12.3685) - 3;
    let last = null, next = null;
    for (let i = 0; i < 8; i++) {
      const kk = k + i + 0.5;
      const y = 2000 + kk / 12.3685;
      const ms = (fullMoonJDE(kk) - deltaTsec(y) / 86400 - 2440587.5) * 86400 * 1000;
      if (ms <= now.getTime()) last = ms;
      else if (next === null) next = ms;
    }
    return { lastFull: new Date(last), nextFull: new Date(next) };
  }

  return { fullMoonJDE, deltaTsec, build, phaseFraction, layoutMoons,
           traceShadow, surroundingFullMoons, isTotalEclipse, eclipseInstants };
})();

if (typeof module !== "undefined" && module.exports) module.exports = MoonMath;
