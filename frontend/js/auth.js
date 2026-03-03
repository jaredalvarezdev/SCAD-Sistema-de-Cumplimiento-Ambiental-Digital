const API_BASE = "http://localhost:3000";

document.addEventListener('DOMContentLoaded', () => {

  // ------------------- LOGIN -------------------
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const formData = Object.fromEntries(new FormData(loginForm));

      // Validación mínima
      if(!formData.email || !formData.password) {
        alert("Completa todos los campos");
        submitBtn.disabled = false;
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/usuarios/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.mensaje || "Error al iniciar sesión");
          return;
        }

        // Guardar token y usuario
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.user));

        // Redirección según rol
        const rol = data.user.rol_id;
        if (rol === 1) return window.location.href = '/admin-dashboard';
        if (rol === 2) return window.location.href = '/empresa-dashboard';
        if (rol === 3) return window.location.href = '/seleccion-empresa';

      } catch(err) {
        console.error(err);
        alert("Error al iniciar sesión");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // ------------------- REGISTRO -------------------
  const tipoCards = document.querySelectorAll('.tipo-usuario');
  const empresaFields = document.getElementById('empresaFields');
  const rolInput = document.getElementById('rol_id');

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

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const formDataRaw = new FormData(registerForm);
      const formData = Object.fromEntries(formDataRaw);
      formData.rol_id = Number(formData.rol_id);

      // Validación mínima
      if(!formData.nombre || !formData.email || !formData.password) {
        alert("Completa todos los campos obligatorios");
        submitBtn.disabled = false;
        return;
      }

      if(formData.rol_id !== 2) {
        delete formData.empresa_nombre;
        delete formData.empresa_rfc;
        delete formData.empresa_telefono;
        delete formData.empresa_direccion;
        formData.empresa_id = null; // para backend
      } else {
        formData.empresa_nombre = formData.empresa_nombre?.trim() || '';
        formData.empresa_rfc = formData.empresa_rfc?.trim() || '';
        formData.empresa_telefono = formData.empresa_telefono?.trim() || '';
        formData.empresa_direccion = formData.empresa_direccion?.trim() || '';
      }

      try {
        const res = await fetch(`${API_BASE}/api/usuarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result = await res.json();
        alert(result.mensaje || 'Usuario registrado');

        if(res.ok) {
          // Redirigir al login
          window.location.href = '/login';
        }

      } catch(err) {
        console.error(err);
        alert('Error al registrar usuario');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
});