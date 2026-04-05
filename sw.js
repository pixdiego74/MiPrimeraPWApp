const CACHE_NAME = 'inventory-pwa-v1';
const PHOTOS_CACHE = 'fotos-cache-v1';
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/db.js',
    '/manifest.json',
    '/images/star_favorite_5754.png'
];

// 1. INSTALL: Precaching de archivos estáticos
self.addEventListener('install', event => {
    console.log('SW: Instalando Service Worker - Inventory System');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Precaching archivos estáticos');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('SW: Todos los archivos estáticos han sido cacheados');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('SW: Error en precaching:', error);
            })
    );
});

// 2. ACTIVATE: Limpiar caches antiguas
self.addEventListener('activate', event => {
    console.log('SW: Service Worker activado y listo para controlar la app');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== PHOTOS_CACHE) {
                        console.log('SW: Eliminando cache antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('SW: Activación completada, tomando control de los clientes');
            return self.clients.claim();
        })
    );
});

// 3. FETCH: Manejar peticiones incluyendo las fotos
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Si es una petición de foto (contiene '/fotos/')
    if (event.request.url.includes('/fotos/')) {
        console.log('SW: Interceptando foto:', event.request.url);
        event.respondWith(
            caches.open(PHOTOS_CACHE).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        console.log('SW: Sirviendo foto desde cache');
                        return cachedResponse;
                    }
                    // Si no está en cache, buscar de la red
                    return fetch(event.request).then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(error => {
                        console.error('SW: Error al cargar foto:', error);
                        return new Response('Foto no disponible', { status: 404 });
                    });
                });
            })
        );
        return;
    }
    
    // Para archivos estáticos (estrategia Cache First)
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        console.log('SW: Sirviendo desde cache:', event.request.url);
                        return cachedResponse;
                    }
                    
                    console.log('SW: No encontrado en cache, buscando en red:', event.request.url);
                    return fetch(event.request)
                        .then(networkResponse => {
                            if (!networkResponse || networkResponse.status !== 200) {
                                return networkResponse;
                            }
                            
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                    console.log('SW: Recurso cacheado:', event.request.url);
                                });
                            
                            return networkResponse;
                        })
                        .catch(error => {
                            console.log('SW: Error de red - Modo offline:', error);
                            return new Response('Estás offline. Algunos recursos no están disponibles.', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        });
                })
        );
    } else {
        // Para POST y otros métodos, dejar pasar normalmente
        event.respondWith(fetch(event.request));
    }
});

// Manejar mensajes desde la app
self.addEventListener('message', event => {
    console.log('SW: Mensaje recibido:', event.data);
    
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if(event.data.type === "SHOW_NOTIFICATION"){
        self.registration.showNotification("Success", {
            body: event.data.message,
        });
    }
});