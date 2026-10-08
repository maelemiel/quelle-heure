/*
 * QuelleHeure - configuration
 *
 * demo: true  -> local fake checkout (no transaction, no data).
 * demo: false -> buttons open the Stripe Payment Links below.
 *
 * Generate all links at once (creates products, prices, links, wires this file):
 *   STRIPE_API_KEY=sk_test_... ./setup-stripe.sh   (sandbox)
 *   STRIPE_API_KEY=sk_live_... ./setup-stripe.sh   (live, restricted key recommended)
 * Each link redirects after payment to
 *   https://YOUR_DOMAIN/?unlock=hour|minutes|seconds|pack|city|unlimited
 * ("pack" also serves "Refresh the time" for non-subscribers;
 *  Unlimited subscribers refresh for free, client-side.)
 * A wired sandbox config is kept locally in config.local.js (gitignored).
 */
window.QH_CONFIG = {
  demo: true,
  prices: {
    hour:      '1.00',
    minutes:   '1.00',
    seconds:   '1.00',
    pack:      '2.50',
    city:      '1.00',
    refresh:   '2.50',
    unlimited: '9.99'
  },
  paymentLinks: {
    hour:      '',
    minutes:   '',
    seconds:   '',
    pack:      '',
    city:      '',
    refresh:   '',
    unlimited: ''
  }
};
