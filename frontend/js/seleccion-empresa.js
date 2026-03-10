const API_BASE = "http://localhost:3000";

document.addEventListener('DOMContentLoaded', async () => {
  const empresaSelect = document.getElementById('empresaSelect');
  const empresaForm   = document.getElementById('empresaForm');

  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  if (!token || !usuario.rol_id) {
    window.location.href = '/login';
    return;
  }

  // Solo auditores sin empresa llegan aquí
  if (usuario.rol_id !== 3) {
    if (usuario.rol_id === 1) window.location.href = '/pages/admin/admin-dashboard.html';
    else if (usuario.rol_id === 2) window.location.href = '/pages/empresa/empresa-dashboard.html';
    return;
  }

  if (usuario.empresa_id) {
    window.location.href = '/pages/usuario/usuario-dashboard.html';
    return;
  }

  // Cargar empresas disponibles
  try {
    const res = await fetch(`${API_BASE}/api/empresas/disponibles`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Error al cargar empresas");

    const resultado = await res.json();
    const empresas  = Array.isArray(resultado) ? resultado : (resultado.data || []);

    // Opción por defecto
    const def = document.createElement('option');
    def.value    = '';
    def.textContent = '— Selecciona una empresa —';
    def.disabled = true;
    def.selected = true;
    empresaSelect.appendChild(def);

    if (empresas.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No hay empresas disponibles';
      opt.disabled = true;
      empresaSelect.appendChild(opt);
    } else {
      empresas.forEach(emp => {
        const opt = document.createElement('option');
        opt.value       = emp.id;
        opt.textContent = emp.nombre;
        empresaSelect.appendChild(opt);
      });
    }

  } catch (err) {
    console.error('Error cargando empresas:', err);
    empresaSelect.innerHTML = '<option disabled selected>Error al cargar empresas</option>';
  }

  // Enviar solicitud
  empresaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const empresaId = empresaSelect.value;
    if (!empresaId) return;

    const btn = empresaForm.querySelector('button[type="submit"]');
    btn.disabled    = true;
    btn.textContent = 'Enviando...';

    try {
      const res = await fetch(`${API_BASE}/api/solicitudes/empresa/${empresaId}/solicitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      // 409 = ya tiene solicitud pendiente → igual mandarlo a espera
      if (res.status === 409) {
        window.location.href = '/pages/usuario/espera.html';
        return;
      }

      if (!res.ok) {
        btn.disabled    = false;
        btn.textContent = 'Solicitar acceso';
        alert(data.mensaje || 'Error al enviar solicitud');
        return;
      }

      window.location.href = '/pages/usuario/espera.html';

    } catch (err) {
      console.error(err);
      btn.disabled    = false;
      btn.textContent = 'Solicitar acceso';
      alert('Error de conexión');
    }
  });
});