#!/usr/bin/env bash
# Time Right Now - Stripe setup (pure REST, no CLI flags needed)
# Creates products, prices, payment links (one-time + subscription),
# enables email invoices, then wires the real URLs into config.js.
#
# Usage:
#   sandbox : STRIPE_API_KEY=sk_test_... ./setup-stripe.sh
#   live    : STRIPE_API_KEY=sk_live_... ./setup-stripe.sh   (restricted key recommended)
# Optional: BASE_URL=https://your.domain/ ./setup-stripe.sh
# Re-run safe: stable Idempotency-Key headers, no duplicates.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
: "${STRIPE_API_KEY:?Set STRIPE_API_KEY (sk_test_... or sk_live_...). Dashboard > Developers > API keys.}"
export BASE_URL="${BASE_URL:-https://maelemiel.github.io/quelle-heure/}"
export CONFIG_PATH="$DIR/config.js"

python3 <<'PY'
import json, os, sys, urllib.error, urllib.parse, urllib.request

KEY = os.environ['STRIPE_API_KEY']
BASE = os.environ['BASE_URL'].rstrip('/')
CONFIG = os.environ['CONFIG_PATH']

def call(method, path, params=None, idem=None):
    req = urllib.request.Request('https://api.stripe.com/v1' + path,
                                 data=urllib.parse.urlencode(params or {}).encode(),
                                 method=method)
    req.add_header('Authorization', 'Bearer ' + KEY)
    if idem:
        req.add_header('Idempotency-Key', idem)
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print('Stripe error on %s %s:' % (method, path))
        print(e.read().decode()[:500])
        sys.exit(1)

call('GET', '/payment_links?limit=1')  # auth probe; exits with a clear error above if the key is bad

ITEMS = [
    ('hour',      'The Hour',                100, "Know which hour you're living in. That's already a lot, honestly.", ''),
    ('minutes',   'The Minutes',             100, 'For precise people. The ones who show up on time, ironically.', ''),
    ('seconds',   'The Seconds',             100, 'The elite of time. Reserved for seasoned chronophiles.', ''),
    ('pack',      'The Complete Pack',       250, 'Hour, minutes and seconds, delivered in a single glance.', ''),
    ('city',      'The City of Your Choice', 100, 'You pick the timezone. Otherwise, the world roulette decides for you.', ''),
    ('roulette',  'The Loot Roulette',        50, 'One spin: the hour, the minutes, the seconds, or the city of your choice. Sometimes nothing.', ''),
    ('unlimited', 'Unlimited Time',          999, 'The time, continuously. Refreshes included.', 'month'),
]

import re
src = open(CONFIG).read()
link_ver = os.environ.get('LINK_VER', 'v1')  # bump to recreate links (redirect URL is baked in and not updatable)

for key, name, cents, desc, interval in ITEMS:
    prod = call('POST', '/products', {'name': name, 'description': desc}, 'qh-%s-prod-v1' % key)
    price_params = {'product': prod['id'], 'unit_amount': cents, 'currency': 'eur'}
    if interval:
        price_params['recurring[interval]'] = interval
    price = call('POST', '/prices', price_params, 'qh-%s-price-v1' % key)
    link_params = {
        'line_items[0][price]': price['id'],
        'line_items[0][quantity]': '1',
        'after_completion[type]': 'redirect',
        'after_completion[redirect][url]': BASE + '/?unlock=' + key,
    }
    # invoice_creation is not allowed with recurring prices (subscriptions invoice natively)
    if not interval:
        link_params['invoice_creation[enabled]'] = 'true'
    link = call('POST', '/payment_links', link_params, 'qh-%s-link-%s' % (key, link_ver))
    print('%s -> %s' % (key, link['url']))
    src = re.sub(r"(  %s:\\s*)'[^']*',\\s*$" % key, lambda m: m.group(1) + "'" + link['url'] + "',", src, count=1)

open(CONFIG, 'w').write(src)
print()
print('config.js updated with all payment link URLs. Publish it:')
print('  git add config.js && git commit -m "wire Stripe payment links" && git push')
PY
