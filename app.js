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
const video = document.getElementById("videoElement");
const btnTomarFoto = document.getElementById("takeSnap");
const canvas = document.getElementById("canvasEl");

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

// ===== NOTIFICACIONES =====
if ("Notification" in window){
    Notification.requestPermission().then(Permission => {
        console.log("Notification permission", Permission);
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

// ===== FUNCIONES PARA GUARDAR FOTOS EN CACHE =====
async function guardarFotoEnCache(fotoBlob, nombreArchivo) {
    try {
        const cache = await caches.open('fotos-cache-v1');
        const response = new Response(fotoBlob, {
            headers: { 'Content-Type': 'image/jpeg' }
        });
        const url = `/fotos/${nombreArchivo}`;
        await cache.put(url, response);
        console.log('✅ Foto guardada en Cache Storage:', url);
        enviarNotification('Foto guardada exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error al guardar foto en cache:', error);
        return false;
    }
}

function tomarFoto() {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('Video no está listo o no disponible');
        alert('Espera a que la cámara se active');
        return;
    }
    
    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convertir canvas a blob y guardar en cache
    canvas.toBlob(async (blob) => {
        if (blob) {
            const nombreArchivo = `foto_${Date.now()}.jpg`;
            const guardado = await guardarFotoEnCache(blob, nombreArchivo);
            
            if (guardado) {
                console.log('📸 Foto tomada y guardada correctamente');
                // Opcional: Mostrar la foto en la página
                mostrarFotoMiniatura(canvas.toDataURL());
            }
        } else {
            console.error('No se pudo crear el blob de la imagen');
        }
    }, 'image/jpeg');
}

// Función para mostrar la foto tomada en la página
function mostrarFotoMiniatura(dataURL) {
    const galeria = document.getElementById('galeria-fotos');
    if (galeria) {
        const div = document.createElement('div');
        div.className = 'foto-miniatura';
        div.innerHTML = `
            <img src="${dataURL}" width="100" style="margin: 5px; border: 1px solid #ccc;">
            <small>${new Date().toLocaleTimeString()}</small>
        `;
        galeria.appendChild(div);
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
        enviarNotification("Item guardado");
    }
});

// ===== FUNCIÓN PARA MOSTRAR PRODUCTOS =====
function mostrarProductos() {
    obtenerProductos((productos) => {
        listaProductos.innerHTML = '';
        
        if (productos.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = '<span class="loading">No hay productos registrados</span>';
            listaProductos.appendChild(li);
            return;
        }
        
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

// ===== CÁMARA =====
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            if (video) {
                video.srcObject = stream;
                console.log('Cámara activada correctamente');
            }
        })
        .catch((error) => {
            console.error('Error al acceder a la cámara:', error);
            alert('No se pudo acceder a la cámara. Verifica los permisos.');
        });
} else {
    console.error('getUserMedia no es soportado en este navegador');
    alert('Tu navegador no soporta la cámara');
}

// Evento para tomar foto
if (btnTomarFoto) {
    btnTomarFoto.addEventListener("click", () => {
        tomarFoto();
    });
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    if (typeof db !== 'undefined' && db) {
        mostrarProductos();
    }
    
    // Crear galería de fotos si no existe
    if (!document.getElementById('galeria-fotos')) {
        const galeriaSection = document.createElement('section');
        galeriaSection.innerHTML = `
            <h2>Últimas Fotos</h2>
            <div id="galeria-fotos" style="display: flex; flex-wrap: wrap;"></div>
        `;
        document.querySelector('main').appendChild(galeriaSection);
    }
});