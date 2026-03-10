const API_BASE = 'http://localhost:3000';
let archivoActual = null;
let reporteSeleccionado = null;

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
  await cargarReportes(token, usuario.empresa_id);
  setupFileInput();
  setupDrop();
});

async function cargarReportes(token, empresaId) {
  try {
    const res = await fetch(`${API_BASE}/api/reportes?empresa_id=${empresaId}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const json  = await res.json();
    const lista = Array.isArray(json) ? json : (json.data || []);
    const sel   = document.getElementById('selectReporte');

    lista.forEach(r => {
      const opt = document.createElement('option');
      opt.value       = r.id;
      opt.textContent = `#${r.id} — ${r.titulo || 'Sin título'}`;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      reporteSeleccionado = sel.value || null;
      if (reporteSeleccionado) {
        document.getElementById('uploadSection').style.display   = 'block';
        document.getElementById('evidenciasSection').style.display = 'block';
        cargarEvidencias(token, reporteSeleccionado);
      } else {
        document.getElementById('uploadSection').style.display   = 'none';
        document.getElementById('evidenciasSection').style.display = 'none';
      }
    });
  } catch {
    mostrarAlerta('danger', 'Error', 'No se pudieron cargar los reportes');
  }
}

async function cargarEvidencias(token, reporteId) {
  document.getElementById('evGrid').innerHTML = '<p style="color:#94a3b8;font-size:13px;">Cargando...</p>';
  try {
    const res = await fetch(`${API_BASE}/api/evidencias/${reporteId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const lista = await res.json();
    document.getElementById('countEvidencias').textContent = `${lista.length} evidencia${lista.length !== 1 ? 's' : ''}`;
    renderEvidencias(lista);
  } catch {
    document.getElementById('evGrid').innerHTML = '<p style="color:#dc2626;font-size:13px;">Error al cargar evidencias</p>';
  }
}

function renderEvidencias(lista) {
  if (!lista.length) {
    document.getElementById('evGrid').innerHTML = '<p style="color:#94a3b8;font-size:13px;">Sin evidencias en este reporte.</p>';
    return;
  }
  const iconMap = { pdf:'picture_as_pdf', docx:'description', xlsx:'table_chart', png:'image', jpg:'image', imagen:'image' };
  document.getElementById('evGrid').innerHTML = lista.map(ev => {
    const tipo  = ev.tipo_archivo || 'default';
    const icono = iconMap[tipo] || 'attach_file';
    const fecha = ev.fecha_subida ? new Date(ev.fecha_subida).toLocaleDateString('es-MX') : '—';

    let iaBadge = '';
    if (ev.analisis_ia) {
      try {
        const ia = typeof ev.analisis_ia === 'string' ? JSON.parse(ev.analisis_ia) : ev.analisis_ia;
        const estado = ia.estado_cumplimiento || '';
        if (estado === 'CUMPLE')             iaBadge = `<div class="ia-badge cumple"><span class="material-icons-outlined" style="font-size:12px;">check_circle</span>Cumple</div>`;
        else if (estado === 'NO_CUMPLE')     iaBadge = `<div class="ia-badge no-cumple"><span class="material-icons-outlined" style="font-size:12px;">cancel</span>No cumple</div>`;
        else if (estado === 'REQUIERE_REVISION') iaBadge = `<div class="ia-badge revision"><span class="material-icons-outlined" style="font-size:12px;">manage_search</span>En revisión</div>`;
      } catch(e) {}
    } else {
      iaBadge = `<div class="ia-badge procesando"><span class="material-icons-outlined" style="font-size:12px;">hourglass_empty</span>Procesando IA</div>`;
    }

    return `
      <div class="ev-card">
        <div class="ev-icon ${tipo}"><span class="material-icons-outlined">${icono}</span></div>
        <div class="ev-nombre">${ev.nombre_archivo || 'Archivo'}</div>
        <div class="ev-fecha">${fecha}</div>
        ${iaBadge}
        <div class="ev-actions" style="margin-top:10px;">
          <a href="${ev.ruta_archivo}" target="_blank" class="btn-ev download">
            <span class="material-icons-outlined" style="font-size:13px;">download</span> Descargar
          </a>
        </div>
      </div>`;
  }).join('');
}

function setupFileInput() {
  const input = document.getElementById('fileInput');
  input.addEventListener('change', () => {
    if (input.files[0]) seleccionarArchivo(input.files[0]);
  });
}

function setupDrop() {
  const area = document.getElementById('dropArea');
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('drag');
    if (e.dataTransfer.files[0]) seleccionarArchivo(e.dataTransfer.files[0]);
  });
}

function seleccionarArchivo(file) {
  archivoActual = file;
  document.getElementById('nombreArchivo').textContent     = file.name;
  document.getElementById('archivoSeleccionado').style.display = 'block';
  document.getElementById('btnSubir').disabled             = false;
}

async function subirEvidencia() {
  const token = localStorage.getItem('token');
  if (!archivoActual || !reporteSeleccionado) return;

  const btn = document.getElementById('btnSubir');
  btn.disabled    = true;
  btn.textContent = 'Subiendo...';

  try {
    const form = new FormData();
    form.append('archivo', archivoActual);
    form.append('reporte_id', reporteSeleccionado);

    const res = await fetch(`${API_BASE}/api/evidencias/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.mensaje || 'Error al subir');
    }

    mostrarAlerta('success', 'Evidencia subida', 'La IA está analizando el archivo...');
    archivoActual = null;
    document.getElementById('archivoSeleccionado').style.display = 'none';
    document.getElementById('fileInput').value = '';

    await cargarEvidencias(token, reporteSeleccionado);

  } catch (err) {
    mostrarAlerta('danger', 'Error', err.message);
  } finally {
    btn.disabled    = false;
    btn.innerHTML   = '<span class="material-icons-outlined" style="font-size:16px;">upload</span> Subir evidencia';
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
  d.style.cssText = `background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border||cfg.bg};padding:13px 16px;border-radius:10px;display:flex;align-items:flex-start;gap:10px;animation:slideInRight .3s ease-out;min-width:270px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,.1);font-family:'Inter',sans-serif;font-size:13px;`;
  d.innerHTML = `<span class="material-icons-outlined" style="font-size:18px;flex-shrink:0;">${cfg.icono}</span><div style="flex:1;"><div style="font-weight:600;">${titulo}</div><div style="opacity:.85;">${mensaje}</div></div>`;
  document.getElementById('alertContainer').appendChild(d);
  setTimeout(() => { d.style.opacity='0'; d.style.transition='opacity .3s'; setTimeout(()=>d.remove(),300); }, 3500);
}