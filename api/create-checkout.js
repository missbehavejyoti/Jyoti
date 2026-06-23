// Creates a Stripe Checkout Session for a monthly subscription, or — when
// rewritten from /api/create-portal-session with ?action=portal — a Billing
// Portal session so subscribers can manage/cancel their own subscription.
// Merged into one file to stay under Vercel Hobby's 12-serverless-function cap.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const origin = `${protocol}://${host}`;

  if (req.query.action === 'portal') {
    try {
      const customers = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 1 });
      if (!customers.data.length) {
        return res.status(404).json({ error: 'No subscription found for this email' });
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: customers.data[0].id,
        return_url: `${origin}/`,
      });
      return res.status(200).json({ url: session.url });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return res.status(500).json({ error: 'Payment not configured' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
