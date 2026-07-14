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
- Setup/test/go-live recipe: docs/DEPLOY.md § Payments.
- Harness params (tools/phone.html): `paywall=mock`, `unlock=1`, `clear=1`.

## Deploy (pending)

- Domain: **lifeinmoons.com** — registrar not yet known; Isabella to provide.
- Host: GitHub Pages or Vercel (free, custom domain + HTTPS) — pick with her.
- CTA is a dead "Coming soon" button by design; swap targets live in an HTML
  comment above it (TestFlight `https://testflight.apple.com/join/xEZDrdhx` once
  Beta App Review clears; App Store URL once published).
- After DNS: verify https://lifeinmoons.com, OG preview, and both footer pages.
