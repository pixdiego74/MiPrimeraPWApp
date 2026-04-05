// ===== CONFIGURACIÓN DE INDEXEDDB =====
const DB_NAME = 'GeoReportDB';
const DB_VERSION = 1;
let db = null;
let dbReady = false;
let pendingCallbacks = [];

// Función para esperar a que DB esté lista
function cuandoDBLista(callback) {
    if (dbReady && db) {
        callback(db);
    } else {
        pendingCallbacks.push(callback);
    }
}

function abrirBaseDatos() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('Error al abrir DB:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            dbReady = true;
            console.log('✅ Base de datos abierta correctamente');
            
            // Ejecutar callbacks pendientes
            pendingCallbacks.forEach(callback => callback(db));
            pendingCallbacks = [];
            
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Crear store de reportes si no existe
            if (!db.objectStoreNames.contains('reportes')) {
                const store = db.createObjectStore('reportes', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('sincronizado', 'sincronizado', { unique: false });
                console.log('✅ Store "reportes" creada');
            }
        };
    });
}

// Función para obtener reportes (con espera a que DB esté lista)
function obtenerReportes() {
    return new Promise((resolve, reject) => {
        cuandoDBLista(async (database) => {
            try {
                const transaction = database.transaction(['reportes'], 'readonly');
                const store = transaction.objectStore('reportes');
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const reportes = request.result.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(reportes);
                };
                
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Función para guardar reporte
function guardarReporte(reporte) {
    return new Promise((resolve, reject) => {
        cuandoDBLista((database) => {
            const transaction = database.transaction(['reportes'], 'readwrite');
            const store = transaction.objectStore('reportes');
            
            const reporteCompleto = {
                ...reporte,
                id: Date.now(),
                fechaRegistro: new Date().toLocaleString(),
                sincronizado: navigator.onLine,
                timestamp: Date.now()
            };
            
            const request = store.add(reporteCompleto);
            
            request.onsuccess = () => {
                resolve(reporteCompleto);
            };
            
            request.onerror = () => reject(request.error);
        });
    });
}

// Función para actualizar reporte
function actualizarReporte(reporte) {
    return new Promise((resolve, reject) => {
        cuandoDBLista((database) => {
            const transaction = database.transaction(['reportes'], 'readwrite');
            const store = transaction.objectStore('reportes');
            const request = store.put(reporte);
            
            request.onsuccess = () => resolve(reporte);
            request.onerror = () => reject(request.error);
        });
    });
}

// Inicializar DB
abrirBaseDatos().catch(error => {
    console.error('❌ Error inicializando DB:', error);
});

// Exportar funciones globalmente
window.db = db;
window.obtenerReportes = obtenerReportes;
window.guardarReporte = guardarReporte;
window.actualizarReporte = actualizarReporte;
window.cuandoDBLista = cuandoDBLista;