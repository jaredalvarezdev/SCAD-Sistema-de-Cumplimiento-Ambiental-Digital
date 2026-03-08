const API_BASE = "http://localhost:3000";

/* =========================
   ALERTAS
========================= */
function mostrarAlerta(tipo, titulo, mensaje, duracion = 4000) {
  const container = document.getElementById("alertContainer");
  if (!container) return;

  const tiposConfig = {
    success: { bg: '#1B6B4F',                 text: '#FFFFFF', border: '#1B6B4F' },
    danger:  { bg: 'rgba(220, 38, 38, 0.1)',  text: '#DC2626', border: 'rgba(220, 38, 38, 0.2)' },
    warning: { bg: 'rgba(251, 191, 36, 0.1)', text: '#F59E0B', border: 'rgba(251, 191, 36, 0.2)' },
    info:    { bg: 'rgba(3, 102, 214, 0.1)',  text: '#0366D6', border: 'rgba(3, 102, 214, 0.2)' }
  };

  const config = tiposConfig[tipo] || tiposConfig.info;
  const alertDiv = document.createElement("div");
  alertDiv.style.cssText = `background-color:${config.bg};color:${config.text};border:1px solid ${config.border};padding:16px;border-radius:8px;display:flex;gap:12px;margin-bottom:12px;animation:slideInRight 0.3s ease-out;min-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.1);`;
  alertDiv.innerHTML = `<div style="font-weight:600;">${titulo}</div><div>${mensaje}</div>`;
  container.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.style.opacity = '0';
    alertDiv.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => alertDiv.remove(), 300);
  }, duracion);
}


/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", async () => {

  const token   = localStorage.getItem("token");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!token || !usuario) {
    window.location.href = "/login.html";
    return;
  }

  document.getElementById("nombreUsuario").textContent = usuario.nombre || usuario.email;

  if (usuario.empresa_id) {
    await cargarNombreEmpresa(token, usuario.empresa_id);
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login.html";
  });

  await Promise.all([
    cargarCards(token, usuario.empresa_id),
    cargarReportes(token)
  ]);

});


/* =========================
   NOMBRE EMPRESA
========================= */
async function cargarNombreEmpresa(token, empresa_id) {
  try {
    const res = await fetch(`${API_BASE}/api/empresas/${empresa_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const empresa = await res.json();
      document.getElementById("nombreEmpresa").textContent = empresa.nombre;
    }
  } catch (err) {
    console.error("Error cargando empresa:", err);
  }
}


/* =========================
   CARDS
========================= */
async function cargarCards(token, empresa_id) {
  try {
    const res = await fetch(`${API_BASE}/api/reportes/estadisticas/empresa/${empresa_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();

    document.getElementById("reportesPendientes").textContent = data.pendientes ?? 0;
    document.getElementById("reportesAprobados").textContent  = data.aprobados  ?? 0;
    document.getElementById("reportesRechazados").textContent = data.rechazados ?? 0;
    document.getElementById("totalEvidencias").textContent    = data.evidencias ?? 0;

  } catch (err) {
    console.error("Error cargando cards:", err);
    mostrarAlerta("danger", "Error", "No se pudieron cargar las estadísticas");
  }
}


/* =========================
   TABLA REPORTES
========================= */
async function cargarReportes(token) {
  try {
    const res = await fetch(`${API_BASE}/api/reportes?limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    const json     = await res.json();
    const reportes = json.data || [];
    const tabla    = document.getElementById("tablaReportes");

    if (!reportes.length) {
      tabla.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#999;">No hay reportes aún</td></tr>`;
      return;
    }

    const estadoConfig = {
      1: { label: 'Pendiente',   bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
      2: { label: 'En revisión', bg: 'rgba(37,99,235,0.1)',  color: '#2563EB' },
      3: { label: 'Aprobado',    bg: 'rgba(27,107,79,0.1)',  color: '#1B6B4F' },
      4: { label: 'Rechazado',   bg: 'rgba(220,38,38,0.1)',  color: '#DC2626' }
    };

    tabla.innerHTML = reportes.map(r => {
      const cfg   = estadoConfig[r.estado_id] || estadoConfig[1];
      const fecha = r.fecha_creacion
        ? new Date(r.fecha_creacion).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
        : '—';

      return `
        <tr>
          <td>#${r.id}</td>
          <td style="font-weight:600;text-align:left;">${r.titulo || 'Sin título'}</td>
          <td>${fecha}</td>
          <td>
            <span style="display:inline-block;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:600;background:${cfg.bg};color:${cfg.color};">
              ${cfg.label}
            </span>
          </td>
          <td>
            <a href="/pages/empresa/mis-reportes.html?id=${r.id}"
              style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;color:#374151;text-decoration:none;transition:all 0.2s;"
              onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
              <span class="material-icons-outlined" style="font-size:15px;">open_in_new</span>
              Ver reporte
            </a>
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("Error cargando reportes:", err);
    mostrarAlerta("danger", "Error", "No se pudieron cargar los reportes");
  }
}