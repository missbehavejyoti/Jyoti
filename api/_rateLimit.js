// IP rate limiter using Upstash Redis REST API
// Requires env vars: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// If either is missing the check is skipped (allow-by-default)

async function _redisIncr(key, windowSecs) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const resp = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['INCR', key], ['EXPIRE', key, windowSecs]]),
  });
  if (!resp.ok) return null;
  const result = await resp.json();
  return result[0]?.result ?? null;
}

function _getIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress || 'unknown';
}

async function rateLimit(req, res, { max = 20, windowSecs = 3600, prefix = 'rl' } = {}) {
  try {
    const window = Math.floor(Date.now() / (windowSecs * 1000));
    const key = `${prefix}:${_getIp(req)}:${window}`;
    const count = await _redisIncr(key, windowSecs);
    if (count === null) return true; // Redis unavailable — allow through

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));

    if (count > max) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

// Daily cap — resets at UTC midnight
async function dailyLimit(req, res, { max = 80, prefix = 'day' } = {}) {
  try {
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `${prefix}:${_getIp(req)}:${day}`;
    const count = await _redisIncr(key, 86400);
    if (count === null) return true;

    if (count > max) {
      res.status(429).json({ error: 'Daily limit reached. Your practice resets at midnight UTC.' });
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

module.exports = { rateLimit, dailyLimit };
