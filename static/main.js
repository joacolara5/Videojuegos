document.addEventListener("DOMContentLoaded", async () => {
    // Inicialización
    await initDashboard();
    
    // Cargar datos iniciales
    await cargarVideojuegos();
    await cargarOpcionesFiltros();
    
    // Configurar eventos
    setupEventListeners();
});

// Variables globales
let graficos = {
    ventasRegion: null,
    topJuegos: null,
    juegosGenero: null,
    ventasPlataforma: null
};

let filtrosActuales = {
    platform: '',
    genre: '',
    year: ''
};

// Inicialización del dashboard
async function initDashboard() {
    // Mostrar animación de carga
    mostrarLoading(true);
    
    try {
        // Configuración inicial de componentes
        initTooltips();
        
        // Ocultar elementos al inicio
        document.getElementById('formulario').classList.remove('active');
        document.getElementById('contenedor-tabla').classList.add('hidden');
        document.getElementById('contenedor-graficos').classList.add('hidden');
        
        // Cargar opciones para los selects del formulario
        await cargarOpcionesFormulario();
        
    } finally {
        mostrarLoading(false);
    }
}

// Configuración de event listeners
function setupEventListeners() {
    // Formulario principal
    const form = document.getElementById("form-videojuego");
    form.addEventListener("submit", manejarSubmitFormulario);

    // Botones principales
    document.getElementById("btn-tabla").addEventListener("click", toggleTabla);
    document.getElementById("toggle-graficos").addEventListener("click", toggleGraficos);

    // Filtros
   // Filtros
    document.getElementById("filtro-platform").addEventListener("change", async (e) => {
        filtrosActuales.platform = e.target.value;
        await aplicarFiltros();
    });

    document.getElementById("filtro-genre").addEventListener("change", async (e) => {
        filtrosActuales.genre = e.target.value;
        await aplicarFiltros();
    });

    document.getElementById("filtro-year").addEventListener("change", async (e) => {
        filtrosActuales.year = e.target.value;
        await aplicarFiltros();
    });

    document.getElementById("reset-filtros").addEventListener("click", resetearFiltros);
    document.getElementById('tabla-juegos').addEventListener('click', manejarAccionesTabla);
}

// Manejo del formulario
async function manejarSubmitFormulario(e) {
    e.preventDefault();
    mostrarLoading(true);
    
    const datos = obtenerDatosFormulario();
    const id = document.getElementById("id").value;

    try {
        const url = id ? `/upd/video_games/${id}` : "/add/video_games";
        const method = id ? "PUT" : "POST";
        
        console.log("Enviando datos:", datos); // Para depuración
        
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Error en la respuesta del servidor");
        }

        mostrarToast(
            id ? "Videojuego actualizado correctamente" : "Videojuego creado correctamente",
            "success"
        );

        document.getElementById('form-videojuego').reset();
        ocultarFormulario();
        await cargarVideojuegos();
        
    } catch (error) {
        console.error("Error al enviar formulario:", error);
        mostrarToast(`Error: ${error.message}`, "error");
    } finally {
        mostrarLoading(false);
    }
}
async function cargarOpcionesFormulario() {
    try {
        const res = await fetch('/api/opciones');
        if (!res.ok) throw new Error("Error al cargar opciones del formulario");
        
        const data = await res.json();
        
        // Llenar plataformas
        const platformSelect = document.getElementById('platform');
        platformSelect.innerHTML = '<option value="">Seleccione...</option>';
        data.plataformas.forEach(platform => {
            const option = document.createElement('option');
            option.value = platform;
            option.textContent = platform;
            platformSelect.appendChild(option);
        });
        
        // Llenar géneros
        const genreSelect = document.getElementById('genre');
        genreSelect.innerHTML = '<option value="">Seleccione...</option>';
        data.generos.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreSelect.appendChild(option);
        });
        
        // Llenar editores (publishers)
        const publisherSelect = document.getElementById('publisher');
        publisherSelect.innerHTML = '<option value="">Seleccione...</option>';
        data.editores.forEach(publisher => {
            const option = document.createElement('option');
            option.value = publisher;
            option.textContent = publisher;
            publisherSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error(error);
        mostrarToast("Error al cargar opciones del formulario", "error");
    }
}
// Carga de videojuegos con filtros
// Reemplaza la función cargarVideojuegos con esta versión mejorada
async function cargarVideojuegos() {
    mostrarLoading(true);
    
    try {
        let url = '/api/video_games';
        const params = new URLSearchParams();
        
        // Añade console.log para depuración
        console.log("Filtros actuales:", filtrosActuales);
        
        if (filtrosActuales.platform) params.append('platform', filtrosActuales.platform);
        if (filtrosActuales.genre) params.append('genre', filtrosActuales.genre);
        if (filtrosActuales.year) params.append('year', filtrosActuales.year);
        
        if (params.toString()) url += `?${params.toString()}`;

        console.log("URL de la API:", url);
        
        const res = await fetch(url);
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
        const data = await res.json();
        console.log("Datos recibidos:", data);
        
        if (!Array.isArray(data)) {
            throw new Error("Formato de datos inválido: se esperaba un array");
        }
        
        renderizarTabla(data);
        actualizarGraficos(data);
        
    } catch (error) {
        console.error("Error en cargarVideojuegos:", error);
        mostrarToast(`Error al cargar datos: ${error.message}`, "error");
        
        // Mostrar estado vacío en UI
        document.querySelector('#tabla-juegos').innerHTML = `
            <tr class="no-data">
                <td colspan="6">Error al cargar datos</td>
            </tr>
        `;
        
        document.querySelectorAll('.chart-container').forEach(container => {
            container.innerHTML = '<p class="no-data-chart">Error al cargar gráficos</p>';
        });
    } finally {
        mostrarLoading(false);
    }
}

