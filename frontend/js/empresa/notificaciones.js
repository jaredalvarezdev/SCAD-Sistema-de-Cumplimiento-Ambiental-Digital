const API_BASE = 'http://localhost:3000';

let todas        = [];
let filtroActual = 'todas';

// ── Clasificar tipo por palabras clave ────────────────────────────────────────
function clasificar(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('solicitud') || m.includes('unirse') || m.includes('auditor') || m.includes('solicita')) return 'solicitud';
  if (m.includes('aprobado') || m.includes('aprobada') || m.includes('aceptada'))  return 'aprobado';
  if (m.includes('rechazado') || m.includes('rechazada') || m.includes('no cumple')) return 'rechazado';
  if (m.includes('revision') || m.includes('revisión') || m.includes('manual') || m.includes('revisar')) return 'revision';
  return 'default';
}

function getIcono(tipo) {
  const map = {
    aprobado:  'check_circle',
    rechazado: 'cancel',
    revision:  'manage_search',
    solicitud: 'person_add',
    default:   'notifications'
  };
  return map[tipo] || 'notifications';
}

function getBadgeLabel(tipo) {
  const map = {
    aprobado:  'Aprobado',
    rechazado: 'Rechazado',
    revision:  'En revisión',
    solicitud: 'Solicitud',
  };
  return map[tipo] || null;
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  const fecha = new Date(fechaStr);
  const diff  = Math.floor((Date.now() - fecha) / 1000);
  if (diff < 60)     return 'Hace unos segundos';
  if (diff < 3600)   return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Ayer';
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mostrarAlerta(tipo, titulo, mensaje) {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  const cfg = {
    success: { bg: '#1B6B4F', color: '#fff',   icono: 'check_circle' },
    danger:  { bg: '#fff',    color: '#dc2626', icono: 'error',       border: '#fca5a5' },
    info:    { bg: '#fff',    color: '#2563eb', icono: 'info',        border: '#93c5fd' },
  }[tipo] || { bg: '#fff', color: '#2563eb', icono: 'info', border: '#93c5fd' };

  const d = document.createElement('div');
  d.style.cssText = `
    background:${cfg.bg};color:${cfg.color};
    border:1px solid ${cfg.border || cfg.bg};
    padding:13px 16px;border-radius:10px;
    display:flex;align-items:flex-start;gap:10px;
    animation:slideInRight .3s ease-out;
    min-width:270px;max-width:360px;
    box-shadow:0 4px 16px rgba(0,0,0,.1);
    font-family:'Inter',sans-serif;font-size:13px;
  `;
  d.innerHTML = `
    <span class="material-icons-outlined" style="font-size:18px;flex-shrink:0;margin-top:1px;">${cfg.icono}</span>
    <div style="flex:1;">
      <div style="font-weight:600;margin-bottom:2px;">${titulo}</div>
      <div style="opacity:.85;line-height:1.4;">${mensaje}</div>
    </div>
    <span onclick="this.parentElement.remove()" style="cursor:pointer;opacity:.5;font-size:16px;line-height:1;flex-shrink:0;margin-top:1px;">×</span>
  `;
  container.appendChild(d);
  setTimeout(() => {
    d.style.transition = 'opacity .3s';
    d.style.opacity    = '0';
    setTimeout(() => d.remove(), 300);
  }, 3500);
}

// ── Extraer solicitud_id del mensaje ─────────────────────────────────────────
function extraerSolicitudId(msg = '') {
  const match = msg.match(/solicitud[_\s#]+(\d+)/i) || msg.match(/#(\d+)/);
  return match ? Number(match[1]) : null;
}

// ── Extraer empresa_id del usuario logueado ───────────────────────────────────
function getEmpresaId() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  return usuario.empresa_id || null;
}

// ── Animación de salida y eliminación del DOM ─────────────────────────────────
async function animarYEliminar(notiId) {
  const el = document.getElementById(`noti-${notiId}`);
  if (el) {
    el.style.transition = 'opacity .2s, transform .2s, max-height .25s, padding .25s';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(16px)';
    el.style.maxHeight  = el.scrollHeight + 'px';
    await new Promise(r => setTimeout(r, 30));
    el.style.maxHeight     = '0';
    el.style.paddingTop    = '0';
    el.style.paddingBottom = '0';
    await new Promise(r => setTimeout(r, 260));
    el.remove();
  }
  todas = todas.filter(n => n.id !== notiId);
  actualizarUI();
}

// ── Aceptar solicitud desde notificación ─────────────────────────────────────
async function aceptarSolicitud(solicitudId, notiId, btn) {
  const token     = localStorage.getItem('token');
  const empresaId = getEmpresaId();
  if (!empresaId || !solicitudId) {
    mostrarAlerta('danger', 'Error', 'No se pudo identificar la empresa o la solicitud');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Aceptando...';

  try {
    const res  = await fetch(`${API_BASE}/api/solicitudes/empresa/${empresaId}/solicitudes/${solicitudId}/aceptar`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (res.ok) {
      mostrarAlerta('success', 'Auditor aceptado', 'El auditor fue agregado a tu empresa correctamente');
      await animarYEliminar(notiId);
    } else if (res.status === 400 && data.mensaje?.includes('ya fue procesada')) {
      // Solicitud ya atendida — quitar la notificación igual
      mostrarAlerta('info', 'Ya procesada', 'Esta solicitud ya fue atendida anteriormente');
      await animarYEliminar(notiId);
    } else {
      throw new Error(data.mensaje || 'Error al aceptar');
    }

  } catch (err) {
    mostrarAlerta('danger', 'Error', err.message);
    btn.disabled    = false;
    btn.textContent = 'Aceptar';
  }
}

// ── Rechazar solicitud desde notificación ────────────────────────────────────
async function rechazarSolicitud(solicitudId, notiId, btn) {
  const token     = localStorage.getItem('token');
  const empresaId = getEmpresaId();
  if (!empresaId || !solicitudId) {
    mostrarAlerta('danger', 'Error', 'No se pudo identificar la empresa o la solicitud');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Rechazando...';

  try {
    const res  = await fetch(`${API_BASE}/api/solicitudes/empresa/${empresaId}/solicitudes/${solicitudId}/rechazar`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (res.ok) {
      mostrarAlerta('info', 'Solicitud rechazada', 'La solicitud fue rechazada');
      await animarYEliminar(notiId);
    } else if (res.status === 400 && data.mensaje?.includes('ya fue procesada')) {
      mostrarAlerta('info', 'Ya procesada', 'Esta solicitud ya fue atendida anteriormente');
      await animarYEliminar(notiId);
    } else {
      throw new Error(data.mensaje || 'Error al rechazar');
    }

  } catch (err) {
    mostrarAlerta('danger', 'Error', err.message);
    btn.disabled    = false;
    btn.textContent = 'Rechazar';
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!token || !usuario) { window.location.href = '/login.html'; return; }

  document.getElementById('nombreUsuario').textContent = usuario.nombre || usuario.email;

  if (usuario.empresa_id) {
    try {
      const res = await fetch(`${API_BASE}/api/empresas/${usuario.empresa_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const e = await res.json();
        document.getElementById('nombreEmpresa').textContent = e.nombre || '';
      }
    } catch (e) {}
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login.html';
  });

  document.getElementById('confirmOkBtn').addEventListener('click', () => {
    cerrarConfirm();
    ejecutarEliminarTodas();
  });

  document.getElementById('confirmOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarConfirm();
  });

  await cargarNotificaciones();
});

// ── Cargar ────────────────────────────────────────────────────────────────────
async function cargarNotificaciones() {
  const token = localStorage.getItem('token');
  mostrarSkeleton();

  try {
    const res = await fetch(`${API_BASE}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error ' + res.status);
    todas = await res.json();
    actualizarUI();
  } catch (err) {
    document.getElementById('notiList').innerHTML = `
      <li style="padding:48px 20px;text-align:center;color:#dc2626;">
        <span class="material-icons-outlined" style="font-size:36px;display:block;margin-bottom:8px;color:#fca5a5;">error_outline</span>
        <p style="font-size:14px;color:#64748b;margin-bottom:14px;">No se pudieron cargar las notificaciones</p>
        <button onclick="recargar()" style="padding:8px 16px;background:#1B6B4F;color:white;border:none;border-radius:7px;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;font-weight:500;">
          Reintentar
        </button>
      </li>
    `;
  }
}

function recargar() { cargarNotificaciones(); }

// ── Actualizar UI ─────────────────────────────────────────────────────────────
function actualizarUI() {
  const total       = todas.length;
  const noLeidas    = todas.filter(n => !n.leido).length;
  const solicitudes = todas.filter(n => clasificar(n.mensaje) === 'solicitud').length;

  document.getElementById('statTotal').textContent       = total;
  document.getElementById('statNoLeidas').textContent    = noLeidas;
  document.getElementById('statSolicitudes').textContent = solicitudes;

  const conteos = { todas: total, 'no-leidas': noLeidas, solicitud: 0, aprobado: 0, rechazado: 0, revision: 0 };
  todas.forEach(n => {
    const t = clasificar(n.mensaje);
    if (conteos[t] !== undefined) conteos[t]++;
  });
  Object.entries(conteos).forEach(([k, v]) => {
    const el = document.getElementById(`cnt-${k}`);
    if (el) el.textContent = v;
  });

  document.getElementById('btnMarcarTodas').style.display   = noLeidas > 0 ? 'inline-flex' : 'none';
  document.getElementById('btnEliminarTodas').style.display = total    > 0 ? 'inline-flex' : 'none';

  const badge = document.getElementById('notiCount');
  if (badge) { badge.textContent = noLeidas; badge.style.display = noLeidas > 0 ? 'inline-block' : 'none'; }

  renderFiltradas();
}

// ── Filtrar y renderizar ──────────────────────────────────────────────────────
function filtrar(tipo, btn) {
  filtroActual = tipo;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const labels = {
    'todas':     'Todas las notificaciones',
    'no-leidas': 'Sin leer',
    'solicitud': 'Solicitudes de auditor',
    'aprobado':  'Reportes aprobados',
    'rechazado': 'Reportes rechazados',
    'revision':  'En revisión manual',
  };
  document.getElementById('headerLabel').textContent = labels[tipo] || 'Notificaciones';
  renderFiltradas();
}

function renderFiltradas() {
  let lista = todas;

  if (filtroActual === 'no-leidas') {
    lista = lista.filter(n => !n.leido);
  } else if (filtroActual !== 'todas') {
    lista = lista.filter(n => clasificar(n.mensaje) === filtroActual);
  }

  const headerCount = document.getElementById('headerCount');
  headerCount.textContent = lista.length ? `${lista.length} notificación${lista.length !== 1 ? 'es' : ''}` : '';

  if (!lista.length) {
    const msgs = {
      'no-leidas': 'Todas las notificaciones han sido leídas.',
      'solicitud': 'No hay solicitudes de auditor pendientes.',
    };
    document.getElementById('notiList').innerHTML = `
      <li>
        <div class="empty-state">
          <span class="material-icons-outlined">notifications_off</span>
          <h4>${filtroActual === 'todas' ? 'Sin notificaciones' : 'Nada por aquí'}</h4>
          <p>${msgs[filtroActual] || 'No hay notificaciones en esta categoría.'}</p>
        </div>
      </li>
    `;
    return;
  }

  document.getElementById('notiList').innerHTML = lista.map((n, i) => {
    const tipo        = clasificar(n.mensaje);
    const icono       = getIcono(tipo);
    const badge       = getBadgeLabel(tipo);
    const noLeida     = !n.leido;
    const esSolicitud = tipo === 'solicitud';
    const solicitudId = esSolicitud ? extraerSolicitudId(n.mensaje) : null;

    // Limpiar emojis del mensaje para mostrar
    const mensajeLimpio = n.mensaje.replace(/[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[#*0-9]\uFE0F\u20E3/gu, '').trim();

    const botonesAccion = (esSolicitud && solicitudId) ? `
      <div class="noti-acciones-solicitud" style="display:flex;gap:8px;margin-top:10px;">
        <button
          onclick="aceptarSolicitud(${solicitudId}, ${n.id}, this)"
          style="padding:6px 14px;background:#1B6B4F;color:#fff;border:none;border-radius:7px;
                 font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;
                 display:flex;align-items:center;gap:5px;">
          <span class="material-icons-outlined" style="font-size:14px;">check</span>
          Aceptar
        </button>
        <button
          onclick="rechazarSolicitud(${solicitudId}, ${n.id}, this)"
          style="padding:6px 14px;background:#fff;color:#dc2626;border:1.5px solid #fca5a5;border-radius:7px;
                 font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;
                 display:flex;align-items:center;gap:5px;">
          <span class="material-icons-outlined" style="font-size:14px;">close</span>
          Rechazar
        </button>
      </div>
    ` : '';

    return `
      <li class="noti-item ${noLeida ? 'no-leida' : ''} tipo-${tipo}" id="noti-${n.id}"
          style="animation: fadeIn .3s ${i * 0.04}s ease both;">
        <div class="noti-icon tipo-${tipo}">
          <span class="material-icons-outlined">${icono}</span>
        </div>
        <div class="noti-content">
          <p class="noti-mensaje">${mensajeLimpio}</p>
          <div class="noti-meta">
            <span class="noti-fecha">
              <span class="material-icons-outlined">schedule</span>
              ${formatFecha(n.fecha)}
            </span>
            ${badge ? `<span class="noti-badge ${tipo}">${badge}</span>` : ''}
          </div>
          ${botonesAccion}
        </div>
        ${noLeida ? `<div class="unread-dot"></div>` : ''}
        <div class="noti-actions">
          ${noLeida ? `
            <button class="noti-action-btn read" title="Marcar como leída" onclick="marcarLeida(${n.id})">
              <span class="material-icons-outlined">mark_email_read</span>
            </button>
          ` : ''}
          <button class="noti-action-btn trash" title="Eliminar" onclick="eliminarNoti(${n.id})">
            <span class="material-icons-outlined">delete</span>
          </button>
        </div>
      </li>
    `;
  }).join('');
}

// ── Acciones individuales ─────────────────────────────────────────────────────
async function marcarLeida(id, actualizarVista = true) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/notificaciones/${id}/leida`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const idx = todas.findIndex(n => n.id === id);
    if (idx !== -1) todas[idx].leido = true;
    if (actualizarVista) actualizarUI();
  } catch {
    if (actualizarVista) mostrarAlerta('danger', 'Error', 'No se pudo marcar como leída');
  }
}

async function eliminarNoti(id) {
  const token = localStorage.getItem('token');
  const el    = document.getElementById(`noti-${id}`);

  if (el) {
    el.style.transition = 'opacity .2s, transform .2s, max-height .25s, padding .25s';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(16px)';
    el.style.maxHeight  = el.scrollHeight + 'px';
    await new Promise(r => setTimeout(r, 30));
    el.style.maxHeight     = '0';
    el.style.paddingTop    = '0';
    el.style.paddingBottom = '0';
    await new Promise(r => setTimeout(r, 260));
  }

  try {
    const res = await fetch(`${API_BASE}/api/notificaciones/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    todas = todas.filter(n => n.id !== id);
    actualizarUI();
  } catch {
    mostrarAlerta('danger', 'Error', 'No se pudo eliminar la notificación');
    if (el) {
      el.style.opacity = '1'; el.style.transform = 'none';
      el.style.maxHeight = ''; el.style.paddingTop = ''; el.style.paddingBottom = '';
    }
  }
}

// ── Acciones masivas ──────────────────────────────────────────────────────────
async function marcarTodasLeidas() {
  const token = localStorage.getItem('token');
  const btn   = document.getElementById('btnMarcarTodas');
  btn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/notificaciones/leer-todas`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    todas.forEach(n => n.leido = true);
    actualizarUI();
    mostrarAlerta('success', 'Listo', 'Todas las notificaciones marcadas como leídas');
  } catch {
    mostrarAlerta('danger', 'Error', 'No se pudieron marcar como leídas');
  } finally {
    btn.disabled = false;
  }
}

function confirmarEliminarTodas() {
  document.getElementById('confirmTitle').textContent = 'Eliminar todas las notificaciones';
  document.getElementById('confirmMsg').textContent   = 'Se eliminarán todas las notificaciones. Esta acción no se puede deshacer.';
  document.getElementById('confirmOverlay').classList.add('active');
}

function cerrarConfirm() {
  document.getElementById('confirmOverlay').classList.remove('active');
}

async function ejecutarEliminarTodas() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/notificaciones/eliminar-todas`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    todas = [];
    actualizarUI();
    mostrarAlerta('success', 'Listo', 'Todas las notificaciones eliminadas');
  } catch {
    mostrarAlerta('danger', 'Error', 'No se pudieron eliminar las notificaciones');
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function mostrarSkeleton() {
  document.getElementById('notiList').innerHTML = [1,2,3,4].map(() => `
    <li class="skeleton-item">
      <div class="sk sk-circle"></div>
      <div class="sk-lines">
        <div class="sk sk-long"></div>
        <div class="sk sk-short"></div>
      </div>
    </li>
  `).join('');
}