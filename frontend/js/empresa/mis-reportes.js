const API_BASE = 'http://localhost:3000';

let estadoFiltro        = null;
let reporteIdActual     = null;
let reporteIdEliminar   = null;
let evidenciaIdEliminar = null;
let archivoSeleccionado = null;
let archivoCrear        = null;
let evidenciasCache     = {};
let pollingInterval     = null;

const estadoConfig = {
  1: { label: 'Pendiente',   bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
  2: { label: 'En revisión', bg: 'rgba(37,99,235,0.1)',  color: '#2563EB' },
  3: { label: 'Aprobado',    bg: 'rgba(27,107,79,0.1)',  color: '#1B6B4F' },
  4: { label: 'Rechazado',   bg: 'rgba(220,38,38,0.1)',  color: '#DC2626' }
};

const ESTADOS_FINALES = [3, 4];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Intenta parsear un string JSON. Si falla, devuelve el string original.
 * Útil para analisis_ia que viene como JSON string del backend.
 */
function parsearAnalisisIA(valor) {
  if (!valor) return null;
  if (typeof valor === 'object') return valor; // ya es objeto
  try {
    return JSON.parse(valor);
  } catch (e) {
    return valor; // es texto plano, devolverlo tal cual
  }
}

/**
 * Extrae el texto legible de analisis_ia (puede ser JSON o string plano).
 * Devuelve el resumen/observacion o el texto directo.
 */
function extraerTextoAnalisis(analisisIA) {
  if (!analisisIA) return null;
  const parsed = parsearAnalisisIA(analisisIA);
  if (typeof parsed === 'object' && parsed !== null) {
    return parsed.resumen || parsed.observacion || parsed.estado_cumplimiento || JSON.stringify(parsed);
  }
  return String(parsed);
}

/**
 * Extrae el tipo de documento de analisis_ia.
 */
function extraerTipoDocumento(analisisIA) {
  if (!analisisIA) return null;
  const parsed = parsearAnalisisIA(analisisIA);
  if (typeof parsed === 'object' && parsed !== null) {
    return parsed.tipo_documento || null;
  }
  return null;
}

function mostrarAlerta(tipo, titulo, mensaje, duracion = 4000) {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  const cfg = {
    success: { bg:'#1B6B4F', text:'#fff',    border:'#165844', icono:'check_circle' },
    danger:  { bg:'#fff',    text:'#DC2626', border:'#fca5a5', icono:'error' },
    warning: { bg:'#fff',    text:'#D97706', border:'#fcd34d', icono:'warning' },
    info:    { bg:'#fff',    text:'#2563EB', border:'#93c5fd', icono:'info' }
  }[tipo] || { bg:'#fff', text:'#2563EB', border:'#93c5fd', icono:'info' };

  const d = document.createElement('div');
  d.style.cssText = `background:${cfg.bg};color:${cfg.text};border:1px solid ${cfg.border};padding:14px 16px;border-radius:10px;display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;animation:slideInRight 0.3s ease-out;min-width:280px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,0.12);`;
  d.innerHTML = `
    <span class="material-icons-outlined" style="font-size:20px;flex-shrink:0;margin-top:1px;">${cfg.icono}</span>
    <div>
      <div style="font-weight:700;font-size:13px;">${titulo}</div>
      <div style="font-size:13px;margin-top:2px;opacity:0.9;line-height:1.4;">${mensaje}</div>
    </div>
    <span onclick="this.parentElement.remove()" style="margin-left:auto;cursor:pointer;opacity:0.6;font-size:18px;line-height:1;flex-shrink:0;">×</span>
  `;
  container.appendChild(d);
  setTimeout(() => {
    d.style.opacity = '0';
    d.style.transition = 'opacity 0.3s';
    setTimeout(() => d.remove(), 300);
  }, duracion);
}

function updateChar(el, targetId, max) {
  const len = el.value.length;
  const t = document.getElementById(targetId);
  if (!t) return;
  const base = targetId === 'charDesc' ? ` / ${max} (mínimo 20 caracteres)` : ` / ${max}`;
  t.textContent = len + base;
  t.className = 'char-count' + (len >= 20 ? ' ok' : len > max * 0.8 ? ' warn' : '');
}

function getIconoArchivo(tipo) {
  if (!tipo) return 'attach_file';
  if (tipo.includes('pdf'))   return 'picture_as_pdf';
  if (tipo.includes('image')) return 'image';
  if (tipo.includes('word') || tipo.includes('doc')) return 'description';
  if (tipo.includes('excel') || tipo.includes('sheet') || tipo.includes('xls')) return 'table_chart';
  return 'attach_file';
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!token || !usuario) { window.location.href = '/login.html'; return; }

  document.getElementById('nombreUsuario').textContent = usuario.nombre || usuario.email;
  if (usuario.empresa_id) await cargarNombreEmpresa(token, usuario.empresa_id);

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear(); window.location.href = '/login.html';
  });

  await cargarReportes(token);

  const params = new URLSearchParams(window.location.search);
  if (params.get('id')) await verDetalle(parseInt(params.get('id')));
});