// Renderizado de la tabla
function renderizarTabla(data) {
    const tbody = document.querySelector('#tabla-juegos');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data">
                <td colspan="7">No se encontraron videojuegos con los filtros actuales</td>
            </tr>
        `;
        return;
    }

    data.forEach(juego => {
        const tr = document.createElement('tr');
        tr.dataset.id = juego.id;
        tr.innerHTML = `
            <td>${juego.Name || '-'}</td>
            <td><span class="badge platform-${juego.Platform?.toLowerCase() || 'unknown'}">${juego.Platform || '-'}</span></td>
            <td>${juego.Year || '-'}</td>
            <td>${juego.Genre || '-'}</td>
            <td>${formatCurrency(juego.Global_Sales)}</td>
            <td class="acciones-td">
                <button class="accion-btn editar-btn" data-tooltip="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="accion-btn eliminar-btn" data-tooltip="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Actualización de gráficos
function actualizarGraficos(data) {
    console.log("Actualizando gráficos con datos:", data);
    
    // Verifica que los contenedores existan
    const contenedores = {
        ventasRegion: document.getElementById('grafico-ventas-region'),
        topJuegos: document.getElementById('grafico-top-juegos'),
        juegosGenero: document.getElementById('grafico-juegos-genero'),
        ventasPlataforma: document.getElementById('grafico-ventas-plataforma')
    };
    
    // Verifica contenedores
    for (const [key, container] of Object.entries(contenedores)) {
        if (!container) {
            console.error(`Contenedor no encontrado para ${key}`);
            return;
        }
    }
    
    // Destruir gráficos anteriores si existen
    Object.values(graficos).forEach(grafico => {
        if (grafico && typeof grafico.destroy === 'function') {
            grafico.destroy();
        }
    });
    
    // Resetear objeto de gráficos
    graficos = {
        ventasRegion: null,
        topJuegos: null,
        juegosGenero: null,
        ventasPlataforma: null
    };

    if (!data || data.length === 0) {
        document.querySelectorAll('.chart-container').forEach(container => {
            container.innerHTML = '<p class="no-data-chart">No hay datos para mostrar</p>';
        });
        return;
    }

    try {
        // Gráfico 1: Ventas por región
        graficos.ventasRegion = new Chart(contenedores.ventasRegion, {
            type: 'doughnut',
            data: getVentasPorRegionData(data),
            options: getChartOptions('Ventas por Región (millones)')
        });

        // Gráfico 2: Top 5 juegos
        graficos.topJuegos = new Chart(contenedores.topJuegos, {
            type: 'bar',
            data: getTopJuegosData(data),
            options: getChartOptions('Top 5 por Ventas Globales', { indexAxis: 'y' })
        });

        // Gráfico 3: Juegos por género
        graficos.juegosGenero = new Chart(contenedores.juegosGenero, {
            type: 'pie',
            data: getJuegosPorGeneroData(data),
            options: getChartOptions('Distribución por Género')
        });

        // Gráfico 4: Ventas por plataforma
        graficos.ventasPlataforma = new Chart(contenedores.ventasPlataforma, {
            type: 'radar',
            data: getVentasPorPlataformaData(data),
            options: getChartOptions('Ventas por Plataforma')
        });
    } catch (error) {
        console.error("Error al crear gráficos:", error);
        mostrarToast("Error al actualizar gráficos", "error");
    }
}

// Funciones para preparar datos de gráficos
function getVentasPorRegionData(data) {
    const ventas = {
        NA: 0, EU: 0, JP: 0, Other: 0
    };

    data.forEach(j => {
        ventas.NA += j.NA_Sales || 0;
        ventas.EU += j.EU_Sales || 0;
        ventas.JP += j.JP_Sales || 0;
        ventas.Other += j.Other_Sales || 0;
    });

    return {
        labels: ['Norte América', 'Europa', 'Japón', 'Otros'],
        datasets: [{
            data: Object.values(ventas),
            backgroundColor: [
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 99, 132, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)'
            ],
            borderWidth: 1
        }]
    };
}

