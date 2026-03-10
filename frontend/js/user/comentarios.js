const API_BASE = 'http://localhost:3000';
let reportesMap = {}; // id -> titulo

document.addEventListener('DOMContentLoaded', async () => {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!token || !usuario || usuario.rol_id !== 3) { window.location.href = '/login'; return; }
  if (!usuario.empresa_id) { window.location.href = '/seleccion-empresa'; return; }

  document.getElementById('nombreUsuario').textContent = usuario.nombre || usuario.email;
  document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = '/login'; });

  try {
    const r = await fetch(`${API_BASE}/api/empresas/${usuario.empresa_id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const e = await r.json(); document.getElementById('nombreEmpresa').textContent = e.nombre || ''; }
  } catch(e) {}

  cargarBadgeNoti(token);

  // Cargar reportes para mapear id->titulo
  try {
    const r = await fetch(`${API_BASE}/api/reportes?empresa_id=${usuario.empresa_id}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.ok) {
      const json = await r.json();
      const lista = Array.isArray(json) ? json : (json.data || []);
      lista.forEach(rep => { reportesMap[rep.id] = rep.titulo || `Reporte #${rep.id}`; });
    }
  } catch(e) {}

  await cargarComentarios(token, usuario.empresa_id, usuario.id);
});

async function cargarComentarios(token, empresaId, usuarioId) {
  // Traer todos los reportes de la empresa y luego los comentarios del usuario
  try {
    const r = await fetch(`${API_BASE}/api/reportes?empresa_id=${empresaId}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) throw new Error();
    const json = await r.json();
    const reportes = Array.isArray(json) ? json : (json.data || []);

    // Obtener comentarios de cada reporte y filtrar los del usuario actual
    const promesas = reportes.map(rep =>
      fetch(`${API_BASE}/api/comentarios/${rep.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r2 => r2.ok ? r2.json() : [])
        .then(comentarios => comentarios
          .filter(c => c.usuario_id === usuarioId)
          .map(c => ({ ...c, reporte_titulo: reportesMap[rep.id] || `Reporte #${rep.id}`, reporte_id: rep.id }))
        )
        .catch(() => [])
    );

    const resultados = await Promise.all(promesas);
    const todos = resultados.flat().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    renderComentarios(todos);

  } catch {
    document.getElementById('listaComentarios').innerHTML = `
      <div style="text-align:center;padding:40px;color:#dc2626;">Error al cargar comentarios</div>`;
  }
}

