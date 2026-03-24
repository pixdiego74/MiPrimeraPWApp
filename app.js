// ===== REGISTRO DEL SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registrado correctamente:', reg.scope))
            .catch(err => console.warn('Error al registrar el Service Worker:', err));
    });
}

// ===== ELEMENTOS DEL DOM =====
const form = document.getElementById('form-producto');
const inputNombre = document.getElementById('nombre-producto');
const inputCantidad = document.getElementById('cantidad-producto');
const listaProductos = document.getElementById('lista-productos');
const statusDiv = document.getElementById('status-online');

// ===== ESTADO DE CONEXIÓN =====
window.addEventListener('online', () => {
    statusDiv.textContent = 'En línea';
    statusDiv.className = 'status online';
});

window.addEventListener('offline', () => {
    statusDiv.textContent = 'Modo Offline (Guardado localmente)';
    statusDiv.className = 'status offline';
});

// Verificar estado inicial
if (!navigator.onLine) {
    statusDiv.textContent = 'Modo Offline (Guardado localmente)';
    statusDiv.className = 'status offline';
}

// LOCAL NOTIFICATION
if ("Notification" in window){
    Notification.requestPermission().then(Permission => {
        console.log("Notification permission", Permission)
    });
}

function enviarNotification(mensaje){
    if ("serviceWorker" in navigator && Notification.permission === "granted"){
        navigator.serviceWorker.ready.then(reg => {
            if(reg.active){
                reg.active.postMessage({
                    type: "SHOW_NOTIFICATION",
                    message: mensaje,
                });
            }
        });
    }
}

// ===== MANEJADOR DEL FORMULARIO =====
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nombre = inputNombre.value.trim();
    const cantidad = inputCantidad.value.trim();
    
    if (nombre !== '' && cantidad !== '') {
        insertarProductoDB(nombre, cantidad);
        inputNombre.value = '';
        inputCantidad.value = '';
        inputNombre.focus();
    }

    enviarNotification("Item guardado")
    form.reset() //???????????????????
});

// ===== FUNCIÓN PARA MOSTRAR PRODUCTOS =====
function mostrarProductos() {
    obtenerProductos((productos) => {
        listaProductos.innerHTML = ''; // Limpiar lista
        
        if (productos.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = '<span class="loading">No hay productos registrados</span>';
            listaProductos.appendChild(li);
            return;
        }
        
        // Ordenar por ID descendente (más recientes primero)
        productos.reverse().forEach(producto => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="producto-info">
                    <span class="producto-nombre">${producto.nombre}</span>
                    <span class="producto-cantidad">Cantidad: ${producto.cantidad}</span>
                </div>
                <small>${producto.fechaRegistro || ''}</small>
            `;
            listaProductos.appendChild(li);
        });
    });
}

// Hacer la función global para que db.js pueda llamarla
window.mostrarProductos = mostrarProductos;

// Cargar productos cuando la página esté lista
document.addEventListener('DOMContentLoaded', () => {
    if (db) {
        mostrarProductos();
    }
});