const API_BASE = "http://localhost:3000";

let reportesData    = [];
let evidenciasCache = {};
let filtroEstado    = '';
let filtroBusqueda  = '';

const estadosConfig = {
  1: { label: 'Pendiente',   clase: 'estado-pendiente' },
  2: { label: 'En revisión', clase: 'estado-revision'  },
  3: { label: 'Aprobado',    clase: 'estado-aprobado'  },
  4: { label: 'Rechazado',   clase: 'estado-rechazado' }
};

document.addEventListener("DOMContentLoaded", async () => {
  const token   = localStorage.getItem("token");
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  if (!token || !usuario) { window.location.href = "/login.html"; return; }

  const el = document.getElementById("nombreUsuario");
  if (el) el.textContent = usuario.nombre;

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login.html";
  });

  document.getElementById("inputBusqueda").addEventListener("input", e => {
    filtroBusqueda = e.target.value;
    aplicarFiltros();
  });

  await cargarReportes();
});

function mostrarAlerta(tipo, titulo, mensaje, duracion = 4000) {
  const container = document.getElementById("alertContainer");
  if (!container) return;
  const cfg = {
    success: { bg:'#1B6B4F', text:'#fff', border:'#165844' },
    danger:  { bg:'rgba(220,38,38,0.08)', text:'#DC2626', border:'rgba(220,38,38,0.2)' },
    warning: { bg:'rgba(245,158,11,0.08)', text:'#D97706', border:'rgba(245,158,11,0.2)' },
    info:    { bg:'rgba(37,99,235,0.08)', text:'#2563EB', border:'rgba(37,99,235,0.2)' }
  }[tipo] || { bg:'#fff', text:'#374151', border:'#e5e7eb' };

  const d = document.createElement("div");
  d.style.cssText = `background:${cfg.bg};color:${cfg.text};border:1px solid ${cfg.border};padding:14px 16px;border-radius:8px;display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;animation:slideInRight 0.3s ease-out;min-width:280px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,0.1);`;
  d.innerHTML = `
    <div style="flex:1;"><div style="font-weight:700;font-size:13px;">${titulo}</div><div style="font-size:13px;margin-top:2px;opacity:0.9;">${mensaje}</div></div>
    <span onclick="this.parentElement.remove()" style="cursor:pointer;opacity:0.5;font-size:18px;line-height:1;flex-shrink:0;">x</span>
  `;
  container.appendChild(d);
  setTimeout(() => { d.style.opacity='0'; d.style.transition='opacity 0.3s'; setTimeout(()=>d.remove(),300); }, duracion);
}

function getIconoArchivo(tipo) {
  if (!tipo) return 'attach_file';
  tipo = tipo.toLowerCase();
  if (tipo.includes('pdf')) return 'picture_as_pdf';
  if (tipo.includes('image') || ['jpg','jpeg','png'].includes(tipo)) return 'image';
  if (tipo.includes('word') || tipo.includes('doc')) return 'description';
  if (tipo.includes('excel') || tipo.includes('sheet') || tipo.includes('xls')) return 'table_chart';
  return 'attach_file';
}

async function cargarReportes() {
  const token = localStorage.getItem("token");
  const tabla = document.getElementById("tablaReportes");
  tabla.innerHTML = `<tr><td colspan="8" class="tabla-vacia">Cargando reportes...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/api/reportes?limit=500`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    reportesData = json.data || [];
    actualizarContadores();
    aplicarFiltros();
  } catch {
    tabla.innerHTML = `<tr><td colspan="8" class="tabla-vacia">Error al cargar los reportes</td></tr>`;
    mostrarAlerta("danger", "Error", "No se pudieron cargar los reportes");
  }
}

function actualizarContadores() {
  document.getElementById('cnt-todos').textContent = reportesData.length;
  [1,2,3,4].forEach(e => {
    const el = document.getElementById(`cnt-${e}`);
    if (el) el.textContent = reportesData.filter(r => r.estado_id == e).length;
  });
}

function cambiarTab(btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtroEstado = btn.dataset.estado;
  aplicarFiltros();
}

function aplicarFiltros() {
  let lista = reportesData;

  if (filtroEstado) lista = lista.filter(r => r.estado_id == filtroEstado);

  if (filtroBusqueda.trim()) {
    const q = filtroBusqueda.toLowerCase();
    lista = lista.filter(r =>
      (r.titulo && r.titulo.toLowerCase().includes(q)) ||
      (r.empresas?.nombre && r.empresas.nombre.toLowerCase().includes(q)) ||
      (r.usuarios?.nombre && r.usuarios.nombre.toLowerCase().includes(q))
    );
  }

  renderizarReportes(lista);
  document.getElementById("titleReportes").textContent = `Listado de reportes (${lista.length})`;
}

