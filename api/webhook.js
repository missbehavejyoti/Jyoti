// Stripe webhook handler — verifies events by retrieving from Stripe API
// (avoids raw-body parsing issues on Vercel serverless functions)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function sendWelcomeEmail(email, name) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // not configured — skip silently

  const firstName = (name || '').split(' ')[0] || 'friend';

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Jyoti <hello@jyotiapp.com>',
      to: email,
      subject: '✦ Welcome to Jyoti. Your sacred practice begins',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0c0918;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0918;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:rgba(200,169,74,.04);border:1px solid rgba(200,169,74,.18);border-radius:16px;padding:40px 36px;color:#e8dcc8">

        <tr><td align="center" style="padding-bottom:28px">
          <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:4px;color:#8a7a5a;text-transform:uppercase;margin-bottom:10px">SACRED DAILY PRACTICE</div>
          <div style="font-size:28px;color:#C8A94A;letter-spacing:2px">✦ Jyoti ✦</div>
        </td></tr>

        <tr><td style="padding-bottom:20px">
          <p style="font-size:17px;color:#C8A94A;margin:0 0 16px">Namaste, ${firstName}.</p>
          <p style="font-size:15px;line-height:1.8;color:#b8a898;margin:0 0 14px">
            Your Vedic birth chart is now open to you, the planets have been waiting.
          </p>
          <p style="font-size:15px;line-height:1.8;color:#b8a898;margin:0 0 14px">
            Each day Jyoti will draw from your Nadi chart to give you a precise remedy, mantra, and practice, calibrated to the exact planetary hour and your Vimshottari dasha cycle.
          </p>
          <p style="font-size:15px;line-height:1.8;color:#b8a898;margin:0">
            Return every morning. The cosmos is most potent at sunrise.
          </p>
        </td></tr>

        <tr><td align="center" style="padding:28px 0">
          <a href="https://jyotiapp.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#C8A94A,#a8893a);color:#0c0918;text-decoration:none;font-size:14px;letter-spacing:2px;font-family:Georgia,serif;padding:14px 36px;border-radius:8px;font-weight:bold">
            OPEN MY PRACTICE ✦
          </a>
        </td></tr>

        <tr><td style="padding-top:12px;border-top:1px solid rgba(200,169,74,.12)">
          <p style="font-size:12px;color:#5a5060;line-height:1.7;margin:16px 0 0;text-align:center">
            Your subscription renews monthly. Cancel anytime from your Stripe customer portal.<br>
            Questions? Write to <a href="mailto:hellojyoti@proton.me" style="color:#8a7a5a">hellojyoti@proton.me</a><br><br>
            Jyoti Pty Ltd · Queensland, Australia
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }),
  });
}

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
    const name = session.customer_details?.name || '';
    console.log('New subscriber:', email, '| session:', session.id, '| customer:', session.customer);
    if (email) {
      sendWelcomeEmail(email, name).catch(e => console.error('Welcome email failed:', e.message));
    }
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
