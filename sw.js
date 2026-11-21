/* Читалка-переводчик: сервис-воркер. Оболочка приложения лежит в кеше, поэтому книги читаются без интернета. */
const VER = 'rd-5e74883729';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/icon.svg'];
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
self.addEventListener('install', e => { e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('rd-') && k !== VER && k !== 'rd-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (FONTS.test(req.url)) {                                   /* шрифты: из кеша, а в фоне обновляются */
    e.respondWith(caches.open('rd-fonts').then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;                  /* переводы и всё остальное: только сеть */
  if (req.mode === 'navigate') {                               /* открытие приложения: из кеша, а свежая версия подтягивается в фоне */
    e.respondWith(caches.open(VER).then(async c => {
      const hit = await c.match('index.html');
      const net = fetch(req).then(r => { if (r && r.ok) c.put('index.html', r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
