// Glass To‑do – optionaler Service Worker
// Sorgt dafür, dass die App auch ohne Netz startet (Seite + Firebase-SDK aus dem Cache).
// Die Aufgaben selbst liegen offline im Firestore-Cache (IndexedDB), nicht hier.
const CACHE = 'glass-todo-v1';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.add('./')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const CACHE_FIRST_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'images.unsplash.com'];

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Seite: erst Netz (immer aktuell), offline aus dem Cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./', copy)); }
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // Firebase-SDK (versioniert), Schrift, Standardbild: erst Cache
  if (CACHE_FIRST_HOSTS.includes(url.hostname) && (url.hostname !== 'www.gstatic.com' || url.pathname.startsWith('/firebasejs/'))) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // Alles andere (Firestore, Auth) läuft unverändert übers Netz.
});