function renderizarReportes(reportes) {
  const tabla = document.getElementById("tablaReportes");
  if (!reportes.length) {
    tabla.innerHTML = `<tr><td colspan="8" class="tabla-vacia">No hay reportes que coincidan</td></tr>`;
    return;
  }
  tabla.innerHTML = reportes.map(r => {
    const cfg       = estadosConfig[r.estado_id] || estadosConfig[1];
    const fecha     = r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString('es-MX') : '—';
    const conf      = r.confianza_ia != null ? Math.round(r.confianza_ia) : null;
    const confText  = conf != null ? `${conf}%` : '—';
    const confColor = conf == null ? '#9ca3af' : conf >= 70 ? '#1B6B4F' : conf >= 40 ? '#F59E0B' : '#DC2626';
    const empresa   = r.empresas?.nombre || '—';
    const usuario   = r.usuarios?.nombre || '—';
    return `
      <tr>
        <td>#${r.id}</td>
        <td style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.titulo || ''}">${r.titulo || '—'}</td>
        <td>${empresa}</td>
        <td>${usuario}</td>
        <td>${fecha}</td>
        <td><span class="badge-estado ${cfg.clase}">${cfg.label}</span></td>
        <td style="text-align:center;font-weight:700;color:${confColor};">${confText}</td>
        <td>
          <button onclick="verDetalle(${r.id})"
            style="padding:7px 14px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;color:#374151;display:inline-flex;align-items:center;gap:5px;"
            onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
            <span class="material-icons-outlined" style="font-size:15px;">visibility</span>Ver
          </button>
        </td>
      </tr>`;
  }).join("");
}

