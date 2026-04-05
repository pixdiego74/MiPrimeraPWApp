// ===== REGISTRO DEL SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ SW registrado:', reg.scope))
            .catch(err => console.warn('❌ Error SW:', err));
    });
}

// ===== ELEMENTOS DEL DOM =====
const form = document.getElementById('form-reporte');
const tipoIncidencia = document.getElementById('tipo-incidencia');
const descripcion = document.getElementById('descripcion');
const listaReportes = document.getElementById('lista-reportes');
const statusDiv = document.getElementById('status-online');
const fab = document.getElementById('fab-create');
const modal = document.getElementById('modal-reporte');
const closeModalBtns = document.querySelectorAll('.close-modal, .btn-cancel');
const videoPreview = document.getElementById('videoPreview');
const canvasPhoto = document.getElementById('canvasPhoto');
const btnTomarFoto = document.getElementById('btn-tomar-foto');
const fotoPreview = document.getElementById('foto-preview');
const fotoTomada = document.getElementById('foto-tomada');
const btnRemoverFoto = document.getElementById('btn-remover-foto');
const ubicacionStatus = document.getElementById('ubicacion-status');
const coordenadasDiv = document.getElementById('coordenadas');
const latitudSpan = document.getElementById('latitud');
const longitudSpan = document.getElementById('longitud');
const btnActualizarUbicacion = document.getElementById('btn-actualizar-ubicacion');
const reportCount = document.getElementById('report-count');
const toast = document.getElementById('toast-message');

// ===== VARIABLES GLOBALES =====
let fotoDataURL = null;
let ubicacionActual = null;
let stream = null;

// ===== ESTADO DE CONEXIÓN =====
function actualizarEstadoConexion() {
    if (navigator.onLine) {
        statusDiv.innerHTML = '<i class="fas fa-wifi"></i><span>En línea</span>';
        statusDiv.className = 'status online';
        sincronizarReportesPendientes();
    } else {
        statusDiv.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Offline</span>';
        statusDiv.className = 'status offline';
    }
}

window.addEventListener('online', actualizarEstadoConexion);
window.addEventListener('offline', actualizarEstadoConexion);
actualizarEstadoConexion();

// ===== NOTIFICACIONES =====
if ("Notification" in window) {
    Notification.requestPermission();
}

function mostrarNotificacion(titulo, mensaje, tipo = 'info') {
    if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
            if (reg.active) {
                reg.active.postMessage({
                    type: "SHOW_NOTIFICATION",
                    title: titulo,
                    message: mensaje
                });
            }
        });
    }
    
    mostrarToast(mensaje, tipo);
}

function mostrarToast(mensaje, tipo = 'info') {
    const toastText = document.getElementById('toast-text');
    if (!toastText) return;
    
    toastText.textContent = mensaje;
    toast.style.display = 'block';
    toast.style.background = tipo === 'error' ? '#F44336' : tipo === 'success' ? '#4CAF50' : '#333';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ===== CÁMARA =====
async function iniciarCamara() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        mostrarToast('Tu navegador no soporta la cámara', 'error');
        return;
    }
    
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoPreview) {
            videoPreview.srcObject = stream;
        }
        console.log('✅ Cámara iniciada');
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        mostrarToast('No se pudo acceder a la cámara', 'error');
    }
}

