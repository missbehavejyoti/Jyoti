// Owner + beta access codes — checked server-side so the codes themselves
// never ship in the public client JS (the old client-only check leaked them
// to anyone who viewed page source).
// Configure via env vars:
//   OWNER_CODE      — single permanent code, grants full tier forever
//   BETA_CODES      — comma-separated list, e.g. "NADI2026A,NADI2026B"
//   BETA_END_DATE   — ISO date string; beta codes stop working after this
const { rateLimit } = require('./_rateLimit');
const { sign } = require('./_token');

const BETA_CODES = new Set(
  (process.env.BETA_CODES || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
);
const BETA_END = new Date(process.env.BETA_END_DATE || '2026-06-21T00:00:00').getTime();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!await rateLimit(req, res, { max: 10, windowSecs: 3600, prefix: 'redeem-beta' })) return;

  const code = ((req.body || {}).code || '').trim().toUpperCase();
  const ownerCode = process.env.OWNER_CODE;

  if (ownerCode && code === ownerCode) {
    const token = sign({ tier: 'full', isTester: true, exp: Date.now() + 10 * 365 * 86400000 });
    return res.status(200).json({ ok: true, tier: 'full', token });
  }

  if (BETA_CODES.has(code)) {
    if (Date.now() > BETA_END) return res.status(200).json({ ok: false, expired: true });
    const token = sign({ tier: 'beta', isTester: true, exp: BETA_END });
    return res.status(200).json({ ok: true, tier: 'beta', token });
  }

  return res.status(200).json({ ok: false });
};
