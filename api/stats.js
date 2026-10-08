// Time Right Now - /api/stats
// Returns the REAL number of paid charges from Stripe (restricted read-only key
// in the STRIPE_API_KEY env var). No database, no tracking, just the truth.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const key = process.env.STRIPE_API_KEY;
    if (!key) {
      res.status(200).json({ customers: null });
      return;
    }
    let count = 0;
    let startingAfter = '';
    for (let page = 0; page < 5; page++) {
      const url = 'https://api.stripe.com/v1/charges?paid=true&limit=100' + (startingAfter ? '&starting_after=' + startingAfter : '');
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + key } });
      const j = await r.json();
      if (!j.data || !j.data.length) break;
      count += j.data.length;
      if (!j.has_more) break;
      startingAfter = j.data[j.data.length - 1].id;
    }
    res.status(200).json({ customers: count });
  } catch (e) {
    res.status(200).json({ customers: null });
  }
}
