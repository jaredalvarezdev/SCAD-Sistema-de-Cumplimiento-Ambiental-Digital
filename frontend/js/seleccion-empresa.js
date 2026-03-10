const API_BASE = "http://localhost:3000";

document.addEventListener('DOMContentLoaded', async () => {
  const empresaSelect = document.getElementById('empresaSelect');
  const empresaForm   = document.getElementById('empresaForm');
  const token         = localStorage.getItem('token');
  const usuario       = JSON.parse(localStorage.getItem('usuario') || '{}');

  if (!token || !usuario.rol_id) {
    window.location.href = '/login.html';
    return;
  }

  // Si ya tiene empresa asignada, no debe estar aquí
  if (usuario.empresa_id) {
    window.location.href = '/pages/usuario/usuario-dashboard.html';
    return;
  }

  if (usuario.rol_id === 1) { window.location.href = '/pages/admin/admin-dashboard.html'; return; }
  if (usuario.rol_id === 2) { window.location.href = '/pages/empresa/empresa-dashboard.html'; return; }

  // Cargar todas las empresas
  try {
    const res = await fetch(`${API_BASE}/api/empresas`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Error al cargar empresas');

    const resultado = await res.json();
    // La API devuelve { data: [...] } o directamente el array
    const empresas = Array.isArray(resultado) ? resultado : (resultado.data || []);

    if (empresas.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No hay empresas disponibles';
      opt.disabled = true;
      opt.selected = true;
      empresaSelect.appendChild(opt);
    } else {
      // Opción por defecto
      const def = document.createElement('option');
      def.value = '';
      def.textContent = '— Selecciona una empresa —';
      def.disabled = true;
      def.selected = true;
      empresaSelect.appendChild(def);

      empresas.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.nombre;
        empresaSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error(err);
    empresaSelect.innerHTML = '<option disabled selected>Error al cargar empresas</option>';
  }

  // Enviar solicitud
  empresaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const empresaId = empresaSelect.value;
    if (!empresaId) return;

    const btn = empresaForm.querySelector('button[type="submit"]');
    btn.disabled = true;
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

      if (res.status === 409) {
        // Ya tiene solicitud pendiente → ir directo a espera
        localStorage.setItem('solicitudEnviada', 'pendiente');
        window.location.href = '/pages/usuario/espera.html';
        return;
      }

      if (!res.ok) {
        btn.disabled = false;
        btn.textContent = 'Solicitar acceso';
        alert(data.mensaje || 'Error al enviar solicitud');
        return;
      }

      localStorage.setItem('solicitudEnviada', 'true');
      window.location.href = '/pages/usuario/espera.html';

    } catch (err) {
      console.error(err);
      btn.disabled = false;
      btn.textContent = 'Solicitar acceso';
      alert('Error de conexión');
    }
  });
});