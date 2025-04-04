// sw.js - Basic Service Worker

const CACHE_NAME = 'camera-capture-v1';
const urlsToCache = [
  '.', // Represents the root directory (index.html)
  'styles.css', // If you have a separate CSS file
  'app.js',     // If you move your JS to a separate file
  'manifest.json',
  'https://cdn.tailwindcss.com', // Cache external resources if needed
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  // Add paths to your icons here, e.g., 'icons/icon-192x192.png'
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // Use addAll for atomic caching
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Failed to cache initial resources:', error);
            // Decide how to handle caching failure, maybe throw error
        });
      })
      .then(() => {
        console.log('Service Worker: Install complete');
        // Immediately activate the new service worker
        return self.skipWaiting();
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    // Remove outdated caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
            // Take control of uncontrolled clients
            return self.clients.claim();
        })
    );
});


// Fetch event: Serve cached content when offline (basic cache-first strategy)
self.addEventListener('fetch', event => {
  console.log('Service Worker: Fetching', event.request.url);
  // Let browser handle requests for browser extensions
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Respond from cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          console.log('Service Worker: Found in cache', event.request.url);
          return response;
        }

        // Not in cache - fetch from network
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request).then(
            networkResponse => {
                // Optional: Cache the new response for future offline use
                // Only cache successful GET requests
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' || event.request.method !== 'GET') {
                    return networkResponse;
                }

                // IMPORTANT: Clone the response. A response is a stream
                // and because we want the browser to consume the response
                // as well as the cache consuming the response, we need
                // to clone it so we have two streams.
                const responseToCache = networkResponse.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        console.log('Service Worker: Caching new resource', event.request.url);
                        cache.put(event.request, responseToCache);
                    });

                return networkResponse;
            }
        ).catch(error => {
            console.error('Service Worker: Fetch failed', error);
            // Optional: Return a fallback page/resource if fetch fails
            // return caches.match('/offline.html');
        });
      })
  );
});