// Stripe webhook handler — verifies events by retrieving from Stripe API
// (avoids raw-body parsing issues on Vercel serverless functions)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { id: eventId } = req.body || {};
  if (!eventId) return res.status(400).json({ error: 'Missing event id' });

  let event;
  try {
    event = await stripe.events.retrieve(eventId);
  } catch (e) {
    return res.status(400).json({ error: 'Could not verify event: ' + e.message });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    console.log('New subscriber:', email, '| session:', session.id, '| customer:', session.customer);
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    console.log('Subscription cancelled:', sub.id, '| customer:', sub.customer);
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    console.log('Payment failed for customer:', invoice.customer, '| email:', invoice.customer_email);
  }

  return res.status(200).json({ received: true });
};
