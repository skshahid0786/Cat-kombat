// sw.js - Service Worker for background sync (optional enhancement)

const CACHE_NAME = 'cat-miner-v1';
const urlsToCache = [
  '/',
  '/styles.css',
  '/script.js',
  'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js',
  'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch from cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Background sync for offline earnings
self.addEventListener('sync', event => {
  if (event.tag === 'miner-sync') {
    event.waitUntil(syncMinerData());
  }
});

async function syncMinerData() {
  // This would sync with Firebase when back online
  console.log('🔄 Syncing miner data in background...');
  // Implementation would require IndexedDB access
}

