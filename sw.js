/* ZENVRA service worker — caches ONLY the app shell so the desk opens offline.
   Exchange / API traffic (Binance, CoinGecko, ...) is cross-origin and is never intercepted:
   prices and orders always come live from the network, never from a cache. */
const VERSION = 'zenvra-v26-1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){ return k.indexOf('zenvra-') === 0 && k !== VERSION; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(async function(cache){
    const hit = await cache.match(req, { ignoreSearch:true });
    const net = fetch(req).then(function(res){ if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(function(){ return null; });   // stale-while-revalidate
    return hit || (await net) || (await cache.match('./index.html', { ignoreSearch:true })) || new Response('Offline', { status:503 });
  }));
});
self.addEventListener('message', function(e){ if (e.data === 'skipWaiting') self.skipWaiting(); });
