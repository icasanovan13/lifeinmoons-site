# lifeinmoons.com — Claude context

The landing page for Isabella's LifeInMoons iOS app (`~/Desktop/LifeInMoons` —
read that repo's CLAUDE.md for the app itself). Static site, no framework, no
dependencies. Design = the app's design system: night `#0A0E19`, moon cream
`#F2E7CE`, serif voice (`ui-serif` → New York on iPhone), tracked-caps labels,
hairlines, whisper-quiet, reveals over decoration. Direction "A — the moon that
looks back" chosen by Isabella from three mocked artifacts (2026-07-11).

## Layout

| Path | Owns |
|---|---|
| `index.html` | The page: hero (WebGL moon) → story → calculator → tonight → vignettes → CTA |
| `privacy.html`, `support.html` | The two URLs App Store review requires |
| `js/moonmath.js` | Line-for-line port of the app's LunarMath + layoutMoons + phase terminator + NASA eclipse table. Verified: #288 / 2026-06-29 / next eclipse 2028-12-31 / 1002 moons at horizon 80 |
| `js/moonglobe.js` | Hand-rolled WebGL textured sphere (no three.js): 40s/rev, pointer tilt, eclipse tint, reduced-motion still frame, pauses offscreen |
| `js/site.js` | starfield, lifeGrid (ripple reveal + breathing current moon), calculator, tonight widget, scroll reveals, page boot |
| `assets/` | moontex.jpg (1024×512, from app's MoonTexture), moonsmall.png, favicons, og.png |
| `tools/og.html` | OG-card generator (screenshot at --window-size=1200,717, then `sips --cropOffset 0 0 -c 630 1200`) |
| `tools/artifact.py` | Builds self-contained preview → `mockups/dist/a.html`; republishing that path keeps the artifact URL |
| `tools/phone.html` | 390px iframe harness for phone-width headless screenshots (`?page=../index.html&scroll=0.5&date=2003-04-09&reveal=1`) |
| `mockups/` | The three direction drafts (A/B/C) + build.py; `dist/` is gitignored |

## Verify recipe (headless Chrome on this Mac — no node, no cliclick)

- Serve: `python3 -m http.server 8765` in the repo, screenshot with
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --screenshot=out.png --window-size=W,H --virtual-time-budget=9000 <url>`.
- **Never pass `--disable-gpu`** — it silently kills WebGL (blank moon).
- Headless enforces a ~500px minimum window width and lops ~87px off the height;
  phone layouts go through `tools/phone.html`.
- `--virtual-time-budget` freezes rAF animations mid-flight — a half-finished
  grid ripple or count-up in a screenshot is the freeze, not a bug.
- Console errors: `--enable-logging=stderr --dump-dom … | grep -i error`.
- JS-only checks run via `osascript -l JavaScript` (JavaScriptCore).

## Paywall ($2.99 — grid + poster)

The moon COUNT is free (the hook); the full dated grid + A2 poster are the
$2.99 unlock. App stays $4.99 with everything — the paycard upsells it.
- `js/paywall.js` — unlock state (localStorage `lim_unlock`), Stripe Payment
  Link hand-off, `?session_id=` return, restore-by-email. `?paywall=mock` on
  the page URL = demo mode (fake checkout) for previews/tests.
- `worker/verify.js` — Cloudflare Worker (holds the restricted Stripe key;
  `/verify`, `/restore`). Deployed by pasting into the CF dashboard.
- `js/poster.js` — jsPDF A3 poster (A2 reference space ×1/√2, matching the app standard), line-for-line port of the app's
  Poster.swift (no memory stars; Times/Helvetica for New York/SF; alpha
  pre-blended into solid colors — do the same for any new poster ink).
- Config: `window.LIM_CONFIG` in index.html — paymentLink+verifyURL empty ⇒ dormant; `appStoreURL` turns the card’s ghost “full app · $4.99” button into a live link.
- Locked tease v2 = “one moon in the fog”: whole grid under filter:blur(7px) + mask fade + 38vh clip (pattern visible, nothing readable — the grid IS the product); the visitor’s current moon breathes CRISP in its own overlay canvas (.curmoon, skipCurrent on the main grid). NEVER use backdrop-filter under a mask — iOS Safari silently drops it (her phone caught it).
- Locked chrome: paycard + a ghost “Print your poster · $2.99” posterrow teaser — BOTH route to `Paywall.checkout()`; horizon chips hidden while locked.
- **Unlocked = the sky**: `.gridwrap.sky` breaks the grid out full-bleed (left:50% + translateX(-50%) + 100vw — margin tricks fail inside the flex column), layout solved to the viewport via `lifeGrid`’s `probeH` (`max(innerHeight*0.85, 560)`); tracked-caps `.skyline` (“N FULL MOONS LIVED · M STILL TO COME”) above, poster row below; paycard gone. Width-only debounced resize re-render (height-only churn = iOS URL bar, ignored).
- **The unlock film** (`unlockSequence`, site.js): plays ONCE at the unlock event (Stripe return / restore / mock buy) — fog deepens & swallows the grid (.unveil: blur 7→14, opacity→0, height tween h0→h1), paycard sinks (.fadeout), then a full ripple re-render into the sky, skyline+posterrow breathe in late (.settling). `revealed` flag inside `lim_unlock` (paywall.js `revealed()/markRevealed()`; `store()` merge-preserves it — lose that and every re-verify replays the film). Boot marks pre-film buyers revealed (no ambush); reduced-motion skips to the calm state.
- **`[hidden] { display:none !important }` is load-bearing** (site.css, top): author display rules (.paycard/.posterrow flex) silently DEFEAT the hidden attribute otherwise — this exact bug shipped as “paycard survives purchase” + “dead poster button while locked” until Isabella’s phone caught it. Probe computed display, not just the property, when verifying visibility.
- poster.js `text()` centers kerned text as `(cx − (len−1)·kern/2)` — jsPDF’s align:center ignores charSpace; the naive kern/2 shipped every web poster ~4% right of center until the b-text size bump exposed it.
- Setup/test/go-live recipe: docs/DEPLOY.md § Payments.
- Harness params (tools/phone.html): `paywall=mock`, `unlock=1` (calm unlocked: mock+revealed), `clear=1`, `date=` (animated entry), `bday=` (pre-seeded, renders WITHOUT animation — use for finished-grid screenshots; `date=` freezes mid-ripple under --virtual-time-budget), `buy=1|poster` (clicks through the real mock unlock event → film), `w=`/`h=` (iframe size, desktop shots), `settle=` (probe delay ms), `probe=1` (state JSON in outer <title>, includes computed display).

## Deploy (LIVE)

- **https://lifeinmoons.com is live**: GitHub Pages from `icasanovan13/lifeinmoons-site`
  (public), whois.com DNS (4 apex A records + www CNAME), HTTPS on. **Push = deploy** —
  verify headlessly BEFORE pushing, and pushes need Isabella's explicit go.
- Payments: Stripe TEST mode wired (sandbox payment link in LIM_CONFIG + CF Worker
  `lifeinmoons-verify.icasanovan.workers.dev`, secrets STRIPE_KEY/SIGN_SECRET set
  2026-07-15 — the Worker shows "not paid"/"no purchase" if its key can't see the
  sandbox; a mangled secret paste caused exactly that). Go-live: docs/DEPLOY.md § Payments step 6.
- CTA is a dead "Coming soon" button by design; swap targets live in an HTML
  comment above it (TestFlight `https://testflight.apple.com/join/xEZDrdhx` once
  Beta App Review clears; App Store URL once published).
