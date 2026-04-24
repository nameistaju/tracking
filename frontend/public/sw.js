const CACHE_NAME = 'fieldtrack-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/offline'
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests — always go to network
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('/offline');
        });
      })
  );
});

// Background Sync for location updates (when offline)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-location') {
    event.waitUntil(syncPendingLocations());
  }
});

async function syncPendingLocations() {
  try {
    const db = await openDB();
    const tx = db.transaction('pending-locations', 'readonly');
    const store = tx.objectStore('pending-locations');
    const locations = await getAllFromStore(store);

    for (const loc of locations) {
      try {
        await fetch(loc.url, {
          method: 'POST',
          headers: loc.headers,
          body: JSON.stringify(loc.body)
        });
        // Remove from pending after successful sync
        const deleteTx = db.transaction('pending-locations', 'readwrite');
        deleteTx.objectStore('pending-locations').delete(loc.id);
      } catch (e) {
        // Will retry on next sync
        console.log('Sync failed for location:', e);
      }
    }
  } catch (e) {
    console.log('Background sync error:', e);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fieldtrack-offline', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('pending-locations', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
