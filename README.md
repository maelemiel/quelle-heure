# QuelleHeure™

Parody website, "troll but serious": you pay to know the time. Space-themed ("celestial atlas"), full English, accessibility-first.

**Live**: https://maelemiel.github.io/quelle-heure/
**Repo**: https://github.com/maelemiel/quelle-heure

## Concept

- €1.00 for the hour, €1.00 for the minutes, €1.00 for the seconds
- Complete Pack H + M + S: €2.50 (instead of €3.00)
- City of your choice: €1.00. Otherwise: animated roulette across all IANA timezones
- The time you buy is frozen at the instant of purchase. Refreshing it costs €2.50
- Purchases persist in localStorage, no data ever leaves the browser

## Run locally

```bash
python3 -m http.server 8123
# http://127.0.0.1:8123
```

Or open `index.html` directly (no dependency, no build).

## Structure

- `index.html`: single page (hero, pricing, vault, reviews, FAQ)
- `style.css`: "celestial atlas" theme (deep space, aurora teal/violet, star gold, glass cards, orrery)
- `app.js`: state, vault, roulette, demo checkout, city autocomplete, canvas starfield
- `config.js`: prices + Stripe Payment Links
- `setup-stripe.sh`: one-shot Stripe provisioning (products, prices, links) + config wiring

## Real payments (Stripe Payment Links)

Demo mode ships by default (fake checkout, no transaction). To go live:

```bash
stripe login              # browser auth, Mael only
./setup-stripe.sh         # creates 5 products/prices/links, wires config.js, demo:false
git add config.js && git commit -m "wire real Stripe payment links" && git push
```

The script is idempotent (stable idempotency keys): re-running never duplicates.
Each link redirects after payment to `https://maelemiel.github.io/quelle-heure/?unlock=<item>`,
which unlocks the purchase on return. The `pack` link also powers "Refresh the time".
Override the target with `BASE_URL=https://... ./setup-stripe.sh` if the domain changes.

## Accessibility (a11y first)

- Contrast ratios verified with the RGAA tool: star gold on deep space 12.76:1 (AAA),
  muted text on card 8.75:1 (AAA), aurora teal on card 11.68:1 (AAA), ink on gold button 9.41:1 (AAA)
- Static audit (ALLY snippet engine): 0 finding (labels, names, semantics, no positive tabindex)
- `prefers-reduced-motion`: starfield static, orrery/roulette instant, no sweeps
- Full keyboard nav, visible focus rings, `aria-live` (roulette, toasts), `aria-modal` dialogs,
  combobox pattern (listbox/option, arrows, Enter, Escape) for the city picker
- Starfield/nebulas/orrery are `aria-hidden` decorative layers

## Warning

Parody. In demo mode no real payment is processed and no data is collected.
