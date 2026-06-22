// Checks if an email has an active Stripe subscription — used for returning users
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sign } = require('./_token');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    const customers = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 5 });
    if (!customers.data.length) {
      return res.status(200).json({ subscribed: false });
    }

    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      });
      if (subs.data.length > 0) {
        const token = sign({ tier: 'full', exp: Date.now() + 3 * 86400000 });
        return res.status(200).json({ subscribed: true, email: customer.email, token });
      }
    }

    return res.status(200).json({ subscribed: false });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
