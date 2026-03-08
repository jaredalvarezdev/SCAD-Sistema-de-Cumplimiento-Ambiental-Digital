const API_BASE = "http://localhost:3000";

document.addEventListener('DOMContentLoaded', async () => {
  const empresaSelect = document.getElementById('empresaSelect');
  const empresaForm = document.getElementById('empresaForm');

  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  if (!token || !usuario.rol_id) {
    window.location.href = '/login';
    return;
  }

  if (usuario.rol_id !== 3) {
    if (usuario.rol_id === 1) window.location.href = '/pages/admin/admin-dashboard.html';
    else if (usuario.rol_id === 2) window.location.href = '/pages/empresa/empresa-dashboard.html';
    return;
  }

  // Cargar empresas
  try {
    const res = await fetch(`${API_BASE}/api/empresas/disponibles`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Error al cargar empresas");

    const empresas = await res.json();
    if (empresas.length === 0) {
      const option = document.createElement('option');
      option.textContent = "No hay empresas disponibles";
      option.disabled = true;
      option.selected = true;
      empresaSelect.appendChild(option);
    } else {
      empresas.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.nombre;
        empresaSelect.appendChild(option);
      });
    }
  } catch(err) {
    console.error(err);
  }

  // Solicitar acceso
  empresaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const empresaId = empresaSelect.value;
    if (!empresaId) return;

    try {
      await fetch(`${API_BASE}/api/solicitudes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ usuario_id: usuario.id, empresa_id: empresaId })
      });

      // Guardar flag en localStorage para mostrar mensaje en espera.html
      localStorage.setItem('solicitudEnviada', 'true');

      // Redirigir a pantalla de espera
      window.location.href = '/pages/usuario/espera.html';
    } catch(err) {
      console.error(err);
    }
  });
});