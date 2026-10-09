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
    hour:      'https://buy.stripe.com/00wdR96nb9Ag87M6xH1sQ0y',
    minutes:   'https://buy.stripe.com/8x2bJ1cLzcMs1Jo7BL1sQ0z',
    seconds:   'https://buy.stripe.com/8x228r8vj5k0ewa1dn1sQ0A',
    pack:      'https://buy.stripe.com/7sY28r7rfaEk0Fk2hr1sQ0B',
    city:      'https://buy.stripe.com/28EbJ1dPDbIo3Rw3lv1sQ0C',
    refresh:   '',
    roulette:  'https://buy.stripe.com/3cIcN5bHv7s8ds67BL1sQ0D',
    unlimited: 'https://buy.stripe.com/dRm14ndPDdQw2Ns4pz1sQ0E',
  }
};
