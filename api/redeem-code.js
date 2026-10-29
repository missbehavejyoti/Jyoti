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

// Shared demo codes with a fixed end time: valid on any device until that moment,
// then dead for everyone, regardless of when (or whether) they were first used.
const FIXED_CODES = new Map([
  ['MOON24', Date.parse('2026-10-30T07:45:00Z')], // Fri 30 Oct 2026, 5:45pm AEST
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

// Usage stats: a running count of successful redemptions per code, plus a rough
// count of distinct visitors (HyperLogLog over IPs, so no IP is ever stored).
// Never blocks access: any Redis failure is swallowed.
async function _recordUse(req, code) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  try {
    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', `codeuses:${code}`], ['PFADD', `codevisitors:${code}`, ip]]),
    });
  } catch {}
}

// Owner view: GET /api/redeem-code?key=PUSH_CRON_SECRET lists usage for every
// code currently in this file.
async function _usageReport(res) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Redis not configured' });
  const codes = [...FIXED_CODES.keys(), ...GIFT_CODES.keys()];
  const resp = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(codes.flatMap(c => [['GET', `codeuses:${c}`], ['PFCOUNT', `codevisitors:${c}`]])),
  });
  if (!resp.ok) return res.status(502).json({ error: 'Redis unavailable' });
  const result = await resp.json();
  const usage = codes.map((code, i) => ({
    code,
    redemptions: Number(result[i * 2]?.result || 0),
    visitors: Number(result[i * 2 + 1]?.result || 0),
  }));
  return res.status(200).json({ usage });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    const key = req.query?.key;
    if (!process.env.PUSH_CRON_SECRET || key !== process.env.PUSH_CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return _usageReport(res);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!await rateLimit(req, res, { max: 10, windowSecs: 3600, prefix: 'redeem-code' })) return;

  const code = ((req.body || {}).code || '').trim().toUpperCase();
  const until = FIXED_CODES.get(code);
  if (until) {
    if (Date.now() > until) return res.status(200).json({ ok: false });
    await _recordUse(req, code);
    return res.status(200).json({ ok: true, expiresAt: until, token: sign({ tier: 'gift', exp: until }) });
  }
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
  await _recordUse(req, code);
  const token = sign({ tier: 'gift', exp: expiresAt });
  return res.status(200).json({ ok: true, expiresAt, token });
};
