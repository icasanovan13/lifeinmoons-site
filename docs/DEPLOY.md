# Deploying lifeinmoons.com

Status 2026-07-12: site complete and verified; GitHub repo pending (Isabella
creates it — visibility is her call); domain registrar unknown until she has it.

## Step 1 — GitHub repo (Isabella, ~30s)

github.com/new → name `lifeinmoons-site` → visibility:
- **Public** → can use GitHub Pages directly (free plan requires public for Pages).
- **Private** → use Vercel instead (free, serves from private repos).
Create EMPTY (no README), then Claude pushes:
`git remote add origin https://github.com/icasanovan13/lifeinmoons-site.git && git push -u origin main`

## Step 2a — GitHub Pages path (public repo)

1. Enable: `POST /repos/icasanovan13/lifeinmoons-site/pages` with
   `{"source":{"branch":"main","path":"/"}}` (or Settings ▸ Pages in UI).
2. Site appears at `https://icasanovan13.github.io/lifeinmoons-site/` — verify.
3. Custom domain: write `lifeinmoons.com` into a `CNAME` file at repo root and
   push (or set in Pages settings, which commits the same file).
4. DNS at her registrar:
   - Apex `lifeinmoons.com`: **A records** → 185.199.108.153, 185.199.109.153,
     185.199.110.153, 185.199.111.153 (all four)
   - `www`: **CNAME** → `icasanovan13.github.io`
5. Pages settings ▸ Enforce HTTPS (after cert issues, ~minutes to an hour).

## Step 2b — Vercel path (private repo OK)

1. vercel.com → sign in with GitHub → Import `lifeinmoons-site` → Framework:
   Other, no build step, output = repo root. Deploy.
2. Project ▸ Settings ▸ Domains → add `lifeinmoons.com` + `www.lifeinmoons.com`.
3. DNS at registrar (Vercel shows the same values):
   - Apex: **A** → 76.76.21.21
   - `www`: **CNAME** → `cname.vercel-dns.com`
4. HTTPS is automatic.

## Payments ($2.99 unlock — Stripe + Cloudflare Worker)

Architecture: static site → Stripe Payment Link (hosted checkout) → redirect
back with `?session_id=…` → Cloudflare Worker (`worker/verify.js`) confirms the
session is paid via a restricted Stripe key → browser stores the unlock in
localStorage. Restore = receipt email → `/restore`. Config knobs live in ONE
place: `window.LIM_CONFIG` in `index.html`. Both values empty ⇒ paywall
dormant (site fully free, no card, no poster button).

Setup (test mode first — toggle "Test mode" in the Stripe dashboard):
1. Stripe → Products: "Life in Moons — your sky + poster", $2.99 one-time →
   create **Payment Link** → After payment: redirect to
   `https://lifeinmoons.com/?session_id={CHECKOUT_SESSION_ID}`.
2. Stripe → Developers → API keys → **Create restricted key**:
   Checkout Sessions = Read, all else None.
3. Cloudflare (free) → Workers → Create → paste `worker/verify.js` → Deploy.
   Settings → Variables and Secrets: `STRIPE_KEY` = restricted key,
   `SIGN_SECRET` = any long random string. Note the `*.workers.dev` URL.
4. Fill `LIM_CONFIG` in index.html (paymentLink + verifyURL), push.
5. Test purchase with card `4242 4242 4242 4242` (any future expiry/CVC):
   returns to the site → grid unblurs → poster downloads. Test `/restore`
   with the receipt email in a private window.
6. Go live: flip Payment Link + restricted key to LIVE mode versions, update
   `STRIPE_KEY` in the Worker and `paymentLink` in index.html, push.

Worker checks: `curl "https://<worker>/verify?session_id=cs_test_bogus"` →
`{"ok":false…}`; a real paid test session id → `{"ok":true,"token":…}`.
Refunds: Stripe dashboard (the unlock stays on the buyer's device; fresh
verifies of a refunded session fail).

## After DNS (either path)

- `curl -sI https://lifeinmoons.com | head -3` → 200 + valid cert.
- Check OG unfurl (iMessage/WhatsApp paste), favicon, privacy + support pages,
  404 page, calculator on a real phone.
- Swap CTA when ready — targets staged in the comment above the button in
  index.html (TestFlight now-ish, App Store later).
- Backup note: full-history bundles live in `~/Documents/backups/`.
