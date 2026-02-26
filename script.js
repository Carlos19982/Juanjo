
// --- CONFIGURACIÓN Y ESTADO ---
let allRequests = [];
let currentPage = 1;
const itemsPerPage = 3;

// --- POLLING AJAX (Reemplazo de SSE para mayor estabilidad) ---
let pollingTimer = null;
let sseLastId = 0;
let isPolling = false;

function updateSseBadge(state) {
    const badge = document.getElementById('sse-badge');
    if (!badge) return;
    if (state === 'connected') {
        badge.className = 'flex items-center gap-1.5 text-xs font-bold text-green-400';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block"></span> EN VIVO';
    } else {
        badge.className = 'flex items-center gap-1.5 text-xs font-bold text-red-400';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span> DESCONECTADO';
    }
}

async function pollRequests() {
    if (!isPolling) return;
    try {
        const result = await apiFetch('GET', null, `lastId=${sseLastId}`);
        if (result.success && result.data && result.data.length > 0) {
            let hasNew = false;

            result.data.forEach(req => {
                // Actualizar el lastId
                if (parseInt(req.id) > sseLastId) sseLastId = parseInt(req.id);

                // Evitar duplicados
                const exists = allRequests.some(r => r.id === req.id);
                if (!exists) {
                    allRequests.unshift(req);
                    hasNew = true;
                }
            });

            if (hasNew) {
                const badge = document.getElementById('request-count');
                if (badge) badge.textContent = `${allRequests.length} Peticiones`;
                renderPaginatedRequests();
                showToast('🎵 ¡Nueva petición de canción!');
            }
        }
    } catch (err) {
        console.error('Polling error:', err);
    }
}

function initSSE() {
    // Reutilizamos el nombre initSSE para no romper la llamada del showMenu
    isPolling = true;
    updateSseBadge('connected');
    clearInterval(pollingTimer);
    pollingTimer = setInterval(pollRequests, 3000); // Poll cada 3 segundos
}

function stopSSE() {
    isPolling = false;
    clearInterval(pollingTimer);
    updateSseBadge('disconnected');
}

// Helper para refrescar iconos
const refreshIcons = () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

let isSongSelected = false;
const COOLDOWN_TIME = 30 * 60 * 1000; // 30 minutos en ms

// --- API FETCH HELPERS ---
async function apiFetch(method = 'GET', data = null, param = null) {
    let url = 'api.php';
    if (param) {
        if (typeof param === 'string' && param.includes('=')) {
            url += `?${param}`;
        } else {
            url += `?id=${param}`;
        }
    }
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(url, options);
        if (response.status === 401) {
            backToLogin();
            return { success: false, message: "Sesión expirada" };
        }
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("API Error (Invalid JSON):", text);
            return { success: false, message: "Error del Servidor (Ver Consola)" };
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        return { success: false, message: "Error de conexión" };
    }
}

// --- FUNCIONES GLOBALES ---

