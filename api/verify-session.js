// Verifies a Stripe Checkout Session after successful payment redirect
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sign } = require('./_token');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id } = req.body || {};
  if (!session_id || !session_id.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.status === 'complete' || session.payment_status === 'paid') {
      const email = session.customer_details?.email || session.customer_email;
      const token = sign({ tier: 'full', exp: Date.now() + 3 * 86400000 });
      return res.status(200).json({ subscribed: true, email, token });
    }
    return res.status(200).json({ subscribed: false });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
