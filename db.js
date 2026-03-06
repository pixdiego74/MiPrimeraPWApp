let db;
const request = indexedDB.open('TareasDB', 1);

//Verification DB
request.onupgradeneeded = (event) => {
    db = event.target.result;
    if(!db.objectStoreNames.contains('pendientes')){
        db.createObjectStore('pendientes', {keyPath: 'id', autoIncrement: true});
    }
}

request.onsuccess = (event) => {
    db = event.target.result;
    console.log('IndexDB ready');
    mostrarTareas(); //Show task list
}

function insertarTareaDB(titulo) {
    const transaction = db.transaction(['pendientes'], 'readwrite');
    const store = transaction.objectStore('pendientes');

    const nuevoTarea = {
        titulo: titulo,
        fecha: new Date().toLocaleDateString()
    };

    const query = store.add(nuevoTarea);

    query.onsuccess = () => {
        console.log('Task saved in DB');
        mostrarTareas(); //Show task list
    }
}

function mostrarTareas(){
    const listUL = document.getElementById('lista-tareas');
    listUL.innerHTML = ''; //Clean html

    const transaction = db.transaction(['pendientes'], 'readonly');
    const store = transaction.objectStore('pendientes');
    const consoleRequest = store.openCursor();

    cursorRequest.onsuccess = () => {
        const cursor = event.tarjet.result;
    
        if(cursor){
            const li = document.createElement('li');
            li.innerHTML = `
            <span>${cursor.value.titulo}</span>
            <small>${cursor.value.fecha}</small>
            `;
            listUL.appendChild(li);
            cursor.continue();
        }
    }
}