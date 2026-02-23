const CACHE_NAME = 'pt-note-v1';
const ASSETS_TO_CACHE = [
    './',
    './02.html',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// インストール時にアセットをキャッシュ
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// ネットワークリクエストをインターセプト（キャッシュ優先）
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                // キャッシュがあれば返しつつ、バックグラウンドで更新
                const fetchPromise = fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => { });
                return cached;
            }
            // キャッシュがなければネットワークから取得してキャッシュ
            return fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
