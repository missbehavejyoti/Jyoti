// One-time gift codes — each code redeems exactly once, ever, across all devices,
// via Redis SET...NX (atomic "set if not already set"). Granted access lasts the
// number of days mapped to that code, from the moment of redemption. Add an entry
// to GIFT_CODES for each person you want to gift trial access to.
const { rateLimit } = require('./_rateLimit');
const { sign } = require('./_token');

const GIFT_CODES = new Map([
  ['IVAN30TRIAL', 30],
  ['IVAN30TRIAL2', 30],
  ['SANJEEV7TRIAL', 7],
]);

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

async function _redisGet(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const resp = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['GET', key]]),
  });
  if (!resp.ok) return null;
  const result = await resp.json();
  return result[0]?.result ?? null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!await rateLimit(req, res, { max: 10, windowSecs: 3600, prefix: 'redeem-code' })) return;

  const code = ((req.body || {}).code || '').trim().toUpperCase();
  const days = GIFT_CODES.get(code);
  if (!days) {
    return res.status(200).json({ ok: false });
  }

  // Fail closed on Redis being unreachable — never grant a redemption we can't
  // confirm. If the code was already redeemed before, re-derive the original
  // redemption time from the stored value and re-issue a token for whatever's
  // left of that window — this lets a legitimate holder recover access (lost
  // token, new device, cleared storage) without restarting their trial clock.
  const result = await _redisSetNX(`giftcode:${code}`, new Date().toISOString());
  let redeemedAt;
  if (result === 'OK') {
    redeemedAt = Date.now();
  } else {
    const stored = await _redisGet(`giftcode:${code}`);
    const ts = stored ? Date.parse(stored) : NaN;
    if (!stored || isNaN(ts)) return res.status(200).json({ ok: false });
    redeemedAt = ts;
  }

  const expiresAt = redeemedAt + days * 86400000;
  if (Date.now() > expiresAt) return res.status(200).json({ ok: false });
  const token = sign({ tier: 'gift', exp: expiresAt });
  return res.status(200).json({ ok: true, expiresAt, token });
};
