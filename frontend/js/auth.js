const API_BASE = "http://localhost:3000"; // tu backend

document.addEventListener('DOMContentLoaded', () => {
  const tipoCards = document.querySelectorAll('.tipo-usuario');
  const empresaFields = document.getElementById('empresaFields');
  const rolInput = document.getElementById('rol_id');

  // Alternar campos de empresa
  tipoCards.forEach(card => {
    card.addEventListener('click', () => {
      tipoCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      if(card.dataset.tipo === 'empresa') {
        empresaFields.classList.remove('hidden');
        rolInput.value = 2;
      } else {
        empresaFields.classList.add('hidden');
        rolInput.value = 3;
      }
    });
  });

  // Enviar formulario
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formDataRaw = new FormData(e.target);
    const formData = Object.fromEntries(formDataRaw);
    formData.rol_id = Number(formData.rol_id);

    if(formData.rol_id === 2) {
      formData.empresa_nombre = formData.empresa_nombre?.trim() || '';
      formData.empresa_rfc = formData.empresa_rfc?.trim() || '';
      formData.empresa_telefono = formData.empresa_telefono?.trim() || '';
      formData.empresa_direccion = formData.empresa_direccion?.trim() || '';
    } else {
      delete formData.empresa_nombre;
      delete formData.empresa_rfc;
      delete formData.empresa_telefono;
      delete formData.empresa_direccion;
    }

    try {
      const res = await fetch(`${API_BASE}/api/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const text = await res.text();
      let result;
      try { result = JSON.parse(text); } catch { result = { mensaje: text }; }

      alert(result.mensaje || 'Usuario registrado');
      if(res.ok) window.location.href = '/public/login.html';
    } catch(err) {
      console.error(err);
      alert('Error al registrar usuario');
    }
  });
});