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

## After DNS (either path)

- `curl -sI https://lifeinmoons.com | head -3` → 200 + valid cert.
- Check OG unfurl (iMessage/WhatsApp paste), favicon, privacy + support pages,
  404 page, calculator on a real phone.
- Swap CTA when ready — targets staged in the comment above the button in
  index.html (TestFlight now-ish, App Store later).
- Backup note: full-history bundles live in `~/Documents/backups/`.
