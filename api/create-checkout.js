// Creates a Stripe Checkout Session for a monthly subscription
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

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return res.status(500).json({ error: 'Payment not configured' });

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const origin = `${protocol}://${host}`;

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
