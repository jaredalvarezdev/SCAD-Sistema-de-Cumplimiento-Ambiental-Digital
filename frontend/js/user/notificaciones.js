const API_BASE = 'http://localhost:3000';
let todas = [];

function clasificar(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('aprobado') || m.includes('aprobada') || m.includes('aceptada')) return 'aprobado';
  if (m.includes('rechazado') || m.includes('rechazada')) return 'rechazado';
  return 'info';
}

function getIcono(tipo) {
  return { aprobado:'check_circle', rechazado:'cancel', info:'notifications' }[tipo] || 'notifications';
}

function formatFecha(f) {
  if (!f) return '—';
  const diff = Math.floor((Date.now() - new Date(f)) / 1000);
  if (diff < 60)     return 'Hace unos segundos';
  if (diff < 3600)   return `Hace ${Math.floor(diff/60)} min`;
  if (diff < 86400)  return `Hace ${Math.floor(diff/3600)} h`;
  if (diff < 172800) return 'Ayer';
  return new Date(f).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
}

document.addEventListener('DOMContentLoaded', async () => {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!token || !usuario || usuario.rol_id !== 3) { window.location.href = '/login'; return; }

  document.getElementById('nombreUsuario').textContent = usuario.nombre || usuario.email;
  document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = '/login'; });

  try {
    const r = await fetch(`${API_BASE}/api/empresas/${usuario.empresa_id}`, { headers:{ Authorization:`Bearer ${token}` } });
    if (r.ok) { const e = await r.json(); document.getElementById('nombreEmpresa').textContent = e.nombre || ''; }
  } catch(e) {}

  document.getElementById('confirmOkBtn').addEventListener('click', () => { cerrarConfirm(); ejecutarEliminarTodas(); });
  document.getElementById('confirmOverlay').addEventListener('click', e => { if(e.target===e.currentTarget) cerrarConfirm(); });

  await cargarNotificaciones(token);
});

async function cargarNotificaciones(token) {
  try {
    const res = await fetch(`${API_BASE}/api/notificaciones`, { headers:{ Authorization:`Bearer ${token}` } });
    if (!res.ok) throw new Error();
    todas = await res.json();
    renderUI();
  } catch {
    document.getElementById('listaNoti').innerHTML = '<p style="text-align:center;padding:40px;color:#dc2626;">Error al cargar notificaciones</p>';
  }
}

function renderUI() {
  const total    = todas.length;
  const noLeidas = todas.filter(n => !n.leido).length;

  document.getElementById('statTotal').textContent    = total;
  document.getElementById('statNoLeidas').textContent = noLeidas;

  const badge = document.getElementById('notiCount');
  if (badge) { badge.textContent = noLeidas; badge.style.display = noLeidas > 0 ? 'inline-block' : 'none'; }

  document.getElementById('btnMarcarTodas').style.display   = noLeidas > 0 ? 'inline-flex' : 'none';
  document.getElementById('btnEliminarTodas').style.display = total    > 0 ? 'inline-flex' : 'none';

  if (!todas.length) {
    document.getElementById('listaNoti').innerHTML = `
      <div style="text-align:center;padding:60px;color:#94a3b8;">
        <span class="material-icons-outlined" style="font-size:48px;display:block;opacity:.3;margin-bottom:12px;">notifications_off</span>
        <p>Sin notificaciones</p>
      </div>`;
    return;
  }

  document.getElementById('listaNoti').innerHTML = todas.map((n, i) => {
    const tipo    = clasificar(n.mensaje);
    const icono   = getIcono(tipo);
    const noLeida = !n.leido;
    const msg     = n.mensaje.replace(/[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{26FF}]/gu, '').trim();
    return `
      <div class="noti-card ${noLeida ? 'no-leida' : ''}" id="noti-${n.id}" style="animation:fadeIn .3s ${i*.04}s ease both;">
        <div class="noti-icon-wrap ${tipo}"><span class="material-icons-outlined">${icono}</span></div>
        <div class="noti-body">
          <p class="noti-msg">${msg}</p>
          <div class="noti-meta">
            <span class="material-icons-outlined" style="font-size:12px;">schedule</span>
            ${formatFecha(n.fecha)}
          </div>
        </div>
        ${noLeida ? '<div class="unread-dot"></div>' : ''}
        <div style="display:flex;gap:6px;flex-shrink:0;">
          ${noLeida ? `<button class="noti-btn read" onclick="marcarLeida(${n.id})"><span class="material-icons-outlined" style="font-size:14px;">mark_email_read</span></button>` : ''}
          <button class="noti-btn del" onclick="eliminarNoti(${n.id})"><span class="material-icons-outlined" style="font-size:14px;">delete</span></button>
        </div>
      </div>`;
  }).join('');
}

