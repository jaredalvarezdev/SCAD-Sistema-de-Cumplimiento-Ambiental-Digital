/**
 * topBarAdmin.js — cargar en TODAS las páginas de admin
 * Maneja: nombre usuario, logout, campana con dropdown de notificaciones
 */

window.API_BASE = window.API_BASE || 'http://localhost:3000';

(async function initTopbarAdmin() {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!token || !usuario) { window.location.href = '/login.html'; return; }

  // Nombre usuario
  const elNombre = document.getElementById('nombreUsuario');
  if (elNombre) elNombre.textContent = usuario.nombre || usuario.email;

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '/login.html';
    });
  }

  inyectarDropdownAdmin();
  await cargarNotificacionesAdmin();
  setInterval(cargarNotificacionesAdmin, 60000);
})();


/* ── Dropdown ────────────────────────────────────────────────────────────── */
function inyectarDropdownAdmin() {
  const campanaWrap = document.querySelector('.topbar .notification');
  if (!campanaWrap) return;

  campanaWrap.style.position = 'relative';
  campanaWrap.style.cursor   = 'pointer';

  campanaWrap.insertAdjacentHTML('beforeend', `
    <span id="topbarBadge" style="
      display:none;position:absolute;top:-4px;right:-4px;
      background:#DC2626;color:white;border-radius:999px;
      font-size:10px;font-weight:700;padding:1px 5px;
      min-width:16px;text-align:center;line-height:16px;
      border:2px solid white;font-family:'Inter',sans-serif;
    ">0</span>
  `);

  document.body.insertAdjacentHTML('beforeend', `
    <div id="notiDropdown" style="
      display:none;position:fixed;top:64px;right:20px;
      width:380px;background:white;border:1px solid #e2e8f0;
      border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.12);
      z-index:9999;overflow:hidden;font-family:'Inter',sans-serif;
    ">
      <style>
        @keyframes dropdownIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .adrop-item { display:flex;align-items:flex-start;gap:12px;padding:13px 16px;border-bottom:1px solid #f8fafc;transition:background .12s; }
        .adrop-item:last-child { border-bottom:none; }
        .adrop-item:hover { background:#fafbfc; }
        .adrop-item.unread { background:#f8faff; }
        .adrop-icon { width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .adrop-icon .material-icons-outlined { font-size:17px; }
        .adrop-icon.usuario  { background:#ede9fe;color:#7c3aed; }
        .adrop-icon.empresa  { background:#dcfce7;color:#16a34a; }
        .adrop-icon.reporte  { background:#dbeafe;color:#2563eb; }
        .adrop-icon.rechazo  { background:#fee2e2;color:#dc2626; }
        .adrop-icon.default  { background:#f1f5f9;color:#64748b; }
        .adrop-msg  { font-size:13px;color:#374151;line-height:1.45;margin:0 0 3px; }
        .adrop-msg.unread { color:#0f172a;font-weight:500; }
        .adrop-fecha { font-size:11px;color:#94a3b8; }
        .adrop-dot { width:7px;height:7px;border-radius:50%;background:#7c3aed;flex-shrink:0;margin-top:5px; }
      </style>

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #f1f5f9;">
        <div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#0f172a;">
          <span class="material-icons-outlined" style="font-size:17px;color:#1B6B4F;">notifications</span>
          Notificaciones
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="adminDropLabel" style="font-size:11px;color:#94a3b8;"></span>
          <button id="adminMarcarTodas" onclick="adminDropMarcarTodas()" style="display:none;padding:4px 10px;background:none;border:1.5px solid #e2e8f0;border-radius:6px;font-size:11.5px;font-weight:500;font-family:'Inter',sans-serif;color:#475569;cursor:pointer;">
            Marcar leídas
          </button>
        </div>
      </div>

      <!-- Lista -->
      <div id="adminDropLista" style="max-height:360px;overflow-y:auto;">
        <div style="padding:32px 16px;text-align:center;color:#94a3b8;">
          <span class="material-icons-outlined" style="font-size:28px;display:block;margin-bottom:6px;color:#cbd5e1;">notifications_off</span>
          <span style="font-size:13px;">Sin notificaciones</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:10px 16px;border-top:1px solid #f1f5f9;text-align:center;">
        <span style="font-size:12px;color:#94a3b8;">Las notificaciones se eliminan al marcarlas leídas</span>
      </div>
    </div>
  `);

  campanaWrap.addEventListener('click', (e) => {
    e.stopPropagation();
    const dd      = document.getElementById('notiDropdown');
    const visible = dd.style.display === 'block';
    dd.style.display = visible ? 'none' : 'block';
    if (!visible) dd.style.animation = 'dropdownIn .18s ease';
  });

  document.addEventListener('click', (e) => {
    const dd = document.getElementById('notiDropdown');
    if (dd && !dd.contains(e.target) && !campanaWrap.contains(e.target)) {
      dd.style.display = 'none';
    }
  });
}


