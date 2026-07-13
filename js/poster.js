// LifeInMoons — the A2 print poster, in the browser.
//
// A faithful port of the app's Poster.swift: A2 (420 × 594 mm), all-vector,
// filled moons for the life lived, outlines for the life ahead, a two-line
// date under every moon, the current moon ringed. Differences from the app:
// no memory stars (the web knows no memories), and PDF core fonts — Times for
// the serif voice, Helvetica for the tracked caps — since New York can't ship.
//
// The app draws translucent cream over a flat night background; here every
// alpha is pre-blended into a solid color (identical ink on the page, and no
// reliance on PDF graphics-state support).

const Poster = (() => {
  const pageW = 1190.55, pageH = 1683.78; // 420 × 594 mm in points
  const NIGHT = [10, 14, 25], CREAM = [242, 231, 206];
  const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY",
                  "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const MON3 = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  // cream at `a` over the night ground, as a solid color
  const blend = a => CREAM.map((c, i) => Math.round(c * a + NIGHT[i] * (1 - a)));

  function text(doc, str, o) {
    doc.setFont(o.font || "helvetica", o.style || "normal");
    doc.setFontSize(o.size);
    const c = blend(o.alpha === undefined ? 1 : o.alpha);
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(str, o.cx - (o.kern || 0) / 2, o.y, {
      align: "center", baseline: "top", charSpace: o.kern || 0,
    });
  }

  function hairline(doc, y) {
    const c = blend(0.25);
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(0.6);
    doc.line(pageW * 0.3, y, pageW * 0.7, y);
  }

  // life: { birthday: Date, horizon, moons, current, count }
  function build(life) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: [pageW, pageH], compress: true });

    doc.setFillColor(NIGHT[0], NIGHT[1], NIGHT[2]);
    doc.rect(0, 0, pageW, pageH, "F");

    // title block — formatted from date components, like the app
    const b = life.birthday;
    const bornStr = MONTHS[b.getMonth()] + " " + b.getDate() + " " + b.getFullYear();
    text(doc, "LIFE IN MOONS", { font: "times", style: "bold", size: 64,
                                 kern: 20, cx: pageW / 2, y: 92 });
    text(doc, "BORN " + bornStr + " · A HORIZON OF " + life.horizon +
              " YEARS · " + life.count + " FULL MOONS",
         { size: 14, alpha: 0.55, kern: 3.5, cx: pageW / 2, y: 190 });
    hairline(doc, 232);

    // grid — the same solver as Poster.swift
    const margin = 72, top = 272;
    const usableW = pageW - margin * 2;
    const usableH = (pageH - 108) - top;
    const n = Math.max(1, life.count);
    let cols = Math.ceil(usableW / Math.sqrt(usableW * usableH / n));
    while (Math.ceil(n / cols) * (usableW / cols) > usableH) cols += 1;
    const cell = usableW / cols;
    const dotR = cell * 0.24;
    const dateSize = Math.min(6.0, cell * 0.15);

    const past = blend(0.9), ring = blend(0.6), future = blend(0.35);
    const dateA = blend(0.55), dateB = blend(0.38);

    for (const m of life.moons) {
      const i = m.number - 1;
      const cx = margin + (i % cols) * cell + cell / 2;
      const cy = top + Math.floor(i / cols) * cell + cell * 0.27;

      if (m.number < life.current) {
        doc.setFillColor(past[0], past[1], past[2]);
        doc.circle(cx, cy, dotR, "F");
      } else if (m.number === life.current) {
        doc.setFillColor(CREAM[0], CREAM[1], CREAM[2]);
        doc.circle(cx, cy, dotR, "F");
        doc.setDrawColor(ring[0], ring[1], ring[2]);
        doc.setLineWidth(0.8);
        doc.circle(cx, cy, dotR * 1.5, "S");
      } else {
        doc.setDrawColor(future[0], future[1], future[2]);
        doc.setLineWidth(0.7);
        doc.circle(cx, cy, dotR, "S");
      }

      // two stacked lines — "JUN 29" over "2026" — so dates never collide
      const dateY = cy + dotR + 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(dateSize);
      doc.setTextColor(dateA[0], dateA[1], dateA[2]);
      doc.text(MON3[m.date.getMonth()] + " " + m.date.getDate(),
               cx, dateY, { align: "center", baseline: "top", charSpace: 0.35 });
      doc.setTextColor(dateB[0], dateB[1], dateB[2]);
      doc.text(String(m.date.getFullYear()),
               cx, dateY + dateSize + 1.2, { align: "center", baseline: "top", charSpace: 0.35 });
    }

    // footer
    hairline(doc, pageH - 78);
    text(doc, "THE MOONS BEHIND YOU, LIT · THE ONES AHEAD, WAITING",
         { size: 11, alpha: 0.45, kern: 3, cx: pageW / 2, y: pageH - 64 });

    return doc;
  }

  function download(life) { build(life).save("Life in Moons.pdf"); }
  function dataURI(life) { return build(life).output("datauristring"); }

  return { build, download, dataURI };
})();