async function cargarNombreEmpresa(token, empresa_id) {
  try {
    const res = await fetch(`${API_BASE}/api/empresas/${empresa_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const e = await res.json();
      document.getElementById('nombreEmpresa').textContent = e.nombre;
    }
  } catch(e) { console.error(e); }
}

function filtrar(estado, btn) {
  estadoFiltro = estado;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cargarReportes(localStorage.getItem('token'));
}

// ── Tabla de reportes ─────────────────────────────────────────────────────────

async function cargarReportes(token) {
  const tabla = document.getElementById('tablaReportes');
  tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">Cargando reportes...</td></tr>`;

  try {
    let url = `${API_BASE}/api/reportes?limit=100`;
    if (estadoFiltro) url += `&estado_id=${estadoFiltro}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error();

    const json     = await res.json();
    const reportes = json.data || [];

    if (!reportes.length) {
      tabla.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="material-icons-outlined">description</span>No hay reportes aún</div></td></tr>`;
      return;
    }

    tabla.innerHTML = reportes.map(r => {
      const cfg   = estadoConfig[r.estado_id] || estadoConfig[1];
      const fecha = r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString('es-MX') : '—';
      const conf      = r.confianza_ia != null ? Math.round(r.confianza_ia) : null;
      const confText  = conf != null ? `${conf}%` : '—';
      const confColor = conf == null ? '#9ca3af' : conf >= 70 ? '#1B6B4F' : conf >= 40 ? '#F59E0B' : '#DC2626';
      const puedeEliminar = r.estado_id === 1;

      return `
        <tr>
          <td>#${r.id}</td>
          <td style="font-weight:600;text-align:left;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.titulo || 'Sin título'}</td>
          <td>${fecha}</td>
          <td><span style="font-weight:600;color:${confColor};">${confText}</span></td>
          <td>
            <span style="display:inline-block;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:600;background:${cfg.bg};color:${cfg.color};">
              ${cfg.label}
            </span>
          </td>
          <td>
            <div style="display:flex;gap:8px;justify-content:center;">
              <button onclick="verDetalle(${r.id})" style="padding:7px 12px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;color:#374151;">
                <span class="material-icons-outlined" style="font-size:15px;vertical-align:middle;">visibility</span> Ver
              </button>
              ${puedeEliminar ? `
              <button onclick="abrirEliminar(${r.id})" style="padding:7px 12px;background:rgba(220,38,38,0.1);border:1px solid rgba(220,38,38,0.3);border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;color:#DC2626;">
                <span class="material-icons-outlined" style="font-size:15px;vertical-align:middle;">delete</span> Eliminar
              </button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch(err) {
    tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#DC2626;">Error al cargar los reportes</td></tr>`;
    mostrarAlerta('danger', 'Error', 'No se pudieron cargar los reportes');
  }
}

// ── Modal crear ───────────────────────────────────────────────────────────────

function abrirModalCrear() {
  document.getElementById('inputTitulo').value      = '';
  document.getElementById('inputDescripcion').value = '';
  document.getElementById('charTitulo').textContent = '0 / 120';
  document.getElementById('charDesc').textContent   = '0 / 2000 (mínimo 20 caracteres)';
  document.getElementById('uploadPreviewCrear').innerHTML = '';
  document.getElementById('fileInputCrear').value   = '';
  archivoCrear = null;
  document.getElementById('modalCrear').classList.add('active');
}

function cerrarModalCrear() {
  document.getElementById('modalCrear').classList.remove('active');
  archivoCrear = null;
}

function previewFileCrear(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    mostrarAlerta('warning', 'Archivo muy grande', 'El archivo no puede superar 10MB');
    input.value = '';
    return;
  }
  archivoCrear = file;
  const size = file.size > 1024*1024 ? `${(file.size/(1024*1024)).toFixed(2)} MB` : `${(file.size/1024).toFixed(1)} KB`;
  document.getElementById('uploadPreviewCrear').innerHTML = `
    <div class="upload-file-preview" style="margin-top:8px;">
      <span class="material-icons-outlined">check_circle</span>
      <div class="upload-file-info">
        <strong>${file.name}</strong>
        <span>${size}</span>
      </div>
      <button onclick="limpiarArchivoCrear()"><span class="material-icons-outlined">close</span></button>
    </div>
  `;
}

function limpiarArchivoCrear() {
  document.getElementById('fileInputCrear').value = '';
  document.getElementById('uploadPreviewCrear').innerHTML = '';
  archivoCrear = null;
}

async function crearReporte() {
  const token       = localStorage.getItem('token');
  const titulo      = document.getElementById('inputTitulo').value.trim();
  const descripcion = document.getElementById('inputDescripcion').value.trim();

  if (!titulo)                 { mostrarAlerta('warning', 'Validación', 'El título es requerido'); return; }
  if (descripcion.length < 20) { mostrarAlerta('warning', 'Validación', 'La descripción debe tener al menos 20 caracteres'); return; }

  const btn = document.getElementById('btnEnviarReporte');
  btn.innerHTML = `<span class="spinner"></span> Enviando...`;
  btn.disabled  = true;

  try {
    const res  = await fetch(`${API_BASE}/api/reportes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, descripcion })
    });
    const data = await res.json();
    if (!res.ok) { mostrarAlerta('danger', 'Error', data.mensaje || 'Error al crear el reporte'); return; }

    const reporteId = data.data?.id;

    if (archivoCrear && reporteId) {
      btn.innerHTML = `<span class="spinner"></span> Subiendo archivo...`;
      try {
        const formData = new FormData();
        formData.append('file', archivoCrear);
        formData.append('reporte_id', reporteId);
        await fetch(`${API_BASE}/api/evidencias/upload`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
        });
      } catch(e) {
        mostrarAlerta('warning', 'Reporte creado', 'El archivo no se pudo subir, pero el reporte se creó correctamente');
      }
    }

    mostrarAlerta('success', '¡Listo!', archivoCrear
      ? 'Reporte creado. La IA analizará el archivo en breve.'
      : 'Reporte creado correctamente');
    cerrarModalCrear();
    await cargarReportes(token);

  } catch(err) {
    mostrarAlerta('danger', 'Error', 'Error de conexión al crear el reporte');
  } finally {
    btn.innerHTML = 'Enviar Reporte';
    btn.disabled  = false;
  }
}

// ── Modal detalle ─────────────────────────────────────────────────────────────

async function verDetalle(id) {
  const token = localStorage.getItem('token');
  reporteIdActual = id;
  detenerPolling();

  try {
    const res = await fetch(`${API_BASE}/api/reportes/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();

    const r = await res.json();
    renderDetalleReporte(r);
    resetUploadArea();

    document.getElementById('modalDetalle').classList.add('active');
    await cargarEvidencias(token, id);

    const yaFinalizado = ESTADOS_FINALES.includes(r.estado_id) || (r.validacion_ia && r.confianza_ia > 0);
    if (!yaFinalizado) {
      iniciarPolling(id);
    }

  } catch(err) {
    mostrarAlerta('danger', 'Error', 'No se pudo cargar el detalle del reporte');
  }
}

function renderDetalleReporte(r) {
  const cfg   = estadoConfig[r.estado_id] || estadoConfig[1];
  const fecha = r.fecha_creacion
    ? new Date(r.fecha_creacion).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' })
    : '—';

  const conf      = r.confianza_ia != null ? Math.round(r.confianza_ia) : 0;
  const confColor = conf >= 70 ? '#1B6B4F' : conf >= 40 ? '#F59E0B' : '#DC2626';

  const esFinal    = ESTADOS_FINALES.includes(r.estado_id);
  const sinAnalisis = !esFinal && (!r.validacion_ia || (r.confianza_ia == null || r.confianza_ia === 0));

  let iaBloque;
  if (sinAnalisis) {
    iaBloque = `
      <div class="ia-analizando">
        <div class="spinner-green"></div>
        <span>La IA está analizando las evidencias del reporte...</span>
      </div>
    `;
  } else {
    // validacion_ia viene como texto plano (la observacion del servicio IA)
    const textoAnalisis = r.validacion_ia || (r.estado_id === 4 ? 'Documento rechazado por análisis IA.' : 'Análisis completado.');
    const confDisplay   = conf > 0 ? `${conf}%` : '—';
    const barWidth      = conf > 0 ? conf : 0;

    // Determinar ícono y color según estado
    const esAprobado = r.estado_id === 3;
    const iconoEstado = esAprobado ? 'check_circle' : 'cancel';
    const colorEstado = esAprobado ? '#1B6B4F' : '#DC2626';

    iaBloque = `
      <div class="ia-box">
        <div class="ia-titulo">
          <span class="material-icons-outlined" style="font-size:16px;">smart_toy</span>
          Resultado de validación IA
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
          <span class="material-icons-outlined" style="font-size:18px;color:${colorEstado};flex-shrink:0;margin-top:1px;">${iconoEstado}</span>
          <p style="font-size:13px;color:#374151;line-height:1.6;margin:0;">${textoAnalisis}</p>
        </div>
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:4px;">
            <span>Confianza del análisis</span>
            <span style="font-weight:600;color:${confColor};">${confDisplay}</span>
          </div>
          <div class="confianza-bar">
            <div class="confianza-fill" style="width:${barWidth}%;background:${confColor};"></div>
          </div>
        </div>
      </div>
    `;
  }

  document.getElementById('detalleContenido').innerHTML = `
    <div class="detalle-field">
      <label>Título</label>
      <p>${r.titulo || '—'}</p>
    </div>
    <div class="detalle-field">
      <label>Descripción</label>
      <p style="white-space:pre-wrap;">${r.descripcion || '—'}</p>
    </div>
    <div style="display:flex;gap:20px;margin-bottom:16px;">
      <div class="detalle-field" style="flex:1;">
        <label>Fecha de creación</label>
        <p>${fecha}</p>
      </div>
      <div class="detalle-field" style="flex:1;">
        <label>Estado</label>
        <span style="display:inline-block;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:600;background:${cfg.bg};color:${cfg.color};">${cfg.label}</span>
      </div>
    </div>
    <div class="detalle-field">
      <label>Análisis de IA</label>
      ${iaBloque}
    </div>
  `;
}

// ── Polling ───────────────────────────────────────────────────────────────────

function iniciarPolling(reporteId) {
  let intentos = 0;
  let erroresConsecutivos = 0;

  pollingInterval = setInterval(async () => {
    intentos++;
    if (intentos > 24) { detenerPolling(); return; }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/reportes/${reporteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        erroresConsecutivos++;
        if (erroresConsecutivos >= 3) {
          detenerPolling();
          mostrarAlerta('warning', 'Sin conexión', 'No se pudo verificar el estado del análisis');
        }
        return;
      }

      erroresConsecutivos = 0;
      const r = await res.json();

      if (ESTADOS_FINALES.includes(r.estado_id)) {
        renderDetalleReporte(r);
        await cargarReportes(token);
        detenerPolling();
        const msg = r.estado_id === 3
          ? 'El documento fue aprobado por la IA'
          : 'El documento fue rechazado por la IA';
        mostrarAlerta(r.estado_id === 3 ? 'success' : 'danger', 'Análisis completado', msg);
      }

    } catch(e) {
      erroresConsecutivos++;
      if (erroresConsecutivos >= 3) {
        detenerPolling();
        mostrarAlerta('warning', 'Sin conexión', 'No se pudo verificar el estado del análisis');
      }
    }
  }, 5000);
}

function detenerPolling() {
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
}

function cerrarDetalle() {
  detenerPolling();
  document.getElementById('modalDetalle').classList.remove('active');
  reporteIdActual = null;
}

// ── Evidencias ────────────────────────────────────────────────────────────────

async function cargarEvidencias(token, reporte_id) {
  const lista = document.getElementById('listaEvidencias');
  lista.innerHTML = `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">Cargando evidencias...</div>`;

  try {
    const res = await fetch(`${API_BASE}/api/evidencias/${reporte_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();

    const evidencias = await res.json();
    evidencias.forEach(ev => { evidenciasCache[ev.id] = ev; });

    if (!evidencias.length) {
      lista.innerHTML = `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">No hay evidencias aún</div>`;
      return;
    }

    lista.innerHTML = evidencias.map(ev => {
      const fecha = ev.fecha_subida ? new Date(ev.fecha_subida).toLocaleDateString('es-MX') : '—';
      const conf  = ev.confianza_ia != null ? `${ev.confianza_ia}%` : '—';
      const confColor = ev.confianza_ia == null ? '#9ca3af' : ev.confianza_ia >= 70 ? '#1B6B4F' : ev.confianza_ia >= 40 ? '#F59E0B' : '#DC2626';
      const icono = getIconoArchivo(ev.tipo_archivo);
      const tieneArchivo = ev.ruta_archivo && ev.ruta_archivo.trim() !== '';

      // ── CORRECCIÓN: parsear analisis_ia que viene como JSON string ──
      const textoAnalisis = extraerTextoAnalisis(ev.analisis_ia);
      const tipoDocumento = extraerTipoDocumento(ev.analisis_ia);

      // Línea de subtítulo: tipo de documento + fecha
      const subtitulo = [tipoDocumento, ev.tipo_archivo || 'archivo'].filter(Boolean).join(' · ') + ` · ${fecha}`;

      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;background:#f9fafb;">
          <div style="display:flex;align-items:flex-start;gap:12px;flex:1;">
            <div style="flex-shrink:0;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border-radius:6px;color:#6b7280;font-size:18px;">
              <span class="material-icons-outlined">${icono}</span>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;color:#111827;margin-bottom:4px;word-break:break-word;">${ev.nombre_archivo}</div>
              <div style="font-size:12px;color:#6b7280;">${subtitulo}</div>
              ${textoAnalisis ? `
                <div style="font-size:12px;color:#4b5563;margin-top:5px;line-height:1.5;background:#fff;border:1px solid #e5e7eb;border-radius:5px;padding:6px 8px;">
                  ${textoAnalisis.substring(0, 120)}${textoAnalisis.length > 120 ? '...' : ''}
                </div>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:12px;">
            <span style="font-weight:600;color:${confColor};font-size:13px;min-width:35px;text-align:right;">${conf}</span>
            ${tieneArchivo ? `
              <button onclick="verArchivo(${ev.id})" style="padding:6px 12px;background:rgba(27,107,79,0.1);border:1px solid rgba(27,107,79,0.3);border-radius:6px;cursor:pointer;font-size:12px;color:#1B6B4F;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
                <span class="material-icons-outlined" style="font-size:14px;">visibility</span>Ver
              </button>
              <button onclick="descargarArchivo(${ev.id},'${ev.nombre_archivo}')" style="padding:6px 12px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:12px;color:#374151;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
                <span class="material-icons-outlined" style="font-size:14px;">download</span>
              </button>
            ` : ''}
            <button onclick="abrirEliminarEv(${ev.id})" style="background:none;border:none;cursor:pointer;color:#d1d5db;padding:6px;font-size:18px;display:inline-flex;" onmouseover="this.style.color='#DC2626'" onmouseout="this.style.color='#d1d5db'">
              <span class="material-icons-outlined">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch(err) {
    lista.innerHTML = `<div style="text-align:center;padding:20px;color:#DC2626;font-size:13px;">Error al cargar evidencias</div>`;
  }
}

// ── Upload evidencias ─────────────────────────────────────────────────────────

function resetUploadArea() {
  document.getElementById('uploadArea').style.display   = 'none';
  document.getElementById('uploadPreview').innerHTML    = '';
  document.getElementById('uploadActions').innerHTML    = '';
  document.getElementById('fileInput').value            = '';
  archivoSeleccionado = null;
}

function toggleUpload() {
  const area = document.getElementById('uploadArea');
  if (area.style.display === 'none') {
    area.style.display = 'block';
  } else {
    resetUploadArea();
  }
}

function cancelarUpload() { resetUploadArea(); }

function previewFile(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    mostrarAlerta('warning', 'Archivo muy grande', 'El archivo no puede superar 10MB');
    input.value = '';
    return;
  }
  archivoSeleccionado = file;
  const size = file.size > 1024*1024 ? `${(file.size/(1024*1024)).toFixed(2)} MB` : `${(file.size/1024).toFixed(1)} KB`;

  document.getElementById('uploadPreview').innerHTML = `
    <div class="upload-file-preview" style="margin-top:8px;">
      <span class="material-icons-outlined" style="color:#22c55e;">check_circle</span>
      <div class="upload-file-info">
        <strong>${file.name}</strong>
        <span>${size}</span>
      </div>
      <button onclick="limpiarArchivo()"><span class="material-icons-outlined">close</span></button>
    </div>
  `;

  document.getElementById('uploadActions').innerHTML = `
    <div class="upload-actions">
      <button class="btn-upload-confirm" id="btnConfirmarUpload" onclick="subirEvidencia()">
        <span class="material-icons-outlined">cloud_upload</span>
        Subir
      </button>
      <button class="btn-upload-cancel" onclick="cancelarUpload()">
        <span class="material-icons-outlined">cancel</span>
        Cancelar
      </button>
    </div>
  `;
}

function limpiarArchivo() {
  document.getElementById('fileInput').value         = '';
  document.getElementById('uploadPreview').innerHTML = '';
  document.getElementById('uploadActions').innerHTML = '';
  archivoSeleccionado = null;
}

async function subirEvidencia() {
  if (!archivoSeleccionado) { mostrarAlerta('warning', 'Atención', 'Selecciona un archivo primero'); return; }
  if (!reporteIdActual)     { mostrarAlerta('danger', 'Error', 'No hay reporte seleccionado'); return; }

  const token = localStorage.getItem('token');
  const btn   = document.getElementById('btnConfirmarUpload');
  if (btn) { btn.innerHTML = `<span class="spinner"></span> Subiendo...`; btn.disabled = true; }

  try {
    const formData = new FormData();
    formData.append('file', archivoSeleccionado);
    formData.append('reporte_id', reporteIdActual);

    const res  = await fetch(`${API_BASE}/api/evidencias/upload`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
    });
    const data = await res.json();

    if (res.ok) {
      mostrarAlerta('success', 'Subido', 'Evidencia subida. La IA la analizará en breve.');
      resetUploadArea();
      await cargarEvidencias(token, reporteIdActual);
      detenerPolling();
      iniciarPolling(reporteIdActual);
    } else {
      mostrarAlerta('danger', 'Error', data.mensaje || 'Error al guardar la evidencia');
      if (btn) { btn.innerHTML = `<span class="material-icons-outlined">cloud_upload</span> Subir`; btn.disabled = false; }
    }
  } catch(err) {
    mostrarAlerta('danger', 'Error', err.message || 'Error al subir la evidencia');
    if (btn) { btn.innerHTML = `<span class="material-icons-outlined">cloud_upload</span> Subir`; btn.disabled = false; }
  }
}

// ── Ver / Descargar archivos ──────────────────────────────────────────────────

function verArchivo(evId) {
  const ev = evidenciasCache[evId];
  if (!ev || !ev.ruta_archivo) { mostrarAlerta('warning', 'Sin archivo', 'No hay archivo disponible'); return; }
  const ruta = ev.ruta_archivo.trim();
  const tipo = ev.tipo_archivo || '';

  if (ruta.startsWith('data:')) {
    if (tipo === 'pdf') {
      try {
        const b  = atob(ruta.split(',')[1]);
        const ab = new ArrayBuffer(b.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < b.length; i++) ia[i] = b.charCodeAt(i);
        window.open(URL.createObjectURL(new Blob([ab], { type: 'application/pdf' })), '_blank');
      } catch(e) { mostrarAlerta('danger', 'Error', 'Error al abrir el PDF'); }
    } else {
      window.open(ruta, '_blank');
    }
    return;
  }

  if (['pdf', 'jpg', 'png', 'imagen'].includes(tipo)) {
    window.open(ruta, '_blank');
  } else {
    window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(ruta)}&embedded=true`, '_blank');
  }
}

function descargarArchivo(evId, nombre) {
  const ev = evidenciasCache[evId];
  if (!ev || !ev.ruta_archivo) { mostrarAlerta('warning', 'Sin archivo', 'No hay archivo disponible'); return; }
  const a = document.createElement('a');
  a.href = ev.ruta_archivo;
  a.download = nombre || ev.nombre_archivo || 'archivo';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Eliminar evidencia ────────────────────────────────────────────────────────

function abrirEliminarEv(id) {
  evidenciaIdEliminar = id;
  document.getElementById('modalEliminarEv').classList.add('active');
}
function cerrarEliminarEv() {
  evidenciaIdEliminar = null;
  document.getElementById('modalEliminarEv').classList.remove('active');
}
async function confirmarEliminarEv() {
  if (!evidenciaIdEliminar) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/evidencias/${evidenciaIdEliminar}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      mostrarAlerta('success', 'Eliminado', 'Evidencia eliminada correctamente');
      cerrarEliminarEv();
      await cargarEvidencias(token, reporteIdActual);
    } else {
      const err = await res.json();
      mostrarAlerta('danger', 'Error', err.mensaje || 'Error al eliminar');
      cerrarEliminarEv();
    }
  } catch(err) {
    mostrarAlerta('danger', 'Error', 'Error al eliminar la evidencia');
    cerrarEliminarEv();
  }
}

// ── Eliminar reporte ──────────────────────────────────────────────────────────

function abrirEliminar(id) {
  reporteIdEliminar = id;
  document.getElementById('modalEliminar').classList.add('active');
}
function cerrarEliminar() {
  reporteIdEliminar = null;
  document.getElementById('modalEliminar').classList.remove('active');
}
async function confirmarEliminar() {
  if (!reporteIdEliminar) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/reportes/${reporteIdEliminar}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      mostrarAlerta('success', 'Eliminado', 'Reporte eliminado correctamente');
      cerrarEliminar();
      await cargarReportes(token);
    } else {
      const err = await res.json();
      mostrarAlerta('danger', 'Error', err.mensaje || 'No se pudo eliminar el reporte');
      cerrarEliminar();
    }
  } catch(err) {
    mostrarAlerta('danger', 'Error', 'Error al eliminar el reporte');
    cerrarEliminar();
  }
}