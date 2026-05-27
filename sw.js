// Jyoti Service Worker — PWA + Push Notifications
const CACHE = 'jyoti-v6';
const ASSETS = ['/', '/index.html'];

// ── INSTALL ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH (cache-first for assets, network-first for API) ──
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/') || e.request.url.includes('anthropic')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'Jyoti ✨';
  const options = {
    body: data.body || 'Your daily sacred practice awaits.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/', type: data.type || 'daily' },
    actions: [
      { action: 'open', title: '✦ Open Jyoti' },
      { action: 'dismiss', title: 'Later' }
    ],
    requireInteraction: false,
    silent: false,
    tag: data.type || 'daily-remedy',
    renotify: true
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC (schedule check) ──
self.addEventListener('sync', e => {
  if (e.tag === 'daily-reminder-check') {
    e.waitUntil(checkScheduledNotifications());
  }
});

async function checkScheduledNotifications() {
  // Handled server-side via Netlify scheduled functions
  // This is a client-side fallback
  const now = new Date();
  const hour = now.getHours();
  const stored = await getFromIDB('notification_prefs');
  if (!stored) return;

  const { evening, morning } = stored;
  if (evening && hour === 20) {
    await self.registration.showNotification('Jyoti ✨ — Tomorrow\'s Practice', {
      body: 'Your sacred remedy for tomorrow is ready. Prepare with intention.',
      icon: '/icons/icon-192.png',
      tag: 'evening-prep',
      data: { url: '/' }
    });
  }
  if (morning && hour === 6) {
    await self.registration.showNotification('Jyoti ✨ — Begin Your Practice', {
      body: 'Good morning. Your sacred practice for today awaits.',
      icon: '/icons/icon-192.png',
      tag: 'morning-reminder',
      data: { url: '/' }
    });
  }
}

// Simple IDB helper
function getFromIDB(key) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('jyoti-db', 1);
      req.onsuccess = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('prefs')) return resolve(null);
        const tx = db.transaction('prefs', 'readonly');
        const store = tx.objectStore('prefs');
        const get = store.get(key);
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch(e) { resolve(null); }
  });
}