window.standardLogin = async () => {
    const btn = document.querySelector('#login-container button');
    const input = document.getElementById('user-login-name');
    const username = input.value.trim();

    if (!username) return showToast("Por favor, pon un nombre");

    // Feedback de carga
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="animate-spin" data-lucide="loader-2"></i> Entrando...';
    refreshIcons();

    try {
        const response = await fetch('login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const result = await response.json();

        if (result.success) {
            localStorage.setItem('jukebox_role', 'user');
            localStorage.setItem('jukebox_username', username);
            showMenu('user');
        } else {
            showToast(result.message);
        }
    } catch (e) {
        showToast("Error al conectar");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        refreshIcons();
    }
};

function showMenu(role) {
    const loginCont = document.getElementById('login-container');
    const userMenu = document.getElementById('user-menu');
    const adminMenu = document.getElementById('admin-menu');

    // Desvanecimiento suave (opcional con CSS)
    loginCont.classList.add('hidden');
    userMenu.classList.add('hidden');
    adminMenu.classList.add('hidden');

    if (role === 'user') {
        userMenu.classList.remove('hidden');
        userMenu.classList.add('animate-fade-in');
    } else if (role === 'admin') {
        adminMenu.classList.remove('hidden');
        adminMenu.classList.add('animate-fade-in');
        currentPage = 1;
        loadRequests();
        initSSE();
    }
    refreshIcons();
}

async function loadRequests() {
    const result = await apiFetch('GET');
    if (result.success) {
        allRequests = result.data;
        // Sincronizar el lastId SSE con el máximo ID cargado
        if (allRequests.length > 0) {
            sseLastId = Math.max(...allRequests.map(r => parseInt(r.id)));
        }
        const badge = document.getElementById('request-count');
        if (badge) badge.textContent = `${allRequests.length} Peticiones`;
        renderPaginatedRequests();
    }
}

window.backToLogin = () => {
    stopSSE(); // Detener SSE y timer de reconexión
    localStorage.removeItem('jukebox_role');
    localStorage.removeItem('jukebox_username');
    window.location.href = 'index.html';
};

window.updateStatus = async (id, status, event) => {
    const btn = event.target || event.currentTarget;
    if (!btn) return;
    btn.classList.add('opacity-50', 'pointer-events-none');

    const result = await apiFetch('PUT', { id, status });
    if (result.success) {
        showToast(`Petición ${status === 'accepted' ? 'aceptada' : 'rechazada'}`);
        await loadRequests();
    } else {
        btn.classList.remove('opacity-50', 'pointer-events-none');
    }
};

window.deleteRequest = async (id) => {
    if (!confirm("¿Estás seguro de eliminar esta petición?")) return;

    const result = await apiFetch('DELETE', null, id);
    if (result.success) {
        showToast("Petición eliminada");
        loadRequests();
    }
};

// --- LÓGICA DE PAGINACIÓN ---

function renderPaginatedRequests() {
    const container = document.getElementById('requests-list');
    const noReqs = document.getElementById('no-requests');
    const paginationUI = document.getElementById('pagination-controls');

    if (!container || !noReqs || !paginationUI) return;

    if (allRequests.length === 0) {
        noReqs.classList.remove('hidden');
        paginationUI.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    noReqs.classList.add('hidden');
    paginationUI.classList.remove('hidden');

    const totalPages = Math.ceil(allRequests.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = allRequests.slice(start, end);

    document.getElementById('page-info').textContent = `Página ${currentPage} de ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;

    container.innerHTML = '';
    pageItems.forEach(req => {
        const element = document.createElement('div');
        element.id = req.id;
        element.style.animationDelay = `${pageItems.indexOf(req) * 0.1}s`;

        let statusClasses = "bg-white border-slate-100";
        let badge = "";
        if (req.status === 'accepted') {
            statusClasses = "bg-green-50 border-green-200";
            badge = `<span class="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded uppercase">Aceptada</span>`;
        } else if (req.status === 'rejected') {
            statusClasses = "bg-red-50 border-red-200";
            badge = `<span class="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase">Rechazada</span>`;
        }

        element.className = `${statusClasses} p-4 rounded-xl shadow-sm border flex flex-col gap-3 transition-all duration-300 mb-3 animate-slide-up`;

        const imageHtml = req.album_image ? `<img src="${req.album_image}" class="w-12 h-12 rounded object-cover shadow-sm bg-slate-100" alt="Album Art">` : '';

        element.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-grow flex gap-3">
                    ${imageHtml}
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-bold text-slate-800">${escapeHTML(req.song_name)}</h3>
                            ${badge}
                        </div>
                        <p class="text-sm text-slate-500 flex items-center gap-1">
                            <i data-lucide="mic-2" class="w-3 h-3"></i> ${escapeHTML(req.artist_name)}
                        </p>
                        <div class="flex items-center gap-3 mt-1">
                            <p class="text-[10px] text-slate-400">Por: ${escapeHTML(req.username || 'Usuario')}</p>
                            <span class="text-[10px] text-slate-300">•</span>
                            <p class="text-[10px] text-slate-400 flex items-center gap-1">
                                <i data-lucide="clock" class="w-2.5 h-2.5"></i> ${formatTime(req.created_at)}
                            </p>
                        </div>
                    </div>
                </div>
                <button onclick="deleteRequest('${req.id}')" class="p-1 text-slate-300 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="flex gap-2">
                <button onclick="updateStatus('${req.id}', 'accepted', event)" 
                    class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${req.status === 'accepted' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border border-green-200 hover:bg-green-50 active:scale-95'}">
                    Aceptar
                </button>
                <button onclick="updateStatus('${req.id}', 'rejected', event)" 
                    class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${req.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50 active:scale-95'}">
                    Rechazar
                </button>
            </div>
        `;
        container.appendChild(element);
    });
    refreshIcons();
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' +
        date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderPaginatedRequests();
    }
});

document.getElementById('next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(allRequests.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderPaginatedRequests();
    }
});

// --- VALIDACIÓN Y COOLDOWN ---

