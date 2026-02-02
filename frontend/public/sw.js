// Ucycle Service Worker - v2.0.0 (Performance Optimized)
const CACHE_NAME = 'ucycle-v2';
const TILE_CACHE = 'ucycle-tiles-v1';
const IMAGE_CACHE = 'ucycle-images-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v2...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v2...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.startsWith('ucycle-'))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - optimized caching strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip API calls - always network
  if (url.pathname.startsWith('/api/')) return;
  
  // STRATEGY 1: Map tiles - Cache first (tiles rarely change)
  if (url.hostname.includes('basemaps.cartocdn.com') || 
      url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }
  
  // STRATEGY 2: Images - Cache first with network update
  if (event.request.destination === 'image' || 
      url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif)$/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }
  
  // STRATEGY 3: App shell - Stale while revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
        return cached || fetchPromise;
      });
    })
  );
});

// Clean up tile cache periodically (keep last 500 tiles)
async function cleanTileCache() {
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  if (keys.length > 500) {
    const toDelete = keys.slice(0, keys.length - 500);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// Listen for messages
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'cleanCache') {
    cleanTileCache();
  }
});
