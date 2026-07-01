// One-off admin endpoint to manually resend the welcome email.
// Protected by PUSH_CRON_SECRET so it can't be triggered by anyone else.
// DELETE this file once used.

async function sendWelcomeEmail(email, name) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const firstName = (name || '').split(' ')[0] || 'friend';

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Jyoti <onboarding@resend.dev>',
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
          <a href="https://www.jyotiapp.app" style="display:inline-block;background:linear-gradient(135deg,#C8A94A,#a8893a);color:#0c0918;text-decoration:none;font-size:14px;letter-spacing:2px;font-family:Georgia,serif;padding:14px 36px;border-radius:8px;font-weight:bold">
            OPEN MY PRACTICE ✦
          </a>
        </td></tr>

        <tr><td style="padding-top:12px;border-top:1px solid rgba(200,169,74,.12)">
          <p style="font-size:12px;color:#5a5060;line-height:1.7;margin:16px 0 0;text-align:center">
            Your subscription renews monthly. Cancel anytime from your Stripe customer portal.<br>
            Questions? Write to <a href="mailto:hellojyoti@proton.me" style="color:#8a7a5a">hellojyoti@proton.me</a><br><br>
            Jyoti Pty Ltd · Queensland, Australia
          </p>
          <p style="font-size:11px;color:#3a3045;line-height:1.6;margin:12px 0 0;text-align:center">
            Jyoti is a living platform, growing with each passing moon. If something feels off or isn't working as expected, we'd love to hear from you at hellojyoti@proton.me. We're listening and will respond promptly.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }),
  });

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Resend error ${r.status}: ${body}`);
  }
  return await r.json();
}

module.exports = async (req, res) => {
  const key = req.query?.key || req.headers['x-cron-key'];
  if (!process.env.PUSH_CRON_SECRET || key !== process.env.PUSH_CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const email = (req.query?.email || '').trim();
  const name = (req.query?.name || '').trim();
  if (!email) return res.status(400).json({ error: 'email query param required' });

  try {
    const result = await sendWelcomeEmail(email, name);
    return res.status(200).json({ ok: true, email, result });
  } catch (e) {
    console.error('resend-welcome error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
