const API_BASE = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  // Protección de ruta
  if (!token || !usuario) { window.location.href = '/login'; return; }
  if (usuario.rol_id !== 3) { window.location.href = '/login'; return; }
  if (!usuario.empresa_id)  { window.location.href = '/seleccion-empresa'; return; }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login';
  });

  // Nombre en topbar y welcome
  document.getElementById('nombreUsuario').textContent = usuario.nombre || usuario.email;
  document.getElementById('welcomeNombre').textContent = `Bienvenido, ${usuario.nombre || 'Auditor'}`;

  // Nombre de empresa
  try {
    const resEmp = await fetch(`${API_BASE}/api/empresas/${usuario.empresa_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resEmp.ok) {
      const emp = await resEmp.json();
      document.getElementById('nombreEmpresa').textContent   = emp.nombre || '';
      document.getElementById('welcomeEmpresa').textContent  = `Auditando los reportes de ${emp.nombre}`;
    }
  } catch (e) {}

  // Cargar datos
  await Promise.all([
    cargarReportes(token, usuario.empresa_id),
    cargarNotificaciones(token)
  ]);
});

// ── Cargar reportes de la empresa ─────────────────────────────────────────────
async function cargarReportes(token, empresaId) {
  try {
    const res = await fetch(`${API_BASE}/api/reportes/empresa/${empresaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error();

    const reportes = await res.json();
    const lista    = Array.isArray(reportes) ? reportes : (reportes.data || []);

    // Contadores
    const pendientes  = lista.filter(r => r.estado === 'pendiente').length;
    const aprobados   = lista.filter(r => r.estado === 'aprobado').length;
    const rechazados  = lista.filter(r => r.estado === 'rechazado').length;

    document.getElementById('reportesPendientes').textContent = pendientes;
    document.getElementById('reportesAprobados').textContent  = aprobados;
    document.getElementById('reportesRechazados').textContent = rechazados;

    // Tabla — últimos 10
    const tbody = document.getElementById('tablaReportes');
    const ultimos = lista.slice(0, 10);

    if (ultimos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:40px 20px;color:#94a3b8;">
            No hay reportes disponibles
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = ultimos.map(r => {
      const fecha  = r.creado_en ? new Date(r.creado_en).toLocaleDateString('es-MX') : '—';
      const estado = r.estado || 'pendiente';
      const badges = {
        pendiente: 'pendiente',
        aprobado:  'aprobado',
        rechazado: 'rechazado',
        revision:  'revision',
      };
      const badgeClass = badges[estado] || 'pendiente';
      const estadoLabel = {
        pendiente: 'Pendiente',
        aprobado:  'Aprobado',
        rechazado: 'Rechazado',
        revision:  'En revisión',
      }[estado] || estado;

      return `
        <tr style="animation: fadeIn .3s ease;">
          <td>${r.id}</td>
          <td>${r.titulo || r.tipo_residuo || '—'}</td>
          <td>${fecha}</td>
          <td><span class="badge-estado ${badgeClass}">${estadoLabel}</span></td>
          <td>
            <a href="/pages/usuario/reportes.html?id=${r.id}" class="btn-ver">
              <span class="material-icons-outlined" style="font-size:13px;">visibility</span>
              Ver
            </a>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    document.getElementById('reportesPendientes').textContent = '—';
    document.getElementById('reportesAprobados').textContent  = '—';
    document.getElementById('reportesRechazados').textContent = '—';
    document.getElementById('tablaReportes').innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:40px 20px;color:#dc2626;">
          Error al cargar reportes
        </td>
      </tr>`;
  }
}

// ── Cargar notificaciones sin leer ────────────────────────────────────────────
async function cargarNotificaciones(token) {
  try {
    const res = await fetch(`${API_BASE}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();

    const notis   = await res.json();
    const noLeidas = notis.filter(n => !n.leido).length;

    document.getElementById('notificacionesNuevas').textContent = noLeidas;

    // Badge sidebar
    const badge = document.getElementById('notiCount');
    if (badge) {
      badge.textContent    = noLeidas;
      badge.style.display  = noLeidas > 0 ? 'inline-block' : 'none';
    }
  } catch (e) {
    document.getElementById('notificacionesNuevas').textContent = '—';
  }
}