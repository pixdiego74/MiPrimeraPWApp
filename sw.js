const CACHE_NAME = 'inventory-pwa-v1';
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
                    if (cacheName !== CACHE_NAME) {
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

// 3. FETCH: Estrategia Cache First
self.addEventListener('fetch', event => {
    console.log('SW: Interceptando petición:', event.request.url);
    
    // Solo aplicar estrategia a recursos estáticos y navegación
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
                            // Verificar si la respuesta es válida
                            if (!networkResponse || networkResponse.status !== 200) {
                                return networkResponse;
                            }
                            
                            // Clonar la respuesta para poder cachearla
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
                            // Aquí podrías devolver una página de fallback offline
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

// Manejar mensajes desde la app (opcional)
self.addEventListener('message', event => {
    console.log('SW: Mensaje recibido:', event.data);
    
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});