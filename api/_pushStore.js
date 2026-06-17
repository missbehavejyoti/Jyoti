// Push subscription storage using Upstash Redis REST API (same Redis as _rateLimit.js)
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

const SET_KEY = 'push:subs';

async function _redis(commands) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error('Upstash env vars missing:', { hasUrl: !!url, hasToken: !!token });
    return null;
  }

  const resp = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!resp.ok) {
    console.error('Upstash request failed:', resp.status, await resp.text().catch(() => ''));
    return null;
  }
  return resp.json();
}

// Stable short id derived from the subscription endpoint URL
function idFor(endpoint) {
  let hash = 0;
  for (let i = 0; i < endpoint.length; i++) hash = (hash * 31 + endpoint.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

async function saveSubscription(sub) {
  const id = idFor(sub.endpoint);
  const result = await _redis([
    ['SADD', SET_KEY, id],
    ['SET', `push:sub:${id}`, JSON.stringify(sub)],
  ]);
  return result !== null;
}

async function removeSubscription(id) {
  await _redis([
    ['SREM', SET_KEY, id],
    ['DEL', `push:sub:${id}`],
  ]);
}

async function getAllSubscriptions() {
  const idsResult = await _redis([['SMEMBERS', SET_KEY]]);
  if (!idsResult) return [];
  const [[, ids]] = idsResult;
  if (!ids || !ids.length) return [];

  const valsResult = await _redis(ids.map(id => ['GET', `push:sub:${id}`]));
  if (!valsResult) return [];

  return ids.map((id, i) => {
    const [, raw] = valsResult[i] || [];
    if (!raw) return null;
    try { return { id, ...JSON.parse(raw) }; } catch { return null; }
  }).filter(Boolean);
}

// Marks a subscriber/slot/day as notified exactly once, regardless of how often the
// sending cron fires within the delivery window. Returns false if already sent.
async function markSentOnce(id, slot, dateStr) {
  const key = `push:sent:${id}:${slot}:${dateStr}`;
  const result = await _redis([['SET', key, '1', 'NX', 'EX', 90000]]);
  if (!result) return true; // Redis unavailable — don't block sending
  const [[, val]] = result;
  return val === 'OK';
}

module.exports = { saveSubscription, removeSubscription, getAllSubscriptions, markSentOnce, idFor };
