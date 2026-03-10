const API_BASE = 'http://localhost:3000';
let todosReportes = [];
let filtroActual  = 'todos';
let reporteActual = null;

const estadoMap = {
  1: { label: 'Pendiente',   clase: 'pendiente' },
  2: { label: 'En revisión', clase: 'revision'  },
  3: { label: 'Aprobado',    clase: 'aprobado'  },
  4: { label: 'Rechazado',   clase: 'rechazado' },
};

document.addEventListener('DOMContentLoaded', async () => {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  if (!token || !usuario || usuario.rol_id !== 3) { window.location.href = '/login'; return; }
  if (!usuario.empresa_id) { window.location.href = '/seleccion-empresa'; return; }

  document.getElementById('nombreUsuario').textContent = usuario.nombre || usuario.email;
  document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = '/login'; });

  // Nombre empresa
  try {
    const r = await fetch(`${API_BASE}/api/empresas/${usuario.empresa_id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const e = await r.json(); document.getElementById('nombreEmpresa').textContent = e.nombre || ''; }
  } catch(e) {}

  // Badge notificaciones
  cargarBadgeNoti(token);

  // Buscar en tiempo real
  document.getElementById('buscarInput').addEventListener('input', renderTabla);

  await cargarReportes(token, usuario.empresa_id);
});

async function cargarReportes(token, empresaId) {
  try {
    const res = await fetch(`${API_BASE}/api/reportes?empresa_id=${empresaId}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    todosReportes = Array.isArray(json) ? json : (json.data || []);
    renderTabla();
  } catch {
    document.getElementById('tablaReportes').innerHTML =
      `<tr><td colspan="6" style="text-align:center;padding:40px;color:#dc2626;">Error al cargar reportes</td></tr>`;
  }
}

function filtrar(tipo, btn) {
  filtroActual = tipo;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTabla();
}

function renderTabla() {
  const buscar = document.getElementById('buscarInput').value.toLowerCase();

  let lista = todosReportes;
  if (filtroActual !== 'todos') {
    lista = lista.filter(r => {
      const e = estadoMap[r.estado_id];
      return e?.clase === filtroActual;
    });
  }
  if (buscar) {
    lista = lista.filter(r => (r.titulo || '').toLowerCase().includes(buscar));
  }

  if (!lista.length) {
    document.getElementById('tablaReportes').innerHTML =
      `<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">No hay reportes</td></tr>`;
    return;
  }

  document.getElementById('tablaReportes').innerHTML = lista.map(r => {
    const est    = estadoMap[r.estado_id] || { label: r.estado_id, clase: 'pendiente' };
    const fecha  = r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString('es-MX') : '—';
    const conf   = r.confianza_ia != null ? `${r.confianza_ia}%` : '—';
    return `
      <tr style="animation:fadeIn .3s ease;">
        <td style="text-align:center;">${r.id}</td>
        <td>${r.titulo || '—'}</td>
        <td style="text-align:center;">${conf}</td>
        <td style="text-align:center;">${fecha}</td>
        <td style="text-align:center;"><span class="badge ${est.clase}">${est.label}</span></td>
        <td style="text-align:center;">
          <button class="btn-ver" onclick="abrirDetalle(${r.id})">
            <span class="material-icons-outlined" style="font-size:13px;">visibility</span> Ver
          </button>
        </td>
      </tr>`;
  }).join('');
}

async function abrirDetalle(id) {
  const token = localStorage.getItem('token');
  reporteActual = id;

  const reporte = todosReportes.find(r => r.id === id);
  if (!reporte) return;

  const est = estadoMap[reporte.estado_id] || { label: '—', clase: 'pendiente' };
  document.getElementById('modalTitulo').textContent      = reporte.titulo || '—';
  document.getElementById('modalDescripcion').textContent = reporte.descripcion || '—';
  document.getElementById('modalConfianza').textContent   = reporte.confianza_ia != null ? `${reporte.confianza_ia}%` : '—';
  document.getElementById('modalEstado').innerHTML        = `<span class="badge ${est.clase}">${est.label}</span>`;

  const iaBox = document.getElementById('modalIA');
  iaBox.textContent  = reporte.validacion_ia || 'Sin análisis';
  iaBox.className    = `ia-box ${est.clase}`;

  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('listaComentarios').innerHTML = '<p style="color:#94a3b8;font-size:13px;">Cargando comentarios...</p>';

  // Cargar comentarios
  try {
    const res = await fetch(`${API_BASE}/api/comentarios/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const comentarios = await res.json();
    renderComentarios(comentarios);
  } catch {
    document.getElementById('listaComentarios').innerHTML = '<p style="color:#dc2626;font-size:13px;">Error al cargar comentarios</p>';
  }
}

function renderComentarios(lista) {
  if (!lista.length) {
    document.getElementById('listaComentarios').innerHTML =
      '<p style="color:#94a3b8;font-size:13px;">Sin comentarios aún. Sé el primero.</p>';
    return;
  }
  document.getElementById('listaComentarios').innerHTML = lista.map(c => {
    const fecha = c.fecha ? new Date(c.fecha).toLocaleString('es-MX') : '—';
    return `
      <div class="comment-item">
        <p>${c.mensaje}</p>
        <div class="comment-meta">
          <span class="material-icons-outlined" style="font-size:12px;vertical-align:middle;">schedule</span>
          ${fecha}
        </div>
      </div>`;
  }).join('');
}

async function enviarComentario() {
  const token   = localStorage.getItem('token');
  const mensaje = document.getElementById('nuevoComentario').value.trim();
  if (!mensaje || !reporteActual) return;

  const btn = document.getElementById('btnComentario');
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mensaje, reporte_id: reporteActual })
    });
    if (!res.ok) throw new Error();

    document.getElementById('nuevoComentario').value = '';
    mostrarAlerta('success', 'Comentario enviado', 'Tu comentario fue agregado correctamente');

    // Recargar comentarios
    const r2 = await fetch(`${API_BASE}/api/comentarios/${reporteActual}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r2.ok) renderComentarios(await r2.json());

  } catch {
    mostrarAlerta('danger', 'Error', 'No se pudo enviar el comentario');
  } finally {
    btn.disabled = false;
  }
}

function cerrarModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  reporteActual = null;
}

document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) cerrarModal();
});

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
  const cfg = {
    success: { bg:'#1B6B4F', color:'#fff', icono:'check_circle' },
    danger:  { bg:'#fff', color:'#dc2626', icono:'error', border:'#fca5a5' },
  }[tipo] || { bg:'#fff', color:'#2563eb', icono:'info', border:'#93c5fd' };
  const d = document.createElement('div');
  d.style.cssText = `background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border||cfg.bg};padding:13px 16px;border-radius:10px;display:flex;align-items:flex-start;gap:10px;animation:slideInRight .3s ease-out;min-width:270px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,.1);font-family:'Inter',sans-serif;font-size:13px;`;
  d.innerHTML = `<span class="material-icons-outlined" style="font-size:18px;flex-shrink:0;">${cfg.icono}</span><div style="flex:1;"><div style="font-weight:600;">${titulo}</div><div style="opacity:.85;">${mensaje}</div></div>`;
  document.getElementById('alertContainer').appendChild(d);
  setTimeout(() => { d.style.opacity='0'; d.style.transition='opacity .3s'; setTimeout(()=>d.remove(),300); }, 3500);
}