function renderComentarios(lista) {
  if (!lista.length) {
    document.getElementById('listaComentarios').innerHTML = `
      <div class="empty-state">
        <span class="material-icons-outlined">comment</span>
        <p>Aún no has dejado ningún comentario.</p>
        <p style="font-size:12px;">Ve a <a href="/pages/usuario/reportes.html" style="color:#1B6B4F;">Reportes</a> para comentar.</p>
      </div>`;
    return;
  }

  document.getElementById('listaComentarios').innerHTML = lista.map(c => {
    const fecha = c.fecha ? new Date(c.fecha).toLocaleString('es-MX') : '—';
    return `
      <div class="comment-card" id="cc-${c.id}">
        <div class="comment-reporte">
          <span class="material-icons-outlined" style="font-size:13px;">description</span>
          ${c.reporte_titulo}
        </div>
        <div class="comment-msg" id="msg-${c.id}">${c.mensaje}</div>
        <div id="edit-area-${c.id}" style="display:none;">
          <textarea class="edit-area" id="edit-input-${c.id}" rows="3">${c.mensaje}</textarea>
          <button class="btn-save" onclick="guardarEdicion(${c.id})">Guardar</button>
          <button class="btn-cancel-edit" onclick="cancelarEdicion(${c.id}, \`${c.mensaje.replace(/`/g,"'")}\`)">Cancelar</button>
        </div>
        <div class="comment-footer">
          <span class="comment-fecha">
            <span class="material-icons-outlined" style="font-size:12px;">schedule</span>${fecha}
          </span>
          <div class="comment-actions" id="actions-${c.id}">
            <button class="btn-action edit" onclick="iniciarEdicion(${c.id})">
              <span class="material-icons-outlined" style="font-size:13px;">edit</span> Editar
            </button>
            <button class="btn-action del" onclick="eliminarComentario(${c.id})">
              <span class="material-icons-outlined" style="font-size:13px;">delete</span> Eliminar
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function iniciarEdicion(id) {
  document.getElementById(`msg-${id}`).style.display       = 'none';
  document.getElementById(`edit-area-${id}`).style.display = 'block';
  document.getElementById(`actions-${id}`).style.display   = 'none';
}

function cancelarEdicion(id, original) {
  document.getElementById(`edit-input-${id}`).value        = original;
  document.getElementById(`msg-${id}`).style.display       = 'block';
  document.getElementById(`edit-area-${id}`).style.display = 'none';
  document.getElementById(`actions-${id}`).style.display   = 'flex';
}

async function guardarEdicion(id) {
  const token   = localStorage.getItem('token');
  const mensaje = document.getElementById(`edit-input-${id}`).value.trim();
  if (!mensaje) return;

  try {
    const res = await fetch(`${API_BASE}/api/comentarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ mensaje })
    });
    if (!res.ok) throw new Error();

    document.getElementById(`msg-${id}`).textContent        = mensaje;
    document.getElementById(`msg-${id}`).style.display       = 'block';
    document.getElementById(`edit-area-${id}`).style.display = 'none';
    document.getElementById(`actions-${id}`).style.display   = 'flex';
    mostrarAlerta('success', 'Comentario actualizado', '');
  } catch {
    mostrarAlerta('danger', 'Error', 'No se pudo actualizar el comentario');
  }
}

async function eliminarComentario(id) {
  const token = localStorage.getItem('token');
  const card  = document.getElementById(`cc-${id}`);

  if (card) {
    card.style.transition = 'opacity .2s, max-height .25s';
    card.style.opacity    = '0';
    await new Promise(r => setTimeout(r, 220));
    card.remove();
  }

  try {
    const res = await fetch(`${API_BASE}/api/comentarios/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    mostrarAlerta('success', 'Comentario eliminado', '');
  } catch {
    mostrarAlerta('danger', 'Error', 'No se pudo eliminar');
  }
}

async function cargarBadgeNoti(token) {
  try {
    const r = await fetch(`${API_BASE}/api/notificaciones`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return;
    const n = await r.json();
    const nl = n.filter(x => !x.leido).length;
    const badge = document.getElementById('notiCount');
    if (badge) { badge.textContent = nl; badge.style.display = nl > 0 ? 'inline-block' : 'none'; }
  } catch(e) {}
}

function mostrarAlerta(tipo, titulo, mensaje) {
  const cfg = { success:{bg:'#1B6B4F',color:'#fff',icono:'check_circle'}, danger:{bg:'#fff',color:'#dc2626',icono:'error',border:'#fca5a5'} }[tipo] || {bg:'#fff',color:'#2563eb',icono:'info',border:'#93c5fd'};
  const d = document.createElement('div');
  d.style.cssText = `background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border||cfg.bg};padding:13px 16px;border-radius:10px;display:flex;align-items:flex-start;gap:10px;min-width:270px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,.1);font-family:'Inter',sans-serif;font-size:13px;`;
  d.innerHTML = `<span class="material-icons-outlined" style="font-size:18px;flex-shrink:0;">${cfg.icono}</span><div style="flex:1;"><div style="font-weight:600;">${titulo}</div>${mensaje?`<div style="opacity:.85;">${mensaje}</div>`:''}</div>`;
  document.getElementById('alertContainer').appendChild(d);
  setTimeout(() => { d.style.opacity='0'; d.style.transition='opacity .3s'; setTimeout(()=>d.remove(),300); }, 3500);
}