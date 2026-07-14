#!/usr/bin/env bash
# Create the Life in Moons $2.99 product + price + payment link via the Stripe API.
#
# The Stripe secret key is read from an env file OUTSIDE this (PUBLIC) repo, so it
# never enters git or the chat. TEST keys only — this script refuses live keys.
#
#   1) In the *Life in Moons* Stripe account (top-left switcher — not Neatlyst!):
#      Developers -> API keys -> copy the "Secret key" (starts sk_test_).
#   2) Put it in ~/.lifeinmoons-stripe.env  (home folder, NOT the repo):
#         STRIPE_TEST_KEY=sk_test_xxxxxxxxxxxx
#   3) Run:  bash tools/stripe-setup.sh
#      It prints only the payment link (public, safe to share). Send it to Claude.

set -euo pipefail
ENV_FILE="${1:-$HOME/.lifeinmoons-stripe.env}"
[ -f "$ENV_FILE" ] || { echo "No env file at $ENV_FILE — see the header of this script."; exit 1; }
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
KEY="${STRIPE_TEST_KEY:-}"
case "$KEY" in
  sk_test_*) : ;;
  sk_live_*) echo "Refusing to run with a LIVE key. Use a sk_test_ key for the rehearsal."; exit 1 ;;
  *) echo "STRIPE_TEST_KEY is missing or not a Stripe secret key."; exit 1 ;;
esac

# uses the key via curl -u; never echoes it
api() { curl -s "https://api.stripe.com/v1/$1" -u "$KEY:" "${@:2}"; }
pluck() { python3 -c 'import sys,json
d=json.load(sys.stdin)
if "error" in d: sys.exit("Stripe error: " + d["error"].get("message","?"))
print(d["'"$1"'"])'; }

echo "Creating product…"
pid=$(api products \
  -d "name=Life in Moons — your sky + poster" \
  --data-urlencode "description=Your full moon calendar, every moon dated — plus the printable A3 poster." \
  | pluck id)

echo "Creating \$2.99 price…"
price=$(api prices -d "product=$pid" -d unit_amount=299 -d currency=usd | pluck id)

echo "Creating payment link…"
link=$(api payment_links \
  -d "line_items[0][price]=$price" -d "line_items[0][quantity]=1" \
  -d "after_completion[type]=redirect" \
  --data-urlencode "after_completion[redirect][url]=https://lifeinmoons.com/?session_id={CHECKOUT_SESSION_ID}" \
  | pluck url)

echo
echo "PAYMENT LINK: $link"
echo "(Send that line to Claude. Your key never left this machine.)"
