const API_BASE = 'http://localhost:3000';

let reportesData    = [];
let filtroEstado    = '';
let filtroBusqueda  = '';
let reporteActual   = null;

const estadosConfig = {
  1: { label: 'Pendiente',   clase: 'estado-pendiente' },
  2: { label: 'En revisión', clase: 'estado-revision'  },
  3: { label: 'Aprobado',    clase: 'estado-aprobado'  },
  4: { label: 'Rechazado',   clase: 'estado-rechazado' }
};

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!token || !usuario) { window.location.href = '/login.html'; return; }

  document.getElementById('nombreUsuario').textContent = usuario.nombre;

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login.html';
  });

  document.getElementById('inputBusqueda').addEventListener('input', e => {
    filtroBusqueda = e.target.value;
    aplicarFiltros();
  });

  await cargarReportes();
});

// ── Alertas ───────────────────────────────────────────────────────────────────

function mostrarAlerta(tipo, titulo, mensaje, duracion = 4000) {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  const cfg = {
    success: { bg:'#1B6B4F',                  text:'#fff',    border:'#165844'              },
    danger:  { bg:'rgba(220,38,38,0.08)',      text:'#DC2626', border:'rgba(220,38,38,0.2)' },
    warning: { bg:'rgba(245,158,11,0.08)',     text:'#D97706', border:'rgba(245,158,11,0.2)'},
    info:    { bg:'rgba(37,99,235,0.08)',      text:'#2563EB', border:'rgba(37,99,235,0.2)' }
  }[tipo] || { bg:'#fff', text:'#374151', border:'#e5e7eb' };

  const d = document.createElement('div');
  d.style.cssText = `background:${cfg.bg};color:${cfg.text};border:1px solid ${cfg.border};padding:14px 16px;border-radius:8px;display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;animation:slideInRight 0.3s ease-out;min-width:280px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,0.1);`;
  d.innerHTML = `
    <div style="flex:1;">
      <div style="font-weight:700;font-size:13px;">${titulo}</div>
      <div style="font-size:13px;margin-top:2px;opacity:0.9;">${mensaje}</div>
    </div>
    <span onclick="this.parentElement.remove()" style="cursor:pointer;opacity:0.5;font-size:18px;line-height:1;flex-shrink:0;">×</span>
  `;
  container.appendChild(d);
  setTimeout(() => { d.style.opacity='0'; d.style.transition='opacity 0.3s'; setTimeout(()=>d.remove(),300); }, duracion);
}

// ── Cargar reportes pendientes y rechazados ───────────────────────────────────