function tomarFoto() {
    if (!videoPreview || !videoPreview.videoWidth || !videoPreview.videoHeight) {
        mostrarToast('Espera a que la cámara se active', 'error');
        return;
    }
    
    canvasPhoto.width = videoPreview.videoWidth;
    canvasPhoto.height = videoPreview.videoHeight;
    const ctx = canvasPhoto.getContext('2d');
    ctx.drawImage(videoPreview, 0, 0, canvasPhoto.width, canvasPhoto.height);
    
    fotoDataURL = canvasPhoto.toDataURL('image/jpeg', 0.8);
    fotoTomada.src = fotoDataURL;
    fotoPreview.style.display = 'block';
    videoPreview.style.display = 'none';
    btnTomarFoto.style.display = 'none';
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function removerFoto() {
    fotoDataURL = null;
    fotoPreview.style.display = 'none';
    fotoTomada.src = '';
    videoPreview.style.display = 'block';
    btnTomarFoto.style.display = 'inline-block';
    iniciarCamara();
}

// ===== GEOLOCALIZACIÓN =====
function obtenerUbicacion() {
    if (!navigator.geolocation) {
        if (ubicacionStatus) {
            ubicacionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Geolocalización no soportada';
        }
        mostrarToast('Tu navegador no soporta geolocalización', 'error');
        return;
    }
    
    if (ubicacionStatus) {
        ubicacionStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo ubicación...';
        ubicacionStatus.style.display = 'flex';
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            ubicacionActual = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            if (latitudSpan) latitudSpan.textContent = ubicacionActual.lat.toFixed(6);
            if (longitudSpan) longitudSpan.textContent = ubicacionActual.lng.toFixed(6);
            if (ubicacionStatus) ubicacionStatus.style.display = 'none';
            if (coordenadasDiv) coordenadasDiv.style.display = 'block';
            mostrarToast('Ubicación obtenida correctamente', 'success');
        },
        (error) => {
            console.error('Error de geolocalización:', error);
            if (ubicacionStatus) {
                ubicacionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error al obtener ubicación';
            }
            mostrarToast('No se pudo obtener la ubicación', 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// ===== FUNCIONES DE INDEXEDDB =====
async function sincronizarReportesPendientes() {
    if (!navigator.onLine) return;
    
    try {
        if (typeof obtenerReportes !== 'function') return;
        
        const reportes = await obtenerReportes();
        const pendientes = reportes.filter(r => !r.sincronizado);
        
        if (pendientes.length > 0) {
            console.log(`🔄 Sincronizando ${pendientes.length} reportes pendientes...`);
            mostrarToast(`Sincronizando ${pendientes.length} reportes...`, 'info');
            
            for (const reporte of pendientes) {
                reporte.sincronizado = true;
                if (typeof actualizarReporte === 'function') {
                    await actualizarReporte(reporte);
                }
            }
            
            mostrarNotificacion('Sincronización', `${pendientes.length} reportes sincronizados`, 'success');
            mostrarProductos();
        }
    } catch (error) {
        console.error('Error al sincronizar:', error);
    }
}

async function actualizarContador() {
    try {
        if (typeof obtenerReportes === 'function') {
            const reportes = await obtenerReportes();
            if (reportCount) reportCount.textContent = reportes.length;
        }
    } catch (error) {
        console.error('Error al actualizar contador:', error);
    }
}

// ===== MOSTRAR REPORTES =====
async function mostrarProductos() {
    try {
        if (typeof obtenerReportes !== 'function') {
            console.log('Esperando inicialización de DB...');
            setTimeout(mostrarProductos, 500);
            return;
        }
        
        const reportes = await obtenerReportes();
        
        if (!listaReportes) return;
        
        if (reportes.length === 0) {
            listaReportes.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No hay reportes registrados</p>
                    <small>Presiona el botón + para crear tu primer reporte</small>
                </div>
            `;
            return;
        }
        
        listaReportes.innerHTML = reportes.map(reporte => `
            <div class="report-card">
                <div class="report-header">
                    <span class="report-tipo">
                        ${getIconoTipo(reporte.tipo)} ${getNombreTipo(reporte.tipo)}
                    </span>
                    <span class="report-fecha">${reporte.fechaRegistro}</span>
                </div>
                <div class="report-descripcion">${escapeHtml(reporte.descripcion)}</div>
                ${reporte.foto ? `<img src="${reporte.foto}" style="max-width: 100px; border-radius: 8px; margin: 0.5rem 0;">` : ''}
                <div class="report-footer">
                    <span class="report-ubicacion">
                        <i class="fas fa-map-marker-alt"></i>
                        ${reporte.ubicacion ? `${reporte.ubicacion.lat.toFixed(4)}, ${reporte.ubicacion.lng.toFixed(4)}` : 'Ubicación no disponible'}
                    </span>
                    <span class="report-status ${reporte.sincronizado ? 'sincronizado' : 'pendiente'}">
                        ${reporte.sincronizado ? '<i class="fas fa-cloud-upload-alt"></i> Sincronizado' : '<i class="fas fa-clock"></i> Pendiente'}
                    </span>
                </div>
            </div>
        `).join('');
        
        actualizarContador();
    } catch (error) {
        console.error('Error al mostrar reportes:', error);
        if (listaReportes) {
            listaReportes.innerHTML = '<div class="empty-state"><i class="fas fa-database"></i><p>Error al cargar reportes</p></div>';
        }
    }
}

function getIconoTipo(tipo) {
    const iconos = {
        luminaria: '💡',
        bache: '🕳️',
        computo: '💻',
        limpieza: '🗑️',
        seguridad: '🔒',
        otro: '📝'
    };
    return iconos[tipo] || '📋';
}

function getNombreTipo(tipo) {
    const nombres = {
        luminaria: 'Luminaria fundida',
        bache: 'Bache',
        computo: 'Equipo de cómputo dañado',
        limpieza: 'Problema de limpieza',
        seguridad: 'Seguridad',
        otro: 'Otro'
    };
    return nombres[tipo] || tipo;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== MANEJADOR DEL FORMULARIO =====
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!tipoIncidencia.value || !descripcion.value.trim()) {
            mostrarToast('Completa todos los campos requeridos', 'error');
            return;
        }
        
        const reporte = {
            tipo: tipoIncidencia.value,
            descripcion: descripcion.value.trim(),
            foto: fotoDataURL,
            ubicacion: ubicacionActual
        };
        
        try {
            if (typeof guardarReporte === 'function') {
                await guardarReporte(reporte);
            } else {
                console.error('guardarReporte no está disponible');
                mostrarToast('Error: Base de datos no inicializada', 'error');
                return;
            }
            
            tipoIncidencia.value = '';
            descripcion.value = '';
            removerFoto();
            obtenerUbicacion();
            
            modal.classList.remove('active');
            mostrarToast('Reporte guardado exitosamente', 'success');
        } catch (error) {
            console.error('Error al guardar:', error);
            mostrarToast('Error al guardar el reporte', 'error');
        }
    });
}

// ===== EVENTOS =====
if (fab) {
    fab.addEventListener('click', () => {
        modal.classList.add('active');
        iniciarCamara();
        obtenerUbicacion();
    });
}

closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modal.classList.remove('active');
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });
});

if (btnTomarFoto) btnTomarFoto.addEventListener('click', tomarFoto);
if (btnRemoverFoto) btnRemoverFoto.addEventListener('click', removerFoto);
if (btnActualizarUbicacion) btnActualizarUbicacion.addEventListener('click', obtenerUbicacion);

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que db.js cargue las funciones
    setTimeout(() => {
        mostrarProductos();
    }, 1000);
    
    setInterval(() => {
        if (navigator.onLine && typeof sincronizarReportesPendientes === 'function') {
            sincronizarReportesPendientes();
        }
    }, 30000);
});

window.mostrarProductos = mostrarProductos;