// IP rate limiter using Upstash Redis REST API
// Requires env vars: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// If either is missing the check is skipped (allow-by-default)

async function rateLimit(req, res, { max = 20, windowSecs = 3600, prefix = 'rl' } = {}) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return true; // not configured — skip

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const window = Math.floor(Date.now() / (windowSecs * 1000));
  const key = `${prefix}:${ip}:${window}`;

  try {
    // INCR then EXPIRE in a pipeline (two commands, one round-trip)
    const resp = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, windowSecs]]),
    });
    if (!resp.ok) return true; // Redis error — allow through

    const [[, count]] = await resp.json();
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));

    if (count > max) {
      res.status(429).json({ error: 'Too many requests. Please try again in an hour.' });
      return false;
    }
    return true;
  } catch {
    return true; // network error — allow through
  }
}

module.exports = { rateLimit };
