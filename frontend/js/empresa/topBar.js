/**
 * topbar.js — cargarlo en TODAS las páginas de empresa
 * Maneja: nombre usuario, nombre empresa, logout, campana con dropdown
 */

window.API_BASE = 'http://localhost:3000';

(async function initTopbar() {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!token || !usuario) { window.location.href = '/login.html'; return; }

  // Nombre usuario
  const elNombre = document.getElementById('nombreUsuario');
  if (elNombre) elNombre.textContent = usuario.nombre || usuario.email;

  // Nombre empresa
  if (usuario.empresa_id) {
    try {
      const res = await fetch(`${window.API_BASE}/api/empresas/${usuario.empresa_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const e = await res.json();
        const elEmpresa = document.getElementById('nombreEmpresa');
        if (elEmpresa) elEmpresa.textContent = e.nombre || '';
      }
    } catch (e) {}
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '/login.html';
    });
  }

  // Campana
  inyectarDropdown();
  await cargarNotificacionesTopbar();

  // Refrescar cada 60s
  setInterval(cargarNotificacionesTopbar, 60000);
})();


/* ── Inyectar HTML del dropdown junto a la campana ───────────────────────── */
function inyectarDropdown() {
  const campanaWrap = document.querySelector('.topbar .notification');
  if (!campanaWrap) return;

  // Hacer el contenedor relativo y clickeable
  campanaWrap.style.position = 'relative';
  campanaWrap.style.cursor   = 'pointer';

  // Badge de conteo
  campanaWrap.insertAdjacentHTML('beforeend', `
    <span id="topbarBadge" style="
      display:none;
      position:absolute;
      top:-4px; right:-4px;
      background:#DC2626;
      color:white;
      border-radius:999px;
      font-size:10px;
      font-weight:700;
      padding:1px 5px;
      min-width:16px;
      text-align:center;
      line-height:16px;
      border:2px solid white;
      font-family:'Inter',sans-serif;
    ">0</span>
  `);

  // Dropdown panel
  document.body.insertAdjacentHTML('beforeend', `
    <div id="notiDropdown" style="
      display:none;
      position:fixed;
      top:64px; right:20px;
      width:360px;
      background:white;
      border:1px solid #e2e8f0;
      border-radius:12px;
      box-shadow:0 8px 30px rgba(0,0,0,.12);
      z-index:9999;
      overflow:hidden;
      font-family:'Inter',sans-serif;
      animation:dropdownIn .18s ease;
    ">
      <style>
        @keyframes dropdownIn {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .noti-drop-item { display:flex; align-items:flex-start; gap:12px; padding:13px 16px; border-bottom:1px solid #f8fafc; transition:background .12s; cursor:default; }
        .noti-drop-item:last-child { border-bottom:none; }
        .noti-drop-item:hover { background:#fafbfc; }
        .noti-drop-item.unread { background:#fffbf0; }
        .noti-drop-item.unread:hover { background:#fff7e0; }
        .drop-icon { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .drop-icon .material-icons-outlined { font-size:16px; }
        .drop-icon.aprobado  { background:#dcfce7; color:#16a34a; }
        .drop-icon.rechazado { background:#fee2e2; color:#dc2626; }
        .drop-icon.revision  { background:#fef3c7; color:#d97706; }
        .drop-icon.solicitud { background:#ede9fe; color:#7c3aed; }
        .drop-icon.default   { background:#f1f5f9; color:#64748b; }
        .drop-msg  { font-size:13px; color:#374151; line-height:1.45; margin:0 0 3px; }
        .drop-msg.unread { color:#0f172a; font-weight:500; }
        .drop-fecha { font-size:11px; color:#94a3b8; }
        .drop-unread-dot { width:7px; height:7px; border-radius:50%; background:#d97706; flex-shrink:0; margin-top:5px; }
      </style>

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #f1f5f9;">
        <div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#0f172a;">
          <span class="material-icons-outlined" style="font-size:17px;color:#1B6B4F;">notifications</span>
          Notificaciones
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="dropNoLeidasLabel" style="font-size:11px;color:#94a3b8;"></span>
          <button id="dropMarcarTodas" onclick="dropMarcarTodas()" style="display:none;padding:4px 10px;background:none;border:1.5px solid #e2e8f0;border-radius:6px;font-size:11.5px;font-weight:500;font-family:'Inter',sans-serif;color:#475569;cursor:pointer;">
            Marcar leídas
          </button>
        </div>
      </div>

      <!-- Lista -->
      <div id="dropLista" style="max-height:340px;overflow-y:auto;">
        <div style="padding:32px 16px;text-align:center;color:#94a3b8;">
          <span class="material-icons-outlined" style="font-size:28px;display:block;margin-bottom:6px;color:#cbd5e1;">notifications_off</span>
          <span style="font-size:13px;">Sin notificaciones</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:10px 16px;border-top:1px solid #f1f5f9;text-align:center;">
        <a href="/pages/empresa/notificaciones.html" style="font-size:13px;font-weight:500;color:#1B6B4F;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
          Ver todas
          <span class="material-icons-outlined" style="font-size:14px;">arrow_forward</span>
        </a>
      </div>
    </div>
  `);

  // Toggle al hacer clic en la campana
  campanaWrap.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('notiDropdown');
    const visible  = dropdown.style.display === 'block';
    dropdown.style.display = visible ? 'none' : 'block';
    if (!visible) dropdown.style.animation = 'dropdownIn .18s ease';
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notiDropdown');
    if (dropdown && !dropdown.contains(e.target) && !campanaWrap.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}


/* ── Clasificar tipo ─────────────────────────────────────────────────────── */
function dropClasificar(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('solicitud') || m.includes('auditor') || m.includes('unirse')) return 'solicitud';
  if (m.includes('aprobado') || m.includes('aprobada') || m.includes('aceptada'))  return 'aprobado';
  if (m.includes('rechazado') || m.includes('rechazada')) return 'rechazado';
  if (m.includes('revision')  || m.includes('revisión')  || m.includes('manual'))  return 'revision';
  return 'default';
}

function dropIcono(tipo) {
  return { aprobado:'check_circle', rechazado:'cancel', revision:'manage_search', solicitud:'person_add', default:'notifications' }[tipo] || 'notifications';
}

function dropFecha(fechaStr) {
  if (!fechaStr) return '';
  const diff = Math.floor((Date.now() - new Date(fechaStr)) / 1000);
  if (diff < 60)     return 'Hace unos segundos';
  if (diff < 3600)   return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Ayer';
  return new Date(fechaStr).toLocaleDateString('es-MX', { day:'2-digit', month:'short' });
}


/* ── Cargar notificaciones ───────────────────────────────────────────────── */
async function cargarNotificacionesTopbar() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`${window.API_BASE}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const notis = await res.json();

    const noLeidas = notis.filter(n => !n.leido).length;

    // Badge campana topbar
    const badge = document.getElementById('topbarBadge');
    if (badge) {
      badge.textContent    = noLeidas;
      badge.style.display  = noLeidas > 0 ? 'inline-block' : 'none';
    }

    // Badge sidebar (si existe en la página actual)
    const sidebarBadge = document.getElementById('notiCount');
    if (sidebarBadge) {
      sidebarBadge.textContent   = noLeidas;
      sidebarBadge.style.display = noLeidas > 0 ? 'inline-block' : 'none';
    }

    // Label "X sin leer"
    const label = document.getElementById('dropNoLeidasLabel');
    if (label) label.textContent = noLeidas > 0 ? `${noLeidas} sin leer` : '';

    // Botón marcar todas
    const btnMarcar = document.getElementById('dropMarcarTodas');
    if (btnMarcar) btnMarcar.style.display = noLeidas > 0 ? 'inline-block' : 'none';

    // Renderizar lista (últimas 6)
    const lista   = document.getElementById('dropLista');
    const ultimas = notis.slice(0, 6);

    if (!lista) return;

    if (!ultimas.length) {
      lista.innerHTML = `
        <div style="padding:32px 16px;text-align:center;color:#94a3b8;">
          <span class="material-icons-outlined" style="font-size:28px;display:block;margin-bottom:6px;color:#cbd5e1;">notifications_off</span>
          <span style="font-size:13px;">Sin notificaciones</span>
        </div>`;
      return;
    }

    lista.innerHTML = ultimas.map(n => {
      const tipo  = dropClasificar(n.mensaje);
      const unread = !n.leido;
      return `
        <div class="noti-drop-item ${unread ? 'unread' : ''}">
          <div class="drop-icon ${tipo}">
            <span class="material-icons-outlined">${dropIcono(tipo)}</span>
          </div>
          <div style="flex:1;min-width:0;">
            <p class="drop-msg ${unread ? 'unread' : ''}">${n.mensaje}</p>
            <span class="drop-fecha">${dropFecha(n.fecha)}</span>
          </div>
          ${unread ? '<div class="drop-unread-dot"></div>' : ''}
        </div>
      `;
    }).join('');

  } catch (e) {
    console.warn('[topbar] notificaciones:', e.message);
  }
}


/* ── Marcar todas leídas desde el dropdown ───────────────────────────────── */
async function dropMarcarTodas() {
  const token = localStorage.getItem('token');
  try {
    await fetch(`${window.API_BASE}/api/notificaciones/leer-todas`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    await cargarNotificacionesTopbar();
  } catch (e) {}
}