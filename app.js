//CSR
const tasklist = document.getElementById("task-list");

//Array CSR
const tareasLocales = [
    "Tarea desde JS: Configurar Entorno",
    "Tarea desde JS: Probar Live Server",
    "Tarea desde JS: Analizar El DOM",
];

function renderLocalTask(){
    tasklist.innerHTML = "";
    tareasLocales.forEach(tarea => {
        const li = document.createElement("li");
        li.textContent = tarea;
        tasklist.appendChild(li);
    });
}

//renderLocalTask();

async function fetchRemoteTask() {
    const container = document.getElementById("app-content");
    //Mostrar estado de carga
    container.innerHTML = '<p class="loading">Cargando datos de la API externa...</p>';

    try{
        const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
        const posts = await response.json();

        //Limpiar contenedor y nueva lista
        container.innerHTML = '<ul id="task-list"></ul>';
        const newList = document.getElementById('task-list');

        //Renderizar
        posts.forEach(post => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${post.title}<strong/><br><small>${post.body}<small/>`;
            newList.appendChild(li);
        });
    }catch (error){
        container.innerHTML = '<p style="color:red">Error al cargar los datos, tienes internet?</p>';
        console.error("Error en fetch: ", error);
    }
}

window.addEventListener('load', fetchRemoteTask);