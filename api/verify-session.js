// Verifies a Stripe Checkout Session after successful payment redirect, or — when
// rewritten from /api/check-subscriber with ?action=check-subscriber — checks if
// an email has an active Stripe subscription (used for returning users). Merged
// into one file to stay under Vercel Hobby's 12-serverless-function cap.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sign, subscriberProof } = require('./_token');
const { rateLimit } = require('./_rateLimit');

// One-time restore codes for a subscriber on a new device (no saved token yet).
// Alana sends one; it binds to the first email it restores and still needs an
// active Stripe subscription for that email. Retire codes once used.
const RESTORE_CODES = new Set(['RESTORE-5MMDAB', 'RESTORE-JG49KU', 'RESTORE-S9739C']);

async function _redis(cmds) {
  const url = process.env.UPSTASH_REDIS_REST_URL, tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !tok) return null;
  try {
    const r = await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

// Claims the code for this email. Returns 'new', 'same' (already bound to this
// email) or null (unknown code, bound to someone else, or Redis unreachable).
async function _claimRestoreCode(code, email) {
  if (!RESTORE_CODES.has(code)) return null;
  const set = await _redis([['SET', `restorecode:${code}`, email, 'NX']]);
  if (!set) return null;
  if (set[0]?.result === 'OK') return 'new';
  const got = await _redis([['GET', `restorecode:${code}`]]);
  return got && got[0]?.result === email ? 'same' : null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (req.query.action === 'check-subscriber') {
    // Email lookups reveal who subscribes, so cap how fast anyone can try addresses
    if (!await rateLimit(req, res, { max: 20, windowSecs: 3600, prefix: 'check-subscriber' })) return;
    const { email: rawEmail, token: priorToken, restoreCode } = req.body || {};
    if (!rawEmail || !rawEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const email = rawEmail.toLowerCase().trim();
    // Renewal needs the subscriber token already saved on this device. A bare
    // email (new device, or someone typing another person's address) gets
    // needsVerification instead, never a token.
    let claimed = null;
    if (!subscriberProof(priorToken, email)) {
      const code = String(restoreCode || '').trim().toUpperCase();
      claimed = code ? await _claimRestoreCode(code, email) : null;
      if (!claimed) return res.status(200).json({ subscribed: false, needsVerification: true, badCode: !!code });
      // Free the code again if this email turns out not to be subscribed
      req._restoreCode = code;
    }
    try {
      const customers = await stripe.customers.list({ email, limit: 5 });
      if (!customers.data.length) {
        if (claimed === 'new') await _redis([['DEL', `restorecode:${req._restoreCode}`]]);
        return res.status(200).json({ subscribed: false });
      }

      for (const customer of customers.data) {
        const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 });
        if (subs.data.length > 0) {
          const token = sign({ tier: 'full', email, exp: Date.now() + 3 * 86400000 });
          return res.status(200).json({ subscribed: true, email: customer.email, token });
        }
      }
      if (claimed === 'new') await _redis([['DEL', `restorecode:${req._restoreCode}`]]);
      return res.status(200).json({ subscribed: false });
    } catch (e) {
      if (claimed === 'new') await _redis([['DEL', `restorecode:${req._restoreCode}`]]);
      return res.status(500).json({ error: e.message });
    }
  }

  const { session_id } = req.body || {};
  if (!session_id || !session_id.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.status === 'complete' || session.payment_status === 'paid') {
      const email = session.customer_details?.email || session.customer_email;
      const token = sign({ tier: 'full', email: (email || '').toLowerCase().trim() || undefined, exp: Date.now() + 3 * 86400000 });
      return res.status(200).json({ subscribed: true, email, token });
    }
    return res.status(200).json({ subscribed: false });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
