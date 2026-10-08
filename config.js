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
    hour:      'https://buy.stripe.com/test_28E5kE6oIfno7hw2Zc08g00',
    minutes:   'https://buy.stripe.com/test_8x2bJ25kE4IK9pE6bo08g01',
    seconds:   'https://buy.stripe.com/test_aFa4gAeVefno59o6bo08g02',
    pack:      'https://buy.stripe.com/test_00wdRa4gA2AC1Xc1V808g03',
    city:      'https://buy.stripe.com/test_4gM6oI3cw1wy7hw9nA08g04',
    refresh:   '',
    roulette:  'https://buy.stripe.com/test_dRm9AU9AUb7845kfLY08g06',
    unlimited: 'https://buy.stripe.com/test_fZu5kE3cw8Z0gS60R408g05'
  }
};
