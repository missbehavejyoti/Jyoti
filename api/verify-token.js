// Verifies a signed access token — the real paywall gate. The client cannot
// forge a passing result here without the server-side ACCESS_TOKEN_SECRET.
const { verify } = require('./_token');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body || {};
  const payload = verify(token);
  if (!payload) return res.status(200).json({ valid: false });
  return res.status(200).json({ valid: true, tier: payload.tier, isTester: !!payload.isTester });
};
