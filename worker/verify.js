// LifeInMoons — payment verifier (Cloudflare Worker).
//
// Deploy: Cloudflare dashboard → Workers & Pages → Create Worker → paste this
// file → Deploy. Then Settings → Variables and Secrets:
//   STRIPE_KEY   (secret) — restricted Stripe API key, Checkout Sessions: Read
//   SIGN_SECRET  (secret) — any long random string; signs unlock tokens
//
// Endpoints (GET, JSON):
//   /verify?session_id=cs_…   → {ok:true, token, sid} if that checkout is paid
//   /restore?email=…          → same, by receipt email (most recent paid session)
//
// CORS is locked to the site. Stripe is the only upstream. No state, no logs
// of personal data. Complements: js/paywall.js on the site.

const ALLOWED_ORIGINS = [
  "https://lifeinmoons.com",
  "https://www.lifeinmoons.com",
  "http://localhost:8765", // local testing
];

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function stripe(env, path) {
  const r = await fetch("https://api.stripe.com/v1" + path, {
    headers: { Authorization: "Bearer " + env.STRIPE_KEY },
  });
  return r.json();
}

function paid(session) {
  return session && session.payment_status === "paid" && session.status === "complete";
}

async function unlockResponse(env, session, headers) {
  const token = await hmac(env.SIGN_SECRET, session.id);
  return new Response(JSON.stringify({ ok: true, sid: session.id, token }), { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request.headers.get("Origin") || "");
    if (request.method === "OPTIONS") return new Response(null, { headers });

    const deny = (why, status = 402) =>
      new Response(JSON.stringify({ ok: false, why }), { status, headers });

    try {
      if (url.pathname === "/verify") {
        const sid = url.searchParams.get("session_id") || "";
        if (!/^cs_[a-zA-Z0-9_]+$/.test(sid)) return deny("bad session id", 400);
        const session = await stripe(env, "/checkout/sessions/" + sid);
        if (!paid(session)) return deny("not paid");
        return unlockResponse(env, session, headers);
      }

      if (url.pathname === "/restore") {
        const email = (url.searchParams.get("email") || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
          return deny("bad email", 400);
        const list = await stripe(env,
          "/checkout/sessions?limit=100&customer_details[email]=" + encodeURIComponent(email));
        const hit = (list.data || []).find(paid);
        if (!hit) return deny("no purchase found for that email");
        return unlockResponse(env, hit, headers);
      }

      return deny("not found", 404);
    } catch (e) {
      return deny("upstream error", 502);
    }
  },
};
