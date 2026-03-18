const CACHE_NAME = 'pt-note-v4';
const CORE_ASSETS = [
    '/02/',
    '/02/index.html',
    '/02/manifest.json',
    '/02/icon-192.png',
    '/02/icon-512.png'
];
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// インストール時にアセットをキャッシュ
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            // コアアセットは必ずキャッシュ
            await cache.addAll(CORE_ASSETS);
            // CDNアセットは失敗しても無視
            await Promise.allSettled(
                CDN_ASSETS.map(url =>
                    fetch(url).then(res => {
                        if (res && res.status === 200) cache.put(url, res);
                    }).catch(() => { })
                )
            );
        })
    );
    self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ネットワークリクエストをインターセプト（キャッシュ優先）
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                // キャッシュがあれば返しつつ、バックグラウンドで更新
                fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                    }
                }).catch(() => { });
                return cached;
            }
            // キャッシュがなければネットワークから取得してキャッシュ
            return fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                }
                return response;
            }).catch(() => {
                // オフラインでコアページを要求している場合はindex.htmlを返す
                if (event.request.mode === 'navigate') {
                    return caches.match('/02/index.html');
                }
            });
        })
    );
});