function getTopJuegosData(data) {
    const sorted = [...data].sort((a, b) => (b.Global_Sales || 0) - (a.Global_Sales || 0));
    const top5 = sorted.slice(0, 5);

    // Paleta de colores neón
    const neonColors = [
        'rgba(0, 255, 157, 0.7)',  // Verde neón
        'rgba(255, 0, 170, 0.7)',   // Rosa neón
        'rgba(0, 225, 255, 0.7)',   // Azul neón
        'rgba(204, 0, 255, 0.7)',   // Púrpura neón
        'rgba(255, 247, 0, 0.7)'    // Amarillo neón
    ];

    return {
        labels: top5.map(j => j.Name),
        datasets: [{
            label: 'Ventas Globales (millones)',
            data: top5.map(j => j.Global_Sales || 0),
            backgroundColor: neonColors,
            borderColor: neonColors.map(color => color.replace('0.7', '1')),
            borderWidth: 2,
            hoverBackgroundColor: neonColors.map(color => color.replace('0.7', '0.9')),
            hoverBorderColor: '#fff',
            hoverBorderWidth: 1
        }]
    };
}

function getJuegosPorGeneroData(data) {
    const generos = {};
    data.forEach(j => {
        if (!j.Genre) return;
        generos[j.Genre] = (generos[j.Genre] || 0) + 1;
    });

    const colors = generateChartColors(Object.keys(generos).length);

    return {
        labels: Object.keys(generos),
        datasets: [{
            data: Object.values(generos),
            backgroundColor: colors,
            borderWidth: 1
        }]
    };
}

function getVentasPorPlataformaData(data) {
    const plataformas = {};
    data.forEach(j => {
        if (!j.Platform) return;
        plataformas[j.Platform] = (plataformas[j.Platform] || 0) + (j.Global_Sales || 0);
    });

    return {
        labels: Object.keys(plataformas),
        datasets: [{
            label: 'Ventas Globales',
            data: Object.values(plataformas),
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            pointBackgroundColor: 'rgba(153, 102, 255, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(153, 102, 255, 1)'
        }]
    };
}

// Funciones de ayuda
function formatCurrency(value) {
    if (!value) return '-';
    return `$${(value || 0).toFixed(2)}M`;
}

function generateChartColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * (360 / count)) % 360;
        colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
    }
    return colors;
}

