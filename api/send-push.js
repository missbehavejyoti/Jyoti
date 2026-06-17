// Triggered every ~15 min by an external cron service (Vercel Hobby cron only runs once/day).
// Protect with PUSH_CRON_SECRET so this can't be hit by randoms to drain push quota.
const webpush = require('web-push');
const { getAllSubscriptions, removeSubscription, markSentOnce } = require('./_pushStore');

const COPY = {
  morning: {
    en: name => ({ title: 'Jyoti ✦ Begin Your Practice', body: `Good morning${name ? ', ' + name : ''}. Your sacred practice for today is waiting.` }),
    hi: name => ({ title: 'ज्योति ✦ अभ्यास शुरू करें', body: `शुभ प्रभात${name ? ', ' + name : ''}। आज का पवित्र अभ्यास आपकी प्रतीक्षा कर रहा है।` }),
    es: name => ({ title: 'Jyoti ✦ Comienza Tu Práctica', body: `Buenos días${name ? ', ' + name : ''}. Tu práctica sagrada de hoy te espera.` }),
  },
  evening: {
    en: name => ({ title: "Jyoti ✦ Tomorrow's Practice", body: `${name ? name + ', your' : 'Your'} sacred remedy for tomorrow is ready. Prepare with intention.` }),
    hi: name => ({ title: 'ज्योति ✦ कल का अभ्यास', body: `${name ? name + ', आपका' : 'आपका'} कल का पवित्र उपाय तैयार है। श्रद्धापूर्वक तैयारी करें।` }),
    es: name => ({ title: 'Jyoti ✦ Práctica de Mañana', body: `${name ? 'Tu remedio sagrado de mañana, ' + name : 'Tu remedio sagrado de mañana'} está listo. Prepárate con intención.` }),
  },
};

function _localParts(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    return { h: h === 24 ? 0 : h, m, dateStr };
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const key = req.query?.key || req.headers['x-cron-key'];
  if (!process.env.PUSH_CRON_SECRET || key !== process.env.PUSH_CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }

  webpush.setVapidDetails('mailto:hellojyoti@proton.me', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const subs = await getAllSubscriptions();
  let sent = 0, removed = 0, skipped = 0;

  // Manual one-off test push — bypasses the time window and skips markSentOnce so it
  // never interferes with that subscriber's real morning/evening delivery for today.
  if (req.query?.test === '1') {
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title: 'Jyoti ✦ Test Push', body: 'If you see this, real push notifications are working.', tag: 'jyoti-test-push', url: '/' })
        );
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await removeSubscription(sub.id);
          removed++;
        }
      }
    }
    return res.status(200).json({ test: true, checked: subs.length, sent, removed });
  }

  for (const sub of subs) {
    const local = _localParts(sub.tz);
    if (!local) continue;

    let slot = null;
    if (sub.morning && local.h === 6 && local.m < 15) slot = 'morning';
    else if (sub.evening && local.h === 20 && local.m < 15) slot = 'evening';
    if (!slot) continue;

    const canSend = await markSentOnce(sub.id, slot, local.dateStr);
    if (!canSend) { skipped++; continue; }

    const lang = COPY[slot][sub.lang] ? sub.lang : 'en';
    const { title, body } = COPY[slot][lang](sub.name);

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title, body, tag: slot === 'morning' ? 'morning-reminder' : 'evening-prep', url: '/' })
      );
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await removeSubscription(sub.id);
        removed++;
      }
    }
  }

  return res.status(200).json({ checked: subs.length, sent, skipped, removed });
};