async function verDetalle(id) {
  const token = localStorage.getItem("token");
  const modal = document.getElementById("modalDetalle");
  const body  = document.getElementById("modalDetalleBody");
  body.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;">Cargando...</div>`;
  modal.classList.add("active");

  try {
    const res = await fetch(`${API_BASE}/api/reportes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error();
    const r        = await res.json();
    const cfg      = estadosConfig[r.estado_id] || estadosConfig[1];
    const fecha    = r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' }) : '—';
    const conf     = r.confianza_ia != null ? Math.round(r.confianza_ia) : null;
    const confText = conf != null ? `${conf}%` : '—';
    const confColor = conf == null ? '#9ca3af' : conf >= 70 ? '#1B6B4F' : conf >= 40 ? '#F59E0B' : '#DC2626';
    const empresa  = r.empresas?.nombre || '—';
    const usuario  = r.usuarios?.nombre || '—';

    let evidenciasHTML = `<p style="color:#9ca3af;font-size:13px;padding:8px 0;">Sin evidencias</p>`;
    let conteoEvidencias = 0;
    try {
      const resEv = await fetch(`${API_BASE}/api/evidencias/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (resEv.ok) {
        const evidencias = await resEv.json();
        evidencias.forEach(ev => { evidenciasCache[ev.id] = ev; });
        if (evidencias.length) {
          conteoEvidencias = evidencias.length;
          evidenciasHTML = evidencias.map(ev => {
            const confEv    = ev.confianza_ia != null ? Math.round(ev.confianza_ia) : null;
            const colorConf = confEv == null ? '#9ca3af' : confEv >= 70 ? '#1B6B4F' : confEv >= 40 ? '#F59E0B' : '#DC2626';
            const confEvTxt = confEv != null ? `${confEv}%` : '—';
            const icono     = getIconoArchivo(ev.tipo_archivo);
            const fechaEv   = ev.fecha_subida ? new Date(ev.fecha_subida).toLocaleDateString('es-MX') : '—';
            const tieneArchivo = ev.ruta_archivo && ev.ruta_archivo.trim() !== '';
            let analisisTexto = '';
            if (ev.analisis_ia) {
              try {
                const p = typeof ev.analisis_ia === 'string' ? JSON.parse(ev.analisis_ia) : ev.analisis_ia;
                const src = p.resumen || p.resultado || p.descripcion || '';
                analisisTexto = src ? src.substring(0,120) + (src.length > 120 ? '…' : '') : '';
              } catch {
                analisisTexto = String(ev.analisis_ia).substring(0,120) + (ev.analisis_ia.length > 120 ? '…' : '');
              }
            }
            return `
              <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;background:#f9fafb;">
                <div style="flex-shrink:0;width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border-radius:6px;color:#6b7280;">
                  <span class="material-icons-outlined" style="font-size:20px;">${icono}</span>
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;color:#111827;font-size:13px;word-break:break-word;">${ev.nombre_archivo}</div>
                  <div style="font-size:12px;color:#6b7280;margin-top:2px;">${ev.tipo_archivo || 'archivo'} · ${fechaEv}</div>
                  ${analisisTexto ? `<div style="font-size:12px;color:#4b5563;margin-top:4px;line-height:1.4;">${analisisTexto}</div>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px;">
                  <span style="font-weight:700;color:${colorConf};font-size:13px;min-width:32px;text-align:right;">${confEvTxt}</span>
                  ${tieneArchivo ? `
                    <button onclick="verArchivoAdmin(${ev.id})" title="Previsualizar"
                      style="padding:6px 10px;background:rgba(27,107,79,0.1);border:1px solid rgba(27,107,79,0.3);border-radius:6px;cursor:pointer;font-size:12px;color:#1B6B4F;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
                      <span class="material-icons-outlined" style="font-size:14px;">visibility</span>Ver
                    </button>
                    <button onclick="descargarArchivoAdmin(${ev.id})" title="Descargar"
                      style="padding:6px 10px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:12px;color:#374151;display:inline-flex;align-items:center;">
                      <span class="material-icons-outlined" style="font-size:14px;">download</span>
                    </button>
                  ` : `<span style="font-size:11px;color:#9ca3af;white-space:nowrap;">Sin archivo</span>`}
                </div>
              </div>`;
          }).join('');
        }
      }
    } catch(e) { console.error("Error evidencias:", e); }

    body.innerHTML = `
      <div class="detalle-field"><label>Título</label><p>${r.titulo || '—'}</p></div>
      <div style="display:flex;gap:20px;margin-bottom:16px;">
        <div class="detalle-field" style="flex:1;"><label>Empresa</label><p>${empresa}</p></div>
        <div class="detalle-field" style="flex:1;"><label>Usuario</label><p>${usuario}</p></div>
      </div>
      <div style="display:flex;gap:20px;margin-bottom:16px;">
        <div class="detalle-field" style="flex:1;"><label>Fecha de creación</label><p>${fecha}</p></div>
        <div class="detalle-field" style="flex:1;"><label>Estado</label><span class="badge-estado ${cfg.clase}" style="display:inline-block;margin-top:2px;">${cfg.label}</span></div>
      </div>
      <div style="display:flex;gap:20px;margin-bottom:16px;">
        <div class="detalle-field" style="flex:1;"><label>Confianza IA</label><p style="font-weight:700;font-size:18px;color:${confColor};">${confText}</p></div>
        <div class="detalle-field" style="flex:1;"><label>Validación IA</label><p>${r.validacion_ia || 'En proceso...'}</p></div>
      </div>
      <div class="detalle-field"><label>Descripción</label><p style="white-space:pre-wrap;">${r.descripcion || '—'}</p></div>
      <div style="margin-top:20px;padding-top:18px;border-top:1px solid #e5e7eb;">
        <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px;">Evidencias (${conteoEvidencias})</div>
        ${evidenciasHTML}
      </div>`;
  } catch {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#DC2626;">Error al cargar el reporte</div>`;
    mostrarAlerta("danger", "Error", "No se pudo cargar el detalle del reporte");
  }
}

function cerrarDetalle() {
  document.getElementById("modalDetalle").classList.remove("active");
}

function verArchivoAdmin(evId) {
  const ev = evidenciasCache[evId];
  if (!ev?.ruta_archivo) { mostrarAlerta('warning', 'Sin archivo', 'No hay archivo disponible'); return; }
  const ruta = ev.ruta_archivo.trim();
  const tipo = (ev.tipo_archivo || '').toLowerCase();
  if (ruta.startsWith('data:')) {
    if (tipo === 'pdf' || ruta.startsWith('data:application/pdf')) {
      try {
        const b = atob(ruta.split(',')[1]);
        const ab = new ArrayBuffer(b.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < b.length; i++) ia[i] = b.charCodeAt(i);
        window.open(URL.createObjectURL(new Blob([ab], { type: 'application/pdf' })), '_blank');
      } catch { mostrarAlerta('danger', 'Error', 'No se pudo abrir el PDF'); }
    } else { window.open(ruta, '_blank'); }
    return;
  }
  if (['pdf','jpg','jpeg','png','image','imagen'].includes(tipo)) {
    window.open(ruta, '_blank');
  } else {
    window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(ruta)}&embedded=true`, '_blank');
  }
}

function descargarArchivoAdmin(evId) {
  const ev = evidenciasCache[evId];
  if (!ev?.ruta_archivo) { mostrarAlerta('warning', 'Sin archivo', 'No hay archivo disponible'); return; }
  const a = document.createElement('a');
  a.href = ev.ruta_archivo;
  a.download = ev.nombre_archivo || 'archivo';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}