async function cargarReportes() {
  const token = localStorage.getItem('token');
  const grid  = document.getElementById('reportesGrid');
  grid.innerHTML = `<div class="empty-state"><span class="material-icons-outlined">hourglass_empty</span><p>Cargando...</p></div>`;

  try {
    // Cargar pendientes (1) y rechazados (4) en paralelo
    const [resPendientes, resRechazados] = await Promise.all([
      fetch(`${API_BASE}/api/reportes?estado_id=1&limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/reportes?estado_id=4&limit=500`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const jsonPend = await resPendientes.json();
    const jsonRech = await resRechazados.json();

    reportesData = [
      ...(jsonPend.data || []),
      ...(jsonRech.data || [])
    ].sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    actualizarContadores();
    aplicarFiltros();

  } catch {
    grid.innerHTML = `<div class="empty-state"><span class="material-icons-outlined">error_outline</span><p>Error al cargar los reportes</p></div>`;
    mostrarAlerta('danger', 'Error', 'No se pudieron cargar los reportes');
  }
}

// ── Contadores ────────────────────────────────────────────────────────────────

function actualizarContadores() {
  document.getElementById('cnt-todos').textContent = reportesData.length;
  document.getElementById('cnt-1').textContent     = reportesData.filter(r => r.estado_id === 1).length;
  document.getElementById('cnt-4').textContent     = reportesData.filter(r => r.estado_id === 4).length;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function cambiarTab(btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtroEstado = btn.dataset.estado;
  aplicarFiltros();
}

// ── Filtros ───────────────────────────────────────────────────────────────────

function aplicarFiltros() {
  let lista = reportesData;

  if (filtroEstado) lista = lista.filter(r => r.estado_id == filtroEstado);

  if (filtroBusqueda.trim()) {
    const q = filtroBusqueda.toLowerCase();
    lista = lista.filter(r =>
      (r.titulo && r.titulo.toLowerCase().includes(q)) ||
      (r.empresas?.nombre && r.empresas.nombre.toLowerCase().includes(q))
    );
  }

  renderizarGrid(lista);
}

// ── Renderizar cards ──────────────────────────────────────────────────────────

function renderizarGrid(reportes) {
  const grid = document.getElementById('reportesGrid');

  if (!reportes.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-outlined">check_circle</span>
        <p>No hay reportes pendientes de revisión</p>
      </div>`;
    return;
  }

  grid.innerHTML = reportes.map(r => {
    const cfg       = estadosConfig[r.estado_id] || estadosConfig[1];
    const fecha     = r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString('es-MX') : '—';
    const conf      = r.confianza_ia != null ? Math.round(r.confianza_ia) : null;
    const confText  = conf != null ? `${conf}%` : '—';
    const confColor = conf == null ? '#9ca3af' : conf >= 70 ? '#1B6B4F' : conf >= 40 ? '#F59E0B' : '#DC2626';
    const empresa   = r.empresas?.nombre || '—';
    const cardClass = r.estado_id === 4 ? 'reporte-card rechazado-card' : 'reporte-card urgente';

    return `
      <div class="${cardClass}" onclick="abrirDetalle(${r.id})">
        <div class="card-header">
          <div>
            <div class="card-id">Reporte #${r.id}</div>
            <div class="card-titulo">${r.titulo || 'Sin título'}</div>
            <div class="card-empresa">
              <span class="material-icons-outlined" style="font-size:14px;">business</span>
              ${empresa}
            </div>
          </div>
          <span class="badge-estado ${cfg.clase}">${cfg.label}</span>
        </div>

        <div class="card-meta">
          <div class="card-fecha">
            <span class="material-icons-outlined" style="font-size:13px;vertical-align:middle;">calendar_today</span>
            ${fecha}
          </div>
          <div class="card-confianza" style="color:${confColor};">
            IA: ${confText}
          </div>
        </div>

        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="btn-aprobar" onclick="confirmarAccion(${r.id}, 3)">
            <span class="material-icons-outlined" style="font-size:16px;">check_circle</span>
            Aprobar
          </button>
          <button class="btn-rechazar" onclick="confirmarAccion(${r.id}, 4)">
            <span class="material-icons-outlined" style="font-size:16px;">cancel</span>
            Rechazar
          </button>
          <button class="btn-ver-detalle" onclick="abrirDetalle(${r.id})" title="Ver detalle">
            <span class="material-icons-outlined" style="font-size:18px;">visibility</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Modal detalle + observaciones ────────────────────────────────────────────

async function abrirDetalle(reporteId) {
  const token = localStorage.getItem('token');
  const modal = document.getElementById('modalDetalle');
  const body  = document.getElementById('modalBody');

  reporteActual = reporteId;
  body.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;">Cargando...</div>`;
  modal.classList.add('active');

  try {
    // Cargar reporte + auditorías en paralelo
    const [resR, resA] = await Promise.all([
      fetch(`${API_BASE}/api/reportes/${reporteId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/auditorias/reporte/${reporteId}`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const r          = await resR.json();
    const auditorias = resA.ok ? await resA.json() : [];

    const cfg       = estadosConfig[r.estado_id] || estadosConfig[1];
    const fecha     = r.fecha_creacion
      ? new Date(r.fecha_creacion).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' })
      : '—';
    const conf      = r.confianza_ia != null ? Math.round(r.confianza_ia) : null;
    const confText  = conf != null ? `${conf}%` : '—';
    const confColor = conf == null ? '#9ca3af' : conf >= 70 ? '#1B6B4F' : conf >= 40 ? '#F59E0B' : '#DC2626';

    // Observaciones previas
    const obsHTML = auditorias.length
      ? auditorias.map(a => `
          <div class="obs-item" id="obs-${a.id}">
            <div class="obs-item-header">
              <span class="obs-item-autor">
                <span class="material-icons-outlined" style="font-size:13px;vertical-align:middle;">admin_panel_settings</span>
                ${a.usuarios?.nombre || 'Admin'}
              </span>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="obs-item-fecha">${new Date(a.fecha).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                <button class="obs-item-delete" onclick="eliminarObservacion(${a.id})" title="Eliminar">
                  <span class="material-icons-outlined" style="font-size:16px;">delete</span>
                </button>
              </div>
            </div>
            <div class="obs-item-texto">${a.observaciones || '—'}</div>
          </div>
        `).join('')
      : `<p style="color:#9ca3af;font-size:13px;padding:8px 0;">Sin observaciones aún</p>`;

    body.innerHTML = `
      <div class="detalle-field"><label>Título</label><p>${r.titulo || '—'}</p></div>

      <div style="display:flex;gap:20px;margin-bottom:16px;">
        <div class="detalle-field" style="flex:1;"><label>Empresa</label><p>${r.empresas?.nombre || '—'}</p></div>
        <div class="detalle-field" style="flex:1;"><label>Usuario</label><p>${r.usuarios?.nombre || '—'}</p></div>
      </div>

      <div style="display:flex;gap:20px;margin-bottom:16px;">
        <div class="detalle-field" style="flex:1;"><label>Fecha</label><p>${fecha}</p></div>
        <div class="detalle-field" style="flex:1;">
          <label>Estado</label>
          <span class="badge-estado ${cfg.clase}" style="display:inline-block;margin-top:2px;">${cfg.label}</span>
        </div>
      </div>

      <div style="display:flex;gap:20px;margin-bottom:16px;">
        <div class="detalle-field" style="flex:1;">
          <label>Confianza IA</label>
          <p style="font-weight:700;font-size:18px;color:${confColor};">${confText}</p>
        </div>
        <div class="detalle-field" style="flex:1;">
          <label>Validación IA</label>
          <p>${r.validacion_ia || 'Sin análisis'}</p>
        </div>
      </div>

      <div class="detalle-field">
        <label>Descripción</label>
        <p style="white-space:pre-wrap;">${r.descripcion || '—'}</p>
      </div>

      <!-- Observaciones -->
      <div class="obs-section">
        <div class="obs-section-title">Observaciones del admin</div>
        <div id="listaObservaciones">${obsHTML}</div>

        <div class="nueva-obs">
          <textarea id="nuevaObsTexto" placeholder="Escribe una observación sobre este reporte..." rows="3"></textarea>
          <button class="btn-guardar-obs" id="btnGuardarObs" onclick="guardarObservacion()">
            <span class="material-icons-outlined" style="font-size:16px;">save</span>
            Guardar observación
          </button>
        </div>
      </div>

      <!-- Acciones -->
      <div class="modal-acciones">
        <button class="btn-aprobar" style="flex:1;" onclick="confirmarAccion(${r.id}, 3)">
          <span class="material-icons-outlined" style="font-size:16px;">check_circle</span>
          Aprobar reporte
        </button>
        <button class="btn-rechazar" style="flex:1;" onclick="confirmarAccion(${r.id}, 4)">
          <span class="material-icons-outlined" style="font-size:16px;">cancel</span>
          Rechazar reporte
        </button>
        <button class="modal-footer-close" onclick="cerrarModal()">Cerrar</button>
      </div>
    `;

  } catch {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#DC2626;">Error al cargar el reporte</div>`;
    mostrarAlerta('danger', 'Error', 'No se pudo cargar el detalle');
  }
}

function cerrarModal() {
  document.getElementById('modalDetalle').classList.remove('active');
  reporteActual = null;
}

// ── Guardar observación ───────────────────────────────────────────────────────

async function guardarObservacion() {
  if (!reporteActual) return;
  const token = localStorage.getItem('token');
  const texto = document.getElementById('nuevaObsTexto').value.trim();

  if (!texto) { mostrarAlerta('warning', 'Atención', 'Escribe una observación antes de guardar'); return; }

  const btn = document.getElementById('btnGuardarObs');
  btn.innerHTML = `<span class="spinner"></span> Guardando...`;
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/auditorias`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reporte_id: reporteActual, observaciones: texto })
    });
    const data = await res.json();

    if (res.ok) {
      mostrarAlerta('success', 'Guardado', 'Observación registrada correctamente');
      document.getElementById('nuevaObsTexto').value = '';
      // Recargar observaciones en el modal
      await recargarObservaciones(reporteActual);
    } else {
      mostrarAlerta('danger', 'Error', data.mensaje || 'No se pudo guardar');
    }
  } catch {
    mostrarAlerta('danger', 'Error', 'Error de conexión');
  } finally {
    btn.innerHTML = `<span class="material-icons-outlined" style="font-size:16px;">save</span> Guardar observación`;
    btn.disabled = false;
  }
}

async function recargarObservaciones(reporteId) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/auditorias/reporte/${reporteId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const auditorias = await res.json();
    const lista = document.getElementById('listaObservaciones');
    if (!lista) return;

    lista.innerHTML = auditorias.length
      ? auditorias.map(a => `
          <div class="obs-item" id="obs-${a.id}">
            <div class="obs-item-header">
              <span class="obs-item-autor">
                <span class="material-icons-outlined" style="font-size:13px;vertical-align:middle;">admin_panel_settings</span>
                ${a.usuarios?.nombre || 'Admin'}
              </span>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="obs-item-fecha">${new Date(a.fecha).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                <button class="obs-item-delete" onclick="eliminarObservacion(${a.id})" title="Eliminar">
                  <span class="material-icons-outlined" style="font-size:16px;">delete</span>
                </button>
              </div>
            </div>
            <div class="obs-item-texto">${a.observaciones || '—'}</div>
          </div>
        `).join('')
      : `<p style="color:#9ca3af;font-size:13px;padding:8px 0;">Sin observaciones aún</p>`;
  } catch { /* silencioso */ }
}

// ── Eliminar observación ──────────────────────────────────────────────────────

async function eliminarObservacion(id) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/auditorias/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      document.getElementById(`obs-${id}`)?.remove();
      mostrarAlerta('success', 'Eliminado', 'Observación eliminada');
      // Si no quedan más, mostrar mensaje vacío
      const lista = document.getElementById('listaObservaciones');
      if (lista && !lista.querySelector('.obs-item')) {
        lista.innerHTML = `<p style="color:#9ca3af;font-size:13px;padding:8px 0;">Sin observaciones aún</p>`;
      }
    } else {
      mostrarAlerta('danger', 'Error', 'No se pudo eliminar');
    }
  } catch {
    mostrarAlerta('danger', 'Error', 'Error de conexión');
  }
}

// ── Confirmar aprobar/rechazar ────────────────────────────────────────────────

function confirmarAccion(reporteId, nuevoEstado) {
  const esAprobar = nuevoEstado === 3;
  document.getElementById('confirmarTitulo').textContent  = esAprobar ? 'Aprobar reporte' : 'Rechazar reporte';
  document.getElementById('confirmarMensaje').textContent = esAprobar
    ? '¿Confirmas que este reporte cumple con los requisitos ambientales y deseas aprobarlo?'
    : '¿Confirmas que este reporte no cumple con los requisitos y deseas rechazarlo?';

  const btn = document.getElementById('btnConfirmarAccion');
  btn.style.background = esAprobar ? '#1B6B4F' : '#DC2626';
  btn.textContent = esAprobar ? 'Aprobar' : 'Rechazar';
  btn.onclick = () => cambiarEstado(reporteId, nuevoEstado);

  document.getElementById('modalConfirmar').classList.add('active');
}

function cerrarConfirmar() {
  document.getElementById('modalConfirmar').classList.remove('active');
}

async function cambiarEstado(reporteId, nuevoEstado) {
  const token = localStorage.getItem('token');
  cerrarConfirmar();

  try {
    const res = await fetch(`${API_BASE}/api/reportes/${reporteId}/estado`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado_id: nuevoEstado })
    });

    if (res.ok) {
      const msg = nuevoEstado === 3 ? 'Reporte aprobado correctamente' : 'Reporte rechazado';
      const tipo = nuevoEstado === 3 ? 'success' : 'danger';
      mostrarAlerta(tipo, nuevoEstado === 3 ? 'Aprobado' : 'Rechazado', msg);

      cerrarModal();
      // Quitar el reporte de la lista local si ya no aplica
      reportesData = reportesData.filter(r => r.id !== reporteId);
      actualizarContadores();
      aplicarFiltros();
    } else {
      const err = await res.json();
      mostrarAlerta('danger', 'Error', err.mensaje || 'No se pudo cambiar el estado');
    }
  } catch {
    mostrarAlerta('danger', 'Error', 'Error de conexión');
  }
}