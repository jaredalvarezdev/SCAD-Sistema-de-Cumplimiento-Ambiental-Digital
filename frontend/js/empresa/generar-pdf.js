const API_BASE = 'http://localhost:3000';

const estadoConfig = {
  1: { label: 'Pendiente',   bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B' },
  2: { label: 'En revisión', bg: 'rgba(37,99,235,0.1)',   color: '#2563EB' },
  3: { label: 'Aprobado',    bg: 'rgba(27,107,79,0.1)',   color: '#1B6B4F' },
  4: { label: 'Rechazado',   bg: 'rgba(220,38,38,0.1)',   color: '#DC2626' }
};

const generando      = new Set();
let reporteResiduoId = null;
let tiposResiduos    = [];
let registrosLocales = [];

// ── Alertas ─────────────────────────────────────────────────────────────────

function mostrarAlerta(tipo, titulo, mensaje, duracion = 4000) {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  const cfg = {
    success: { bg: '#1B6B4F', text: '#fff', border: '#165844', icono: 'check_circle' },
    danger:  { bg: '#fff', text: '#DC2626', border: '#fca5a5', icono: 'error' },
    warning: { bg: '#fff', text: '#D97706', border: '#fcd34d', icono: 'warning' },
    info:    { bg: '#fff', text: '#2563EB', border: '#93c5fd', icono: 'info' }
  }[tipo] || { bg: '#fff', text: '#2563EB', border: '#93c5fd', icono: 'info' };

  const d = document.createElement('div');
  d.style.cssText = `background:${cfg.bg};color:${cfg.text};border:1px solid ${cfg.border};padding:14px 16px;border-radius:10px;display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;animation:slideIn 0.3s ease-out;min-width:280px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,0.12);font-family:'DM Sans',sans-serif;`;
  d.innerHTML = `
    <span class="material-icons-outlined" style="font-size:20px;flex-shrink:0;margin-top:1px;">${cfg.icono}</span>
    <div><div style="font-weight:700;font-size:13px;">${titulo}</div><div style="font-size:13px;margin-top:2px;opacity:0.9;line-height:1.4;">${mensaje}</div></div>
    <span onclick="this.parentElement.remove()" style="margin-left:auto;cursor:pointer;opacity:0.6;font-size:18px;line-height:1;flex-shrink:0;">×</span>
  `;
  container.appendChild(d);
  setTimeout(() => { d.style.opacity='0'; d.style.transition='opacity 0.3s'; setTimeout(()=>d.remove(),300); }, duracion);
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function cambiarTab(tab, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  btn.classList.add('active');
  if (tab === 'historial') cargarHistorial();
  if (tab === 'residuos')  cargarReportesResiduos();
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!token || !usuario) { window.location.href = '/login.html'; return; }

  document.getElementById('nombreUsuario').textContent = usuario.nombre || usuario.email;

  if (usuario.empresa_id) {
    try {
      const res = await fetch(`${API_BASE}/api/empresas/${usuario.empresa_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const e = await res.json();
        document.getElementById('nombreEmpresa').textContent = e.nombre;
      }
    } catch(e) { console.error(e); }
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear(); window.location.href = '/login.html';
  });

  await Promise.all([cargarReportes(), cargarTiposResiduos()]);
});

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — ANÁLISIS CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════════════

async function cargarReportes() {
  const token = localStorage.getItem('token');
  const grid  = document.getElementById('reportesGrid');
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="spinner-dark" style="margin:0 auto 10px;"></div><p>Cargando...</p></div>`;

  try {
    const res = await fetch(`${API_BASE}/api/reportes?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const json     = await res.json();
    const reportes = json.data || [];

    if (!reportes.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><span class="material-icons-outlined">description</span><p>No tienes reportes. Crea uno en <a href="/pages/empresa/mis-reportes.html">Mis Reportes</a>.</p></div>`;
      return;
    }

    grid.innerHTML = reportes.map((r, i) => {
      const cfg   = estadoConfig[r.estado_id] || estadoConfig[1];
      const fecha = r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—';
      const conf  = r.confianza_ia != null ? Math.round(r.confianza_ia) : null;
      const confColor = conf == null ? '#94a3b8' : conf >= 70 ? '#1B6B4F' : conf >= 40 ? '#d97706' : '#dc2626';
      const confVal   = conf != null ? `${conf}%` : '—';

      return `
        <div class="reporte-card" style="animation:fadeUp .3s ${i * 0.05}s ease both;">
          <div class="reporte-card-accent"></div>
          <div class="reporte-card-inner">
            <div class="reporte-card-titulo" title="${r.titulo}">${r.titulo || 'Sin título'}</div>
            <div class="reporte-card-meta">
              <span class="meta-item">
                <span class="material-icons-outlined">calendar_today</span>${fecha}
              </span>
              <span class="badge-estado" style="background:${cfg.bg};color:${cfg.color};">${cfg.label}</span>
            </div>
            <div class="conf-row">
              <span class="conf-label">Confianza IA</span>
              <div class="conf-track">
                <div class="conf-fill" style="width:${conf||0}%;background:${confColor};"></div>
              </div>
              <span class="conf-val" style="color:${confColor};">${confVal}</span>
            </div>
            <button class="btn-generar" id="btn-${r.id}" onclick="generarPDFConsolidado(${r.id}, '${(r.titulo||'').replace(/'/g,"\\'")}')">
              <span class="material-icons-outlined" style="font-size:15px;">picture_as_pdf</span>
              Generar PDF Consolidado
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch(err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;color:#dc2626;"><span class="material-icons-outlined">error</span><p>Error al cargar reportes</p></div>`;
  }
}

async function generarPDFConsolidado(reporteId, titulo) {
  if (generando.has(reporteId)) return;
  const token = localStorage.getItem('token');
  const btn   = document.getElementById(`btn-${reporteId}`);

  generando.add(reporteId);
  btn.classList.add('generando');
  btn.disabled  = true;
  btn.innerHTML = `<span class="spinner"></span> Analizando con IA...`;

  mostrarAlerta('info', 'Procesando', `Generando PDF de "${titulo}". Puede tomar unos segundos...`, 8000);

  try {
    const res  = await fetch(`${API_BASE}/api/reportes-generados/consolidado/${reporteId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) { mostrarAlerta('danger', 'Error', data.error || data.detalle || 'No se pudo generar el PDF'); return; }
    mostrarAlerta('success', '¡PDF generado!', `Reporte consolidado generado con ${data.evidencias_analizadas} evidencia(s).`, 6000);
    if (data.pdf_url) window.open(data.pdf_url, '_blank');
  } catch(err) {
    mostrarAlerta('danger', 'Error', 'Error de conexión al generar el PDF');
  } finally {
    generando.delete(reporteId);
    btn.classList.remove('generando');
    btn.disabled  = false;
    btn.innerHTML = `<span class="material-icons-outlined" style="font-size:15px;">picture_as_pdf</span> Generar PDF Consolidado`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — RESIDUOS SÓLIDOS
// ══════════════════════════════════════════════════════════════════════════════

async function cargarTiposResiduos() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/residuos/tipos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data   = await res.json();
    tiposResiduos = data.tipos || [];

    const select = document.getElementById('tipo_residuo_id');
    if (!select) return;

    const grupos = {};
    tiposResiduos.forEach(t => {
      const cat = t.categoria || 'General';
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(t);
    });

    select.innerHTML = '<option value="">Selecciona el tipo...</option>';
    Object.entries(grupos).forEach(([cat, tipos]) => {
      const group = document.createElement('optgroup');
      group.label = cat;
      tipos.forEach(t => {
        const opt = document.createElement('option');
        opt.value       = t.id;
        opt.textContent = `${t.nombre} (${t.unidad_medida || 'kg'})`;
        opt.dataset.unidad    = t.unidad_medida || 'kg';
        opt.dataset.peligroso = t.peligroso;
        group.appendChild(opt);
      });
      select.appendChild(group);
    });

    select.addEventListener('change', () => {
      const opt = select.options[select.selectedIndex];
      if (opt && opt.dataset.unidad) {
        const unidadSelect = document.getElementById('unidad_medida');
        for (let o of unidadSelect.options) {
          if (o.value === opt.dataset.unidad) { o.selected = true; break; }
        }
      }
    });
  } catch(err) { console.error('[Tipos]', err); }
}

async function cargarReportesResiduos() {
  const token = localStorage.getItem('token');
  const grid  = document.getElementById('reportes-residuos-grid');
  if (!grid) return;
  if (reporteResiduoId) return;

  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="spinner-dark" style="margin:0 auto 10px;"></div><p>Cargando...</p></div>`;

  try {
    const res = await fetch(`${API_BASE}/api/reportes?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const json     = await res.json();
    const reportes = json.data || [];

    if (!reportes.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><span class="material-icons-outlined">description</span><p>No tienes reportes disponibles.</p></div>`;
      return;
    }

    grid.innerHTML = reportes.map((r, i) => {
      const cfg   = estadoConfig[r.estado_id] || estadoConfig[1];
      const fecha = r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—';
      return `
        <div class="reporte-card" style="animation:fadeUp .3s ${i * 0.05}s ease both;">
          <div class="reporte-card-accent"></div>
          <div class="reporte-card-inner">
            <div class="reporte-card-titulo" title="${r.titulo}">${r.titulo || 'Sin título'}</div>
            <div class="reporte-card-meta">
              <span class="meta-item"><span class="material-icons-outlined">calendar_today</span>${fecha}</span>
              <span class="badge-estado" style="background:${cfg.bg};color:${cfg.color};">${cfg.label}</span>
            </div>
            <button class="btn-seleccionar" onclick="seleccionarReporte(${r.id}, '${(r.titulo||'').replace(/'/g,"\\'")}')">
              <span class="material-icons-outlined" style="font-size:15px;">check_circle</span>
              Seleccionar
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch(err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;color:#dc2626;"><span class="material-icons-outlined">error</span><p>Error al cargar reportes</p></div>`;
  }
}

async function seleccionarReporte(id, titulo) {
  reporteResiduoId = id;
  document.getElementById('reportes-residuos-grid').style.display = 'none';
  document.getElementById('reporte-activo-banner').classList.add('visible');
  document.getElementById('reporte-activo-nombre').textContent = titulo;
  document.getElementById('form-residuos').style.display = 'block';
  await cargarPeriodoExistente(id);
  await cargarRegistros(id);
}

function deseleccionarReporte() {
  reporteResiduoId = null;
  registrosLocales = [];
  document.getElementById('reportes-residuos-grid').style.display = 'grid';
  document.getElementById('reporte-activo-banner').classList.remove('visible');
  document.getElementById('form-residuos').style.display = 'none';
  cargarReportesResiduos();
}

async function cargarPeriodoExistente(reporteId) {
  const token = localStorage.getItem('token');
  try {
    const res  = await fetch(`${API_BASE}/api/residuos/periodo/${reporteId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.periodo) {
      const p = data.periodo;
      document.getElementById('periodo_inicio').value      = p.periodo_inicio || '';
      document.getElementById('periodo_fin').value         = p.periodo_fin || '';
      document.getElementById('responsable_nombre').value  = p.responsable_nombre || '';
      document.getElementById('responsable_cargo').value   = p.responsable_cargo || '';
      document.getElementById('num_generador').value       = p.num_generador || '';
      document.getElementById('observaciones_gral').value  = p.observaciones_gral || '';
      document.getElementById('responsable_firma').checked = p.responsable_firma || false;
    }
  } catch(err) { console.error('[Período]', err); }
}

async function guardarPeriodo() {
  if (!reporteResiduoId) { mostrarAlerta('warning', 'Atención', 'Selecciona un reporte primero'); return; }
  const token  = localStorage.getItem('token');
  const inicio = document.getElementById('periodo_inicio').value;
  const fin    = document.getElementById('periodo_fin').value;

  if (!inicio || !fin) { mostrarAlerta('warning', 'Validación', 'El período de inicio y fin son obligatorios'); return; }
  if (inicio > fin)    { mostrarAlerta('warning', 'Validación', 'La fecha de inicio no puede ser mayor al fin'); return; }

  const btn = document.getElementById('btnGuardarPeriodo');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Guardando...`;

  try {
    const res = await fetch(`${API_BASE}/api/residuos/periodo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporte_id: reporteResiduoId,
        periodo_inicio: inicio,
        periodo_fin: fin,
        responsable_nombre: document.getElementById('responsable_nombre').value,
        responsable_cargo:  document.getElementById('responsable_cargo').value,
        num_generador:      document.getElementById('num_generador').value,
        observaciones_gral: document.getElementById('observaciones_gral').value,
        responsable_firma:  document.getElementById('responsable_firma').checked
      })
    });
    const data = await res.json();
    if (!res.ok) { mostrarAlerta('danger', 'Error', data.error || 'Error al guardar el período'); return; }
    mostrarAlerta('success', 'Guardado', 'Período guardado correctamente');
  } catch(err) {
    mostrarAlerta('danger', 'Error', 'Error de conexión');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-icons-outlined" style="font-size:15px;">save</span> Guardar período`;
  }
}

async function agregarRegistro() {
  if (!reporteResiduoId) { mostrarAlerta('warning', 'Atención', 'Selecciona un reporte primero'); return; }
  const token    = localStorage.getItem('token');
  const tipo_id  = document.getElementById('tipo_residuo_id').value;
  const cantidad = document.getElementById('cantidad').value;
  const fecha_gen = document.getElementById('fecha_generacion').value;

  if (!tipo_id)   { mostrarAlerta('warning', 'Validación', 'Selecciona el tipo de residuo'); return; }
  if (!cantidad || parseFloat(cantidad) <= 0) { mostrarAlerta('warning', 'Validación', 'Ingresa una cantidad válida mayor a 0'); return; }
  if (!fecha_gen) { mostrarAlerta('warning', 'Validación', 'Ingresa la fecha de generación'); return; }

  const btn = document.getElementById('btnAgregarRegistro');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Guardando...`;

  try {
    const res = await fetch(`${API_BASE}/api/residuos/registro`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporte_id:            reporteResiduoId,
        tipo_residuo_id:       parseInt(tipo_id),
        cantidad:              parseFloat(cantidad),
        unidad_medida:         document.getElementById('unidad_medida').value,
        metodo_disposicion:    document.getElementById('metodo_disposicion').value,
        empresa_transportista: document.getElementById('empresa_transportista').value,
        destino_final:         document.getElementById('destino_final').value,
        num_manifiesto:        document.getElementById('num_manifiesto').value,
        fecha_generacion:      fecha_gen,
        fecha_disposicion:     document.getElementById('fecha_disposicion').value || null,
        observaciones:         document.getElementById('obs_registro').value
      })
    });
    const data = await res.json();
    if (!res.ok) { mostrarAlerta('danger', 'Error', data.error || 'Error al agregar el residuo'); return; }
    mostrarAlerta('success', 'Agregado', 'Residuo registrado correctamente');
    limpiarFormRegistro();
    await cargarRegistros(reporteResiduoId);
  } catch(err) {
    mostrarAlerta('danger', 'Error', 'Error de conexión');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-icons-outlined" style="font-size:15px;">add</span> Agregar residuo`;
  }
}

function limpiarFormRegistro() {
  ['tipo_residuo_id','cantidad','fecha_generacion','fecha_disposicion',
   'num_manifiesto','empresa_transportista','destino_final','obs_registro'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('metodo_disposicion').value = '';
  document.getElementById('unidad_medida').value = 'kg';
}

async function cargarRegistros(reporteId) {
  const token     = localStorage.getItem('token');
  const container = document.getElementById('tablaRegistrosContainer');
  const totalBox  = document.getElementById('totalBox');

  try {
    const res  = await fetch(`${API_BASE}/api/residuos/registros/${reporteId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    registrosLocales = data.registros || [];

    if (!registrosLocales.length) {
      container.innerHTML = `<div class="empty-state" style="padding:24px;"><span class="material-icons-outlined">inbox</span><p>No hay residuos registrados aún</p></div>`;
      totalBox.style.display = 'none';
      return;
    }

    let total = 0;
    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Tipo de residuo</th>
            <th>Categoría</th>
            <th>Cantidad</th>
            <th>Disposición</th>
            <th>F. Generación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${registrosLocales.map(r => {
            total += parseFloat(r.cantidad);
            const esPeligroso = r.residuos_tipos?.peligroso;
            const bgBadge = esPeligroso
              ? 'background:rgba(220,38,38,0.1);color:#dc2626;'
              : 'background:rgba(27,107,79,0.1);color:#1B6B4F;';
            return `
              <tr>
                <td style="font-weight:600;color:#0a1628;">${r.residuos_tipos?.nombre || '—'}</td>
                <td><span class="badge-peligroso" style="${bgBadge}">${r.residuos_tipos?.categoria || '—'}</span></td>
                <td style="font-weight:700;font-family:'DM Mono',monospace;">${parseFloat(r.cantidad).toLocaleString('es-MX')} ${r.unidad_medida || 'kg'}</td>
                <td>${r.metodo_disposicion || '—'}</td>
                <td style="color:#64748b;">${r.fecha_generacion ? new Date(r.fecha_generacion+'T12:00:00').toLocaleDateString('es-MX') : '—'}</td>
                <td>
                  <button class="btn-danger-sm" onclick="eliminarRegistro(${r.id})">
                    <span class="material-icons-outlined" style="font-size:13px;">delete</span>Eliminar
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    totalBox.style.display = 'flex';
    document.getElementById('totalCantidad').textContent = `${total.toLocaleString('es-MX', {minimumFractionDigits:2})} (${registrosLocales.length} registros)`;
  } catch(err) {
    container.innerHTML = `<div class="empty-state" style="color:#dc2626;"><span class="material-icons-outlined">error</span><p>Error al cargar registros</p></div>`;
  }
}

async function eliminarRegistro(id) {
  if (!confirm('¿Eliminar este registro de residuo?')) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/residuos/registro/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      mostrarAlerta('success', 'Eliminado', 'Registro eliminado correctamente');
      await cargarRegistros(reporteResiduoId);
    } else {
      mostrarAlerta('danger', 'Error', 'No se pudo eliminar el registro');
    }
  } catch(err) {
    mostrarAlerta('danger', 'Error', 'Error de conexión');
  }
}

async function generarPDFResiduos() {
  if (!reporteResiduoId) { mostrarAlerta('warning', 'Atención', 'Selecciona un reporte primero'); return; }
  const token = localStorage.getItem('token');
  const btn   = document.getElementById('btnGenerarResiduos');
  btn.disabled  = true;
  btn.innerHTML = `<span class="spinner"></span> Generando PDF...`;
  mostrarAlerta('info', 'Generando', 'Creando el PDF formal de residuos sólidos...', 8000);

  try {
    const res  = await fetch(`${API_BASE}/api/residuos/generar-pdf/${reporteResiduoId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) { mostrarAlerta('danger', 'Error', data.error || data.detalle || 'No se pudo generar el PDF'); return; }
    mostrarAlerta('success', '¡PDF generado!', `PDF de residuos generado con ${data.total_registros} registro(s).`, 6000);
    if (data.pdf_url) window.open(data.pdf_url, '_blank');
  } catch(err) {
    mostrarAlerta('danger', 'Error', 'Error de conexión al generar el PDF');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<span class="material-icons-outlined">picture_as_pdf</span> Generar PDF de Residuos`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — HISTORIAL
// ══════════════════════════════════════════════════════════════════════════════

async function cargarHistorial() {
  const token     = localStorage.getItem('token');
  const container = document.getElementById('historialContainer');
  container.innerHTML = `<div class="empty-state"><div class="spinner-dark" style="margin:0 auto 10px;"></div><p>Cargando historial...</p></div>`;

  try {
    const res  = await fetch(`${API_BASE}/api/reportes-generados`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const json  = await res.json();
    const lista = json.reportes || [];

    if (!lista.length) {
      container.innerHTML = `<div class="empty-state"><span class="material-icons-outlined">inbox</span><p>Aún no has generado ningún PDF.</p></div>`;
      return;
    }

    container.innerHTML = `
      <table class="historial-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tipo</th>
            <th>Empresa</th>
            <th>Generado por</th>
            <th>Fecha</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(r => {
            const fecha   = r.creado_en ? new Date(r.creado_en).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
            const tipo    = r.tipos_reportes_documentales?.nombre || 'PDF';
            const empresa = r.empresas?.nombre || '—';
            const usuario = r.usuarios?.nombre || '—';
            const esResiduos = tipo.toLowerCase().includes('residuo');

            return `
              <tr>
                <td class="historial-row-num">#${r.id}</td>
                <td>
                  <span class="tipo-chip ${esResiduos ? 'residuos' : 'consolidado'}">
                    <span class="material-icons-outlined">${esResiduos ? 'delete_outline' : 'analytics'}</span>
                    ${tipo}
                  </span>
                </td>
                <td style="font-weight:600;">${empresa}</td>
                <td>${usuario !== '—' ? usuario : '<span style="color:#94a3b8;">—</span>'}</td>
                <td style="color:#64748b;font-size:12px;">${fecha}</td>
                <td>
                  ${r.ruta_archivo
                    ? `<a href="${r.ruta_archivo}" target="_blank" class="btn-dl"><span class="material-icons-outlined" style="font-size:14px;">download</span>Descargar</a>`
                    : '<span style="color:#94a3b8;font-size:12px;">Sin archivo</span>'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch(err) {
    container.innerHTML = `<div class="empty-state" style="color:#dc2626;"><span class="material-icons-outlined">error</span><p>Error al cargar el historial</p></div>`;
  }
}