function getChartOptions(title, customOptions = {}) {
    const neonDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#00ff9d',
                    font: {
                        family: 'Orbitron',
                        size: 12
                    },
                    padding: 20
                }
            },
            title: {
                display: true,
                text: title,
                color: '#00ff9d',
                font: {
                    family: 'Orbitron',
                    size: 16,
                    weight: 'bold'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 10, 20, 0.9)',
                titleColor: '#00ff9d',
                bodyColor: '#ffffff',
                borderColor: '#00ff9d',
                borderWidth: 1,
                displayColors: true,
                titleFont: {
                    family: 'Orbitron',
                    size: 14
                },
                bodyFont: {
                    family: 'Roboto',
                    size: 12
                },
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label || ''}: ${context.raw.toFixed(2)}M`;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#00ff9d',
                    font: {
                        family: 'Orbitron'
                    }
                },
                grid: {
                    color: 'rgba(0, 255, 157, 0.1)'
                }
            },
            y: {
                ticks: {
                    color: '#00ff9d',
                    font: {
                        family: 'Orbitron'
                    }
                },
                grid: {
                    color: 'rgba(0, 255, 157, 0.1)'
                },
                beginAtZero: true
            }
        }   
    };

    return { ...neonDefaults, ...customOptions };
}

// Funciones de UI
function mostrarLoading(mostrar) {
    const loader = document.getElementById('loading-overlay');
    if (mostrar) {
        loader.style.display = 'flex';
    } else {
        setTimeout(() => {
            loader.style.display = 'none';
        }, 300); // Pequeño delay para evitar parpadeo
    }
}

function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(el => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = el.dataset.tooltip;
        el.appendChild(tooltip);
        
        el.addEventListener('mouseenter', () => {
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
        });
        
        el.addEventListener('mouseleave', () => {
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        });
    });
}

// Funciones de formulario
function mostrarFormulario(juego = null) {
    const formulario = document.getElementById('formulario');
    const titulo = document.getElementById('form-titulo');
    
    if (juego) {
        titulo.innerHTML = `<i class="fas fa-edit"></i> Editar ${juego.Name || 'Videojuego'}`;
        document.getElementById('id').value = juego.id;
        document.getElementById('name').value = juego.Name || '';
        document.getElementById('platform').value = juego.Platform || '';
        document.getElementById('year').value = juego.Year || '';
        document.getElementById('genre').value = juego.Genre || '';
        document.getElementById('publisher').value = juego.Publisher || '';
        document.getElementById('global_sales').value = juego.Global_Sales || '';
    } else {
        titulo.innerHTML = '<i class="fas fa-plus"></i> Nuevo Videojuego';
        document.getElementById('form-videojuego').reset();
        document.getElementById('id').value = '';
    }
    
    formulario.classList.add('active');
}

function ocultarFormulario() {
    document.getElementById('formulario').classList.remove('active');
}

function obtenerDatosFormulario() {
    return {
        rank: 0, // O añade <input type="number" id="rank"> en tu HTML
        name: document.getElementById('name').value,
        platform: document.getElementById('platform').value,
        year: parseInt(document.getElementById('year').value) || null,
        genre: document.getElementById('genre').value,
        publisher: document.getElementById('publisher').value,
        global_sales: parseFloat(document.getElementById('global_sales').value) || 0,
        na_sales: parseFloat(document.getElementById('na_sales')?.value) || 0,
        eu_sales: parseFloat(document.getElementById('eu_sales')?.value) || 0,
        jp_sales: parseFloat(document.getElementById('jp_sales')?.value) || 0,
        other_sales: parseFloat(document.getElementById('other_sales')?.value) || 0
    };
}
// Funciones de filtros
async function cargarOpcionesFiltros() {
    try {
        const res = await fetch('/api/opciones');
        if (!res.ok) throw new Error("Error al cargar opciones de filtros");
        
        const data = await res.json();
        
        // Plataformas
        const platformSelect = document.getElementById('filtro-platform');
        data.plataformas.forEach(platform => {
            const option = document.createElement('option');
            option.value = platform;
            option.textContent = platform;
            platformSelect.appendChild(option);
        });
        
        // Géneros
        const genreSelect = document.getElementById('filtro-genre');
        data.generos.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error(error);
        mostrarToast("Error al cargar filtros", "error");
    }
}

async function aplicarFiltros() {
    // Asegúrate de que los filtrosActuales se están actualizando correctamente
    console.log("Filtros aplicados:", filtrosActuales);
    await cargarVideojuegos();
}

async function resetearFiltros() {
    document.getElementById('filtro-platform').value = '';
    document.getElementById('filtro-genre').value = '';
    document.getElementById('filtro-year').value = '';

    filtrosActuales = {
        platform: '',
        genre: '',
        year: ''
    };

    await cargarVideojuegos();
}
// Funciones de toggle
async function toggleTabla() {
    const contenedor = document.getElementById('contenedor-tabla');
    const btn = document.getElementById('btn-tabla');

    if (contenedor.classList.contains('hidden')) {
        contenedor.classList.remove('hidden');
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar Datos';
        await cargarVideojuegos();
    } else {
        contenedor.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-table"></i> Mostrar Datos';
    }
}


async function toggleGraficos() {
    const contenedor = document.getElementById('contenedor-graficos');
    const btn = document.getElementById('toggle-graficos');

    if (contenedor.classList.contains('hidden')) {
        contenedor.classList.remove('hidden');
        btn.innerHTML = '<i class="fas fa-chart-bar"></i> Ocultar Gráficos';
        await cargarVideojuegos();
    } else {
        contenedor.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-chart-bar"></i> Mostrar Gráficos';
    }
}

// Manejo de acciones en la tabla
async function manejarAccionesTabla(e) {
    // Determina si el click fue en un botón de acción
    const btn = e.target.closest('.accion-btn') || 
                e.target.closest('.editar-btn') || 
                e.target.closest('.eliminar-btn');
    
    if (!btn) return;
    
    // Obtiene la fila y el ID del juego
    const row = btn.closest('tr');
    const id = row.dataset.id;
    
    if (!id) {
        console.error("No se pudo obtener el ID del juego");
        return;
    }
    
    // Determina qué acción ejecutar
    if (btn.classList.contains('editar-btn') ) {
        await editarVideojuego(id);
    } else if (btn.classList.contains('eliminar-btn')) {
        await eliminarVideojuego(id);
    }
}
async function eliminarVideojuego(id) {
    const confirmado = await mostrarConfirmacion(
        "¿Eliminar videojuego?",
        "Esta acción no se puede deshacer",
        "warning"
    );
    
    if (!confirmado) return;
    
    mostrarLoading(true);
    
    try {
        const response = await fetch(`/del/video_games/${id}`, { 
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        mostrarToast(data.mensaje || "Videojuego eliminado correctamente", "success");
        await cargarVideojuegos();
    } catch (error) {
        console.error("Error al eliminar:", error);
        mostrarToast(`Error: ${error.message}`, "error");
    } finally {
        mostrarLoading(false);
    }
}

async function editarVideojuego(id) {
    if (!id) {
        mostrarToast("ID no válido", "error");
        return;
    }

    mostrarLoading(true);
    
    try {
        // Opción 1: Usando parámetro query (?id=)
        const response = await fetch(`/api/list_video_games?id=${id}`);
        
        // Opción 2: Si prefieres la ruta con / (asegúrate que el backend lo soporte)
        // const response = await fetch(`/api/list_video_games/${id}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Error ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        const juego = await response.json();
        
        if (juego) {
            mostrarFormulario(juego);
        } else {
            mostrarToast("Videojuego no encontrado", "error");
        }
    } catch (error) {
        console.error("Error al editar:", error);
        mostrarToast(`Error: ${error.message}`, "error");
    } finally {
        mostrarLoading(false);
    }
}
async function mostrarConfirmacion(titulo, texto, tipo = 'warning') {
    return new Promise((resolve) => {
        // Implementación simplificada - en producción usaría SweetAlert o similar
        const confirmado = confirm(`${titulo}\n${texto}`);
        resolve(confirmado);
    });
}

setupEventListeners();