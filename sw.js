// Service Worker – macht Pre-Batch installierbar und offline nutzbar.
// Aufbau wie in der Medikamente-App: Der Service Worker speichert nur die App-Dateien,
// Rezepte liegen im localStorage des Geräts.
//
// Neue App-Versionen kommen NUR über VERSION: Der Browser prüft sw.js bei jedem Start,
// installiert die neue Version im Hintergrund und nimmt sie beim nächsten Öffnen.
// Ohne VERSION zu erhöhen, sieht niemand die Änderungen!

const VERSION = 'v3';
const SHELL = `prebatch-shell-${VERSION}`;

const SHELL_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/recipes.js',
  'js/utils.js',
  'js/storage.js',
  'js/calc.js',
  'js/views/result.js',
  'js/views/editor.js',
];

// Schön, aber nicht nötig: Fehlt eine davon, läuft die App trotzdem offline
const OPTIONAL_FILES = [
  'app-icons/icon.svg',
  'app-icons/icon-192.png',
  'app-icons/icon-512.png',
];

const fresh = f => new Request(f, { cache: 'reload' });

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    try {
      await cache.addAll(SHELL_FILES.map(fresh));
    } catch (err) {
      await caches.delete(SHELL);
      throw err;
    }
    await Promise.allSettled(OPTIONAL_FILES.map(f => cache.add(fresh(f))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('prebatch-shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// App-Dateien: sofort aus dem Zwischenspeicher (schneller Start, offline), sonst Netz
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const key = req.mode === 'navigate' ? new Request('./') : req;
    const cached = await cache.match(key, { ignoreSearch: req.mode === 'navigate', ignoreVary: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return Response.error();
    }
  })());
});
