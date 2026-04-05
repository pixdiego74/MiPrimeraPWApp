const CACHE_NAME = 'georeport-v1';
const PHOTOS_CACHE = 'georeport-fotos-v1';
const STATIC_FILES = [
    '/',
    '/index.html',
    '/offline.html',
    '/style.css',
    '/app.js',
    '/db.js',
    '/manifest.json',
    '/images/icon-72x72.png',
    '/images/icon-96x96.png',
    '/images/icon-128x128.png',
    '/images/icon-144x144.png',
    '/images/icon-152x152.png',
    '/images/icon-192x192.png',
    '/images/icon-384x384.png',
    '/images/icon-512x512.png'
];

// INSTALL
self.addEventListener('install', event => {
    console.log('SW: Instalando GeoReport');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_FILES))
            .then(() => self.skipWaiting())
    );
});

// ACTIVATE
self.addEventListener('activate', event => {
    console.log('SW: Activando GeoReport');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME && cache !== PHOTOS_CACHE) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// FETCH
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Fotos - Cache First
    if (event.request.url.includes('/fotos/') || event.request.url.includes('blob:')) {
        event.respondWith(
            caches.open(PHOTOS_CACHE).then(cache => {
                return cache.match(event.request).then(cached => {
                    return cached || fetch(event.request).then(network => {
                        cache.put(event.request, network.clone());
                        return network;
                    });
                });
            })
        );
        return;
    }
    
    // API/Network First - Para reportes
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(network => network)
                .catch(() => {
                    return new Response(JSON.stringify({ offline: true }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }
    
    // App Shell - Cache First
    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) return cached;
                
                return fetch(event.request)
                    .then(network => {
                        if (network && network.status === 200) {
                            const clone = network.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, clone);
                            });
                        }
                        return network;
                    })
                    .catch(() => {
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// NOTIFICACIONES
self.addEventListener('message', event => {
    if (event.data.type === "SHOW_NOTIFICATION") {
        self.registration.showNotification(event.data.title || "GeoReport", {
            body: event.data.message,
            icon: "/images/icon-192x192.png",
            badge: "/images/icon-72x72.png",
            vibrate: [200, 100, 200]
        });
    }
});