function checkCooldown() {
    const submitBtn = document.getElementById('submit-request');
    const timerDisplay = document.getElementById('cooldown-timer');
    if (!submitBtn || !timerDisplay) return;

    const lastRequest = localStorage.getItem('jukebox_last_request');
    const backendCooldown = localStorage.getItem('jukebox_backend_cooldown');

    let timePassed = 0;

    if (backendCooldown) {
        const cooldownData = JSON.parse(backendCooldown);
        timePassed = Date.now() - cooldownData.timestamp + (COOLDOWN_TIME - cooldownData.remainingMs);
    } else if (lastRequest) {
        timePassed = Date.now() - parseInt(lastRequest);
    } else {
        timerDisplay.textContent = "";
        updateSubmitButtonState();
        return false; // Sin cooldown
    }

    if (timePassed < COOLDOWN_TIME) {
        const remainingMs = COOLDOWN_TIME - timePassed;
        const remainingMins = Math.ceil(remainingMs / (60 * 1000));

        timerDisplay.textContent = `Próxima petición en ${remainingMins} min`;
        submitBtn.disabled = true;
        return true; // Cooldown activo
    }

    timerDisplay.textContent = "";
    updateSubmitButtonState();
    return false; // Sin cooldown
}

function updateSubmitButtonState() {
    const submitBtn = document.getElementById('submit-request');
    if (!submitBtn) return;

    const lastRequest = localStorage.getItem('jukebox_last_request');
    const onCooldown = lastRequest && (Date.now() - parseInt(lastRequest) < COOLDOWN_TIME);

    // Solo habilitar si hay canción seleccionada Y no hay cooldown
    submitBtn.disabled = !isSongSelected || onCooldown;
}

// Iniciar contador de cooldown cada minuto
setInterval(checkCooldown, 60000);

// --- ACCIONES ---

document.getElementById('submit-request').addEventListener('click', async () => {
    if (checkCooldown()) return;
    if (!isSongSelected) return showToast("Por favor, selecciona una canción de la lista");

    const btn = document.getElementById('submit-request');
    const songInput = document.getElementById('song-name');
    const artistInput = document.getElementById('artist-name');

    const songName = songInput.value.trim();
    const artistName = artistInput.value.trim();

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="animate-spin" data-lucide="loader-2"></i> Enviando...';
    refreshIcons();

    const result = await apiFetch('POST', {
        song: songName,
        artist: artistName,
        image: document.getElementById('album-image-url')?.value
    });

    if (result.success) {
        songInput.value = '';
        artistInput.value = '';
        if (document.getElementById('album-image-url')) document.getElementById('album-image-url').value = '';
        localStorage.setItem('jukebox_last_request', Date.now());
        localStorage.removeItem('jukebox_backend_cooldown'); // Limpiar sync previo si existía
        isSongSelected = false;
        showToast("¡Petición enviada!");
        checkCooldown(); // Bloquear inmediatamente
    } else {
        if (result.cooldownRemaining) {
            // Sincronizar el cooldown del backend con el frontend
            localStorage.setItem('jukebox_backend_cooldown', JSON.stringify({
                remainingMs: result.cooldownRemaining,
                timestamp: Date.now()
            }));
            checkCooldown();
        }
        showToast(result.message || "Error al enviar");
        btn.disabled = false;
    }

    btn.innerHTML = originalHTML;
    refreshIcons();
});

// --- LÓGICA DE SPOTIFY ---
let searchTimeout = null;
let spotifySearchResults = [];
let currentSearchPage = 1;
const searchItemsPerPage = 4;

const songInput = document.getElementById('song-name');
const artistInput = document.getElementById('artist-name');
const searchBtn = document.getElementById('search-tracks');
const resultsContainer = document.getElementById('spotify-results');
const searchPanel = document.getElementById('search-panel');

window.toggleSearchPanel = (show) => {
    if (show) {
        searchPanel.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        refreshIcons();
    } else {
        searchPanel.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
};

async function performSearch() {
    const song = songInput?.value.trim() || '';
    const artist = artistInput?.value.trim() || '';

    const query = `${song} ${artist}`.trim();

    if (query.length < 2) return;

    // Feedback visual en el botón
    const originalContent = searchBtn.innerHTML;
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="animate-spin" data-lucide="loader-2"></i> Buscando...';
    refreshIcons();

    try {
        const response = await fetch(`spotify_search.php?q=${encodeURIComponent(query)}`);
        const result = await response.json();

        if (result.success) {
            spotifySearchResults = result.data;
            currentSearchPage = 1;
            renderSpotifyResults();
            toggleSearchPanel(true);
        } else {
            showToast(result.message);
        }
    } catch (e) {
        showToast("Error en la búsqueda");
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = originalContent;
        refreshIcons();
    }
}

if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
}