async function marcarLeida(id) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/notificaciones/${id}/leida`, { method:'PATCH', headers:{ Authorization:`Bearer ${token}` } });
    if (!res.ok) throw new Error();
    const idx = todas.findIndex(n => n.id === id);
    if (idx !== -1) todas[idx].leido = true;
    renderUI();
  } catch { mostrarAlerta('danger', 'Error', 'No se pudo marcar como leída'); }
}

async function eliminarNoti(id) {
  const token = localStorage.getItem('token');
  const el    = document.getElementById(`noti-${id}`);
  if (el) { el.style.transition='opacity .2s'; el.style.opacity='0'; await new Promise(r=>setTimeout(r,220)); }
  try {
    const res = await fetch(`${API_BASE}/api/notificaciones/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
    if (!res.ok) throw new Error();
    todas = todas.filter(n => n.id !== id);
    renderUI();
  } catch { mostrarAlerta('danger', 'Error', 'No se pudo eliminar'); if(el){el.style.opacity='1';} }
}

async function marcarTodasLeidas() {
  const token = localStorage.getItem('token');
  const btn = document.getElementById('btnMarcarTodas');
  btn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/notificaciones/leer-todas`, { method:'PATCH', headers:{ Authorization:`Bearer ${token}` } });
    if (!res.ok) throw new Error();
    todas.forEach(n => n.leido = true);
    renderUI();
    mostrarAlerta('success', 'Listo', 'Todas marcadas como leídas');
  } catch { mostrarAlerta('danger', 'Error', 'No se pudieron marcar'); }
  finally { btn.disabled = false; }
}

function confirmarEliminarTodas() {
  document.getElementById('confirmTitle').textContent = 'Eliminar todas';
  document.getElementById('confirmMsg').textContent   = 'Se eliminarán todas las notificaciones. No se puede deshacer.';
  document.getElementById('confirmOverlay').style.display = 'flex';
}
function cerrarConfirm() { document.getElementById('confirmOverlay').style.display = 'none'; }

async function ejecutarEliminarTodas() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/notificaciones/eliminar-todas`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
    if (!res.ok) throw new Error();
    todas = []; renderUI();
    mostrarAlerta('success', 'Listo', 'Notificaciones eliminadas');
  } catch { mostrarAlerta('danger', 'Error', 'No se pudieron eliminar'); }
}

function mostrarAlerta(tipo, titulo, mensaje) {
  const cfg = { success:{bg:'#1B6B4F',color:'#fff',icono:'check_circle'}, danger:{bg:'#fff',color:'#dc2626',icono:'error',border:'#fca5a5'} }[tipo] || {bg:'#fff',color:'#2563eb',icono:'info',border:'#93c5fd'};
  const d = document.createElement('div');
  d.style.cssText = `background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border||cfg.bg};padding:13px 16px;border-radius:10px;display:flex;align-items:flex-start;gap:10px;min-width:270px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,.1);font-family:'Inter',sans-serif;font-size:13px;`;
  d.innerHTML = `<span class="material-icons-outlined" style="font-size:18px;flex-shrink:0;">${cfg.icono}</span><div style="flex:1;"><div style="font-weight:600;">${titulo}</div>${mensaje?`<div style="opacity:.85;">${mensaje}</div>`:''}</div>`;
  document.getElementById('alertContainer').appendChild(d);
  setTimeout(() => { d.style.opacity='0'; d.style.transition='opacity .3s'; setTimeout(()=>d.remove(),300); }, 3500);
}