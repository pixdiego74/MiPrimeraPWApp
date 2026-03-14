let db;
const request = indexedDB.open('InventarioDB', 1);

// Configuración inicial de la base de datos
request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains('productos')) {
        // Crear store con auto-increment en id
        db.createObjectStore('productos', { keyPath: 'id', autoIncrement: true });
        console.log('Store "productos" creado');
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log('IndexedDB: InventarioDB lista y conectada');
    
    // Cargar productos cuando la BD esté lista
    if (typeof mostrarProductos === 'function') {
        mostrarProductos();
    }
};

request.onerror = (event) => {
    console.error('Error al abrir IndexedDB:', event.target.error);
};

// Función para insertar producto
function insertarProductoDB(nombre, cantidad) {
    const transaction = db.transaction(['productos'], 'readwrite');
    const store = transaction.objectStore('productos');

    const nuevoProducto = {
        nombre: nombre,
        cantidad: parseInt(cantidad),
        fechaRegistro: new Date().toLocaleString()
    };

    const query = store.add(nuevoProducto);

    query.onsuccess = () => {
        console.log('Producto guardado en IndexedDB');
        if (typeof mostrarProductos === 'function') {
            mostrarProductos();
        }
    };

    query.onerror = (error) => {
        console.error('Error al guardar producto:', error);
    };
}

// Función para obtener todos los productos
function obtenerProductos(callback) {
    const transaction = db.transaction(['productos'], 'readonly');
    const store = transaction.objectStore('productos');
    const productos = [];

    const cursorRequest = store.openCursor();

    cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            productos.push(cursor.value);
            cursor.continue();
        } else {
            callback(productos);
        }
    };

    cursorRequest.onerror = (error) => {
        console.error('Error al leer productos:', error);
        callback([]);
    };
}