/*
 * Time Right Now - configuration
 * Prices + Stripe Payment Links. A button with a wired link navigates to
 * Stripe's hosted checkout; after payment it redirects back with ?unlock=<item>.
 * Regenerate and rewire all links:
 *   STRIPE_API_KEY=sk_test_... ./setup-stripe.sh   (sandbox)
 *   STRIPE_API_KEY=rk_live_... ./setup-stripe.sh   (live, restricted key)
 */
window.TRN_CONFIG = {
  prices: {
    hour:      '1.00',
    minutes:   '1.00',
    seconds:   '1.00',
    pack:      '2.50',
    city:      '1.00',
    refresh:   '2.50',
    unlimited: '9.99',
    roulette:  '0.50'
  },
  /* Loot Roulette odds (percent weights, kept in sync with the FAQ copy) */
  rouletteWeights: { hour: 25, minutes: 20, seconds: 15, city: 10, none: 30 },
  paymentLinks: {
    hour:      'https://buy.stripe.com/test_3cI9AU00kdfgcBQ0R408g0k',
    minutes:   'https://buy.stripe.com/test_cNi14o4gA7UW7hw7fs08g0l',
    seconds:   'https://buy.stripe.com/test_7sY7sM00k1wy0T8bvI08g0m',
    pack:      'https://buy.stripe.com/test_4gMeVedRafno45kczM08g0n',
    city:      'https://buy.stripe.com/test_eVq4gAcN67UWeJY8jw08g0o',
    refresh:   '',
    roulette:  'https://buy.stripe.com/test_4gM28s3cw1wy45karE08g0p',
    unlimited: 'https://buy.stripe.com/test_8x2cN628sejk31gbvI08g0q'
  }
};
