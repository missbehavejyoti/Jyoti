// Also serves /api/vapid-public-key (rewritten here, no query param needed since
// that route only ever does a plain GET) — merged to stay under Vercel Hobby's
// 12-serverless-function cap.
const { saveSubscription, removeSubscription, idFor } = require('./_pushStore');
const { rateLimit } = require('./_rateLimit');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
  }
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await rateLimit(req, res, { max: 20, windowSecs: 3600, prefix: 'push-save' }))) return;

  const { endpoint, keys, tz, morning, evening, name, lang, unsubscribe } = req.body || {};
  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'Missing endpoint' });
  }

  if (unsubscribe) {
    await removeSubscription(idFor(endpoint));
    return res.status(200).json({ ok: true });
  }

  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
    return res.status(400).json({ error: 'Missing subscription keys' });
  }
  if (!tz || typeof tz !== 'string' || tz.length > 64) {
    return res.status(400).json({ error: 'Missing timezone' });
  }

  const ok = await saveSubscription({
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
    tz,
    morning: !!morning,
    evening: !!evening,
    name: (name || '').slice(0, 60),
    lang: ['hi', 'es', 'en'].includes(lang) ? lang : 'en',
  });

  if (!ok) return res.status(503).json({ error: 'Storage unavailable' });
  return res.status(200).json({ ok: true });
};
