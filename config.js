/*
 * QuelleHeure - configuration
 *
 * demo: true  -> local fake checkout (no transaction, no data).
 * demo: false -> buttons open the Stripe Payment Links below.
 *
 * For each Stripe link (Dashboard > Payment Links), set the
 * after-payment redirect to:
 *   https://YOUR_DOMAIN/?unlock=hour|minutes|seconds|pack|city
 * (the "pack" link also serves the "Refresh the time" button).
 */
window.QH_CONFIG = {
  demo: true,
  prices: {
    hour:    '1.00',
    minutes: '1.00',
    seconds: '1.00',
    pack:    '2.50',
    city:    '1.00',
    refresh: '2.50'
  },
  paymentLinks: {
    hour:    '',
    minutes: '',
    seconds: '',
    pack:    '',
    city:    '',
    refresh: ''
  }
};
