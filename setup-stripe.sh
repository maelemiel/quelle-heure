#!/usr/bin/env bash
# QuelleHeure - Stripe setup (LIVE mode)
# Creates products, prices and payment links, then wires the real URLs into
# config.js (demo -> false). Prereq: `stripe login` (browser) or STRIPE_API_KEY.
# Re-run safe: stable idempotency keys, no duplicates.
set -euo pipefail

BASE_URL="${BASE_URL:-https://maelemiel.github.io/quelle-heure/}"
DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$DIR/config.js"
FLAGS="--live"   # the CLI refuses live commands without this flag

if ! out=$(stripe $FLAGS payment_links list --limit 1 2>&1); then
  echo "Stripe CLI not usable. Real error was:"
  echo "$out" | head -5
  echo
  echo "Fix: run 'stripe login' (browser auth), then retry."
  exit 1
fi

id() { python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])'; }

setup_item() { # key name cents description
  local key="$1" name="$2" cents="$3" desc="$4"
  local prod price link
  prod=$(stripe $FLAGS products create --name "$name" --description "$desc" \
    --idempotency-key "qh-${key}-prod-v1" | id)
  price=$(stripe $FLAGS prices create --product "$prod" --unit-amount "$cents" --currency eur \
    --idempotency-key "qh-${key}-price-v1" | id)
  link=$(stripe $FLAGS payment_links create \
    -d "line_items[0][price]=$price" -d "line_items[0][quantity]=1" \
    --after-completion.type=redirect --after-completion.redirect.url="$BASE_URL?unlock=$key" \
    --idempotency-key "qh-${key}-link-v1" | id)
  echo "$key -> $link"
  python3 - "$CONFIG" "$key" "$link" <<'PY'
import sys, re
path, key, link = sys.argv[1], sys.argv[2], sys.argv[3]
src = open(path).read()
src = re.sub(r"(%s:\s*)''" % key, r"\1'%s'" % link, src)
src = src.replace("demo: true", "demo: false", 1)
open(path, "w").write(src)
PY
}

setup_item hour    "The Hour"                100 "Know which hour you're living in. That's already a lot, honestly."
setup_item minutes "The Minutes"             100 "For precise people. The ones who show up on time, ironically."
setup_item seconds "The Seconds"             100 "The elite of time. Reserved for seasoned chronophiles."
setup_item pack    "The Complete Pack"       250 "Hour, minutes and seconds, delivered in a single glance."
setup_item city    "The City of Your Choice" 100 "You pick the timezone. Otherwise, the world roulette decides for you."

echo
echo "config.js updated (demo: false). Publish it:"
echo "  cd $DIR && git add config.js && git commit -m 'wire real Stripe payment links' && git push"
