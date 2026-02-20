// 1: Evento instalacion: Solo se hace una sola vez.
self.addEventListener('install', event => {
    console.log('SW: Instalando Service Worker.');
    // Forzar al SW tomar el control
    self.skipWaiting();
});

// 2: Evento activacion: Limpiar cache vieja
self.addEventListener('activate', event => {
    console.log('SW: Service Worker activo y listo para controlar la app.');
});

// 3: Evento Fetch: Interceptar cada peticion al servidor 
self.addEventListener('fetch', event => {
    console.log('SW: Interceptando peticiones, ejemplo: ', event.request.url);
});
