const API_BASE = 'http://localhost:3000';

let historialData = [];

const accionConfig = {
  crear:          { icono: 'add_circle',    dotClass: 'dot-crear',          label: 'Creación'       },
  editar:         { icono: 'edit',          dotClass: 'dot-editar',         label: 'Edición'        },
  eliminar:       { icono: 'delete',        dotClass: 'dot-eliminar',       label: 'Eliminación'    },
  cambiar_estado: { icono: 'swap_horiz',    dotClass: 'dot-cambiar_estado', label: 'Cambio estado'  },
  subir:          { icono: 'upload_file',   dotClass: 'dot-subir',          label: 'Subida archivo' },
  observacion:    { icono: 'comment',       dotClass: 'dot-observacion',    label: 'Observación'    }
};

const tablaConfig = {
  reportes:   { clase: 'tabla-reportes',   label: 'Reportes'   },
  evidencias: { clase: 'tabla-evidencias', label: 'Evidencias' },
  usuarios:   { clase: 'tabla-usuarios',   label: 'Usuarios'   },
  empresas:   { clase: 'tabla-empresas',   label: 'Empresas'   },
  auditorias: { clase: 'tabla-auditorias', label: 'Auditorías' }
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

  document.getElementById('inputBusqueda').addEventListener('input', () => aplicarFiltros());

  await cargarHistorial();
});

// ── Cargar historial ──────────────────────────────────────────────────────────

async function cargarHistorial() {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_BASE}/api/historial?limit=300`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Error al cargar');

    historialData = await res.json();
    aplicarFiltros();

  } catch {
    document.getElementById('timelineContainer').innerHTML = `
      <div class="empty-state">
        <span class="material-icons-outlined">error_outline</span>
        <p>Error al cargar la actividad</p>
      </div>`;
  }
}

// ── Filtros ───────────────────────────────────────────────────────────────────

function aplicarFiltros() {
  const busqueda = document.getElementById('inputBusqueda').value.toLowerCase().trim();
  const tabla    = document.getElementById('filtroTabla').value;
  const accion   = document.getElementById('filtroAccion').value;

  let lista = historialData;

  if (tabla)   lista = lista.filter(h => h.tabla_afectada === tabla);
  if (accion)  lista = lista.filter(h => h.accion === accion);

  if (busqueda) {
    lista = lista.filter(h =>
      (h.descripcion_detallada && h.descripcion_detallada.toLowerCase().includes(busqueda)) ||
      (h.usuarios?.nombre && h.usuarios.nombre.toLowerCase().includes(busqueda))
    );
  }

  const contador = document.getElementById('contadorResultados');
  contador.textContent = lista.length
    ? `${lista.length} registro${lista.length !== 1 ? 's' : ''}`
    : '';

  renderizarTimeline(lista);
}

// ── Renderizar timeline ───────────────────────────────────────────────────────

function renderizarTimeline(items) {
  const container = document.getElementById('timelineContainer');

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-outlined">search_off</span>
        <p>No se encontraron registros con esos filtros</p>
      </div>`;
    return;
  }

  // Agrupar por día
  const grupos = {};
  items.forEach(item => {
    const fecha = new Date(item.fecha);
    const hoy   = new Date();
    const ayer  = new Date(); ayer.setDate(ayer.getDate() - 1);

    let diaKey;
    if (fecha.toDateString() === hoy.toDateString()) {
      diaKey = 'Hoy';
    } else if (fecha.toDateString() === ayer.toDateString()) {
      diaKey = 'Ayer';
    } else {
      diaKey = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      diaKey = diaKey.charAt(0).toUpperCase() + diaKey.slice(1);
    }

    if (!grupos[diaKey]) grupos[diaKey] = [];
    grupos[diaKey].push(item);
  });

  let html = '';

  Object.entries(grupos).forEach(([dia, registros]) => {
    html += `
      <div style="margin-bottom:8px;margin-top:20px;">
        <span style="font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;">${dia}</span>
      </div>
      <div class="timeline">
    `;

    registros.forEach(item => {
      const cfg      = accionConfig[item.accion] || { icono: 'circle', dotClass: 'dot-default', label: item.accion };
      const tblCfg   = tablaConfig[item.tabla_afectada] || { clase: 'tabla-general', label: item.tabla_afectada || 'Sistema' };
      const hora     = new Date(item.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      const usuario  = item.usuarios?.nombre || 'Sistema';

      html += `
        <div class="timeline-item">
          <div class="timeline-dot ${cfg.dotClass}">
            <span class="material-icons-outlined">${cfg.icono}</span>
          </div>
          <div class="timeline-card">
            <div class="timeline-header">
              <div class="timeline-descripcion">${item.descripcion_detallada || '—'}</div>
              <div class="timeline-fecha">${hora}</div>
            </div>
            <div class="timeline-meta">
              <span class="badge-tabla ${tblCfg.clase}">${tblCfg.label}</span>
              <span class="badge-tabla tabla-general">${cfg.label}</span>
              <span class="timeline-usuario">
                <span class="material-icons-outlined" style="font-size:13px;">person</span>
                ${usuario}
              </span>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  });

  container.innerHTML = html;
}