function renderSpotifyResults() {
    if (spotifySearchResults.length === 0) {
        resultsContainer.innerHTML = '<div class="text-center py-12 text-white/20">No se encontraron resultados</div>';
        return;
    }

    const totalPages = Math.ceil(spotifySearchResults.length / searchItemsPerPage);
    if (currentSearchPage > totalPages) currentSearchPage = totalPages || 1;

    const start = (currentSearchPage - 1) * searchItemsPerPage;
    const end = start + searchItemsPerPage;
    const items = spotifySearchResults.slice(start, end);

    document.getElementById('search-page-info').textContent = `Página ${currentSearchPage} de ${totalPages}`;
    document.getElementById('prev-search-page').disabled = currentSearchPage === 1;
    document.getElementById('next-search-page').disabled = currentSearchPage === totalPages;

    resultsContainer.innerHTML = items.map(track => `
        <div class="spotify-track-item flex items-center gap-4 cursor-pointer"
             onclick="selectSpotifyTrack('${track.name.replace(/'/g, "\\'")}', '${track.artist.replace(/'/g, "\\'")}', '${track.image}')">
            <img src="${track.image}" class="w-14 h-14 rounded-lg shadow-2xl">
            <div class="track-info flex-grow">
                <div class="track-name">${escapeHTML(track.name)}</div>
                <div class="track-artist">${escapeHTML(track.artist)}</div>
            </div>
            <i data-lucide="plus-circle" class="w-5 h-5 text-primary-gold opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </div>
    `).join('');

    refreshIcons();
}

document.getElementById('prev-search-page').addEventListener('click', () => {
    if (currentSearchPage > 1) {
        currentSearchPage--;
        renderSpotifyResults();
    }
});

document.getElementById('next-search-page').addEventListener('click', () => {
    const totalPages = Math.ceil(spotifySearchResults.length / searchItemsPerPage);
    if (currentSearchPage < totalPages) {
        currentSearchPage++;
        renderSpotifyResults();
    }
});

window.selectSpotifyTrack = (name, artist, image) => {
    if (songInput) songInput.value = name;
    if (artistInput) artistInput.value = artist;
    const albumInput = document.getElementById('album-image-url');
    if (albumInput) albumInput.value = image;

    isSongSelected = true;
    checkCooldown(); // Esto habilitará el botón si no hay cooldown
    toggleSearchPanel(false);
};

// VALIDACIÓN: Si el usuario borra o escribe a mano, invalidar la selección
if (songInput) {
    songInput.addEventListener('input', () => {
        isSongSelected = false;
        updateSubmitButtonState();
    });
}
if (artistInput) {
    artistInput.addEventListener('input', () => {
        isSongSelected = false;
        updateSubmitButtonState();
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

// Inicialización
window.addEventListener('DOMContentLoaded', async () => {
    // ⚠️ Protección para evitar errores CORS si se abre el archivo directamente
    if (window.location.protocol === 'file:') {
        alert("¡Atención! Estás abriendo el archivo directamente.\n\nPara que la base de datos funcione, debes abrirlo a través de XAMPP (localhost).\n\nEjemplo: http://localhost/Juanjo/index.html");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');

    const savedRole = localStorage.getItem('jukebox_role');
    const savedName = localStorage.getItem('jukebox_username');

    // 1. Prioridad: Params de la URL (Admin login)
    if (roleParam === 'admin') {
        showMenu('admin');
    }
    // 2. Persistencia: Si ya estaba logueado como usuario
    else if (savedRole === 'user' && savedName) {
        // Validar si la sesión sigue activa en el backend
        const check = await apiFetch('GET');
        if (check.success) {
            if (check.cooldownRemaining > 0) {
                localStorage.setItem('jukebox_backend_cooldown', JSON.stringify({
                    remainingMs: check.cooldownRemaining,
                    timestamp: Date.now()
                }));
            } else {
                localStorage.removeItem('jukebox_backend_cooldown');
            }
            showMenu('user');
        } else {
            // Si la sesión murió en el PHP, limpiar y mostrar login
            localStorage.removeItem('jukebox_role');
            localStorage.removeItem('jukebox_username');
            document.getElementById('login-container').classList.remove('hidden');
        }
    }
    // 3. Nada: Mostrar login
    else {
        document.getElementById('login-container').classList.remove('hidden');
    }
    checkCooldown(); // Verificar estado inicial del botón al cargar
    refreshIcons();
});