/* ── Clasificar tipo para admin ──────────────────────────────────────────── */
function adminClasificar(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('registró') || m.includes('usuario'))  return 'usuario';
  if (m.includes('empresa'))                             return 'empresa';
  if (m.includes('rechazó') || m.includes('rechazado')) return 'rechazo';
  if (m.includes('reporte') || m.includes('envió'))     return 'reporte';
  return 'default';
}

function adminIcono(tipo) {
  return { usuario:'person_add', empresa:'business', reporte:'description', rechazo:'cancel', default:'notifications' }[tipo] || 'notifications';
}

function adminFecha(fechaStr) {
  if (!fechaStr) return '';
  const diff = Math.floor((Date.now() - new Date(fechaStr)) / 1000);
  if (diff < 60)     return 'Hace unos segundos';
  if (diff < 3600)   return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Ayer';
  return new Date(fechaStr).toLocaleDateString('es-MX', { day:'2-digit', month:'short' });
}


/* ── Cargar notificaciones ───────────────────────────────────────────────── */
async function cargarNotificacionesAdmin() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`${window.API_BASE}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const notis    = await res.json();
    const noLeidas = notis.filter(n => !n.leido).length;

    // Badge
    const badge = document.getElementById('topbarBadge');
    if (badge) { badge.textContent = noLeidas; badge.style.display = noLeidas > 0 ? 'inline-block' : 'none'; }

    // Label
    const label = document.getElementById('adminDropLabel');
    if (label) label.textContent = noLeidas > 0 ? `${noLeidas} sin leer` : '';

    // Botón marcar todas
    const btn = document.getElementById('adminMarcarTodas');
    if (btn) btn.style.display = noLeidas > 0 ? 'inline-block' : 'none';

    // Lista (últimas 8)
    const lista   = document.getElementById('adminDropLista');
    const ultimas = notis.slice(0, 8);

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
      const tipo   = adminClasificar(n.mensaje);
      const unread = !n.leido;
      return `
        <div class="adrop-item ${unread ? 'unread' : ''}">
          <div class="adrop-icon ${tipo}">
            <span class="material-icons-outlined">${adminIcono(tipo)}</span>
          </div>
          <div style="flex:1;min-width:0;">
            <p class="adrop-msg ${unread ? 'unread' : ''}">${n.mensaje}</p>
            <span class="adrop-fecha">${adminFecha(n.fecha)}</span>
          </div>
          ${unread ? '<div class="adrop-dot"></div>' : ''}
        </div>
      `;
    }).join('');

  } catch (e) {
    console.warn('[topBarAdmin] notificaciones:', e.message);
  }
}


/* ── Marcar todas leídas ─────────────────────────────────────────────────── */
async function adminDropMarcarTodas() {
  const token = localStorage.getItem('token');
  try {
    await fetch(`${window.API_BASE}/api/notificaciones/leer-todas`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` }
    });
    await cargarNotificacionesAdmin();
  } catch (e) {}
}