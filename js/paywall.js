// LifeInMoons — the $2.99 unlock.
//
// The site stays static: Stripe's hosted Payment Link takes the money, then
// redirects back with ?session_id=…; a tiny Cloudflare Worker (worker/verify.js)
// confirms with Stripe that the session is paid and mints an unlock token the
// browser keeps in localStorage. Restore on another device = the receipt email.
//
// Config lives in index.html as window.LIM_CONFIG = { paymentLink, verifyURL }.
// With either value empty the paywall is DORMANT: the calculator stays fully
// free and no card is shown (how the site behaved before payments).
// A mock mode (config.mock, used by the artifact preview) fakes the checkout.

const Paywall = (() => {
  const cfg = window.LIM_CONFIG || {};
  // demo hook for previews/tests: ?paywall=mock enables the flow with a fake
  // checkout (used by the artifact preview and the headless harness)
  if (new URLSearchParams(location.search).get("paywall") === "mock") cfg.mock = true;
  const KEY = "lim_unlock";

  function enabled() {
    return !!cfg.mock || (!!cfg.paymentLink && !!cfg.verifyURL);
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || mem; }
    catch { return mem; }
  }

  function unlocked() {
    if (!enabled()) return false;
    const u = read();
    return !!(u && (u.mock || (u.sid && u.token)));
  }

  function store(unlock) {
    // merge-preserve `revealed` — a re-verify/restore must not replay the film
    const prev = read();
    const full = { ...unlock, revealed: !!(prev && prev.revealed), ts: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(full)); }
    catch { /* private browsing — unlock lives for the session via memory below */ }
    mem = full;
  }
  let mem = null;

  // the one-time unlock reveal: played the moment a purchase lands, never again
  function revealed() {
    const u = read();
    return !!(u && u.revealed);
  }
  function markRevealed() {
    const u = { ...(read() || {}), revealed: true };
    try { localStorage.setItem(KEY, JSON.stringify(u)); } catch {}
    mem = u;
  }

  // → Stripe. The birthday never travels: it's already in localStorage
  //   (lim_birthday) and only ever read back by this browser.
  function checkout() {
    if (cfg.mock) { store({ mock: true }); return Promise.resolve("mock"); }
    location.href = cfg.paymentLink;
    return new Promise(() => {}); // navigation takes over
  }

  async function callWorker(path) {
    const r = await fetch(cfg.verifyURL.replace(/\/$/, "") + path);
    const d = await r.json().catch(() => ({ ok: false, why: "bad response" }));
    return d;
  }

  // On page load: did we just come back from Stripe?
  // Returns "unlocked" | "failed" | null (no session in URL).
  async function handleReturn() {
    const q = new URLSearchParams(location.search);
    const sid = q.get("session_id");
    if (!sid || !enabled() || cfg.mock) return null;
    // tidy the URL either way — the id shouldn't linger in the address bar
    history.replaceState(null, "", location.pathname);
    const d = await callWorker("/verify?session_id=" + encodeURIComponent(sid));
    if (d.ok) { store({ sid: d.sid, token: d.token }); return "unlocked"; }
    return "failed";
  }

  async function restore(email) {
    if (cfg.mock) { store({ mock: true }); return { ok: true }; }
    const d = await callWorker("/restore?email=" + encodeURIComponent(email.trim()));
    if (d.ok) store({ sid: d.sid, token: d.token });
    return d;
  }

  // classic-script const doesn't reach window — export explicitly so the
  // test harness (tools/phone.html) and console debugging can see the state
  return (window.Paywall =
    { enabled, unlocked, checkout, handleReturn, restore, revealed, markRevealed });
})();
