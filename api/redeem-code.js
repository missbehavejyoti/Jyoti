// One-time gift codes — each code redeems exactly once, ever, across all devices,
// via Redis SET...NX (atomic "set if not already set"). Granted access lasts
// GIFT_DAYS from the moment of redemption. Add an entry to GIFT_CODES for each
// person you want to gift trial access to.
const { rateLimit } = require('./_rateLimit');

const GIFT_CODES = new Set(['IVAN30TRIAL']);
const GIFT_DAYS = 30;

async function _redisSetNX(key, value) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const resp = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, value, 'NX']]),
  });
  if (!resp.ok) return null;
  const result = await resp.json();
  return result[0]?.result ?? null; // 'OK' if newly set, null if already redeemed (or Redis unreachable)
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!await rateLimit(req, res, { max: 10, windowSecs: 3600, prefix: 'redeem-code' })) return;

  const code = ((req.body || {}).code || '').trim().toUpperCase();
  if (!GIFT_CODES.has(code)) {
    return res.status(200).json({ ok: false });
  }

  // Fail closed on any Redis ambiguity (already used OR unreachable) — never grant
  // a second free redemption just because Redis hiccuped.
  const result = await _redisSetNX(`giftcode:${code}`, new Date().toISOString());
  if (result !== 'OK') {
    return res.status(200).json({ ok: false });
  }

  return res.status(200).json({ ok: true, expiresAt: Date.now() + GIFT_DAYS * 86400000 });
};
