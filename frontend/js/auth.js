const API_BASE = "http://localhost:3000";

/* =========================
   ALERTAS
========================= */
function mostrarAlerta(tipo, titulo, mensaje, duracion = 4000) {
  let container = document.getElementById("alertContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "alertContainer";
    container.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px; max-width: 360px;
    `;
    document.body.appendChild(container);
  }

  const tiposConfig = {
    success: { bg: '#1B6B4F',                  text: '#FFFFFF', border: '#1B6B4F' },
    danger:  { bg: 'rgba(220, 38, 38, 0.95)',  text: '#FFFFFF', border: '#DC2626' },
    warning: { bg: 'rgba(245, 158, 11, 0.95)', text: '#FFFFFF', border: '#F59E0B' },
    info:    { bg: 'rgba(3, 102, 214, 0.95)',  text: '#FFFFFF', border: '#0366D6' }
  };

  const config = tiposConfig[tipo] || tiposConfig.info;

  const alertDiv = document.createElement("div");
  alertDiv.style.cssText = `
    background: ${config.bg};
    color: ${config.text};
    border: 1px solid ${config.border};
    padding: 14px 16px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease-out;
  `;

  alertDiv.innerHTML = `
    <div style="font-weight: 700; font-size: 14px;">${titulo}</div>
    <div style="font-size: 13px; opacity: 0.9;">${mensaje}</div>
  `;

  container.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.style.opacity = '0';
    alertDiv.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => alertDiv.remove(), 300);
  }, duracion);
}


document.addEventListener('DOMContentLoaded', () => {

  // ------------------- LOGIN -------------------
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const formData = Object.fromEntries(new FormData(loginForm));

      if (!formData.email || !formData.password) {
        mostrarAlerta("warning", "Campos incompletos", "Completa todos los campos");
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
          mostrarAlerta("danger", "Error", data.mensaje || "Error al iniciar sesión");
          return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.user));

        mostrarAlerta("success", "Bienvenido", `Hola, ${data.user.nombre}`);

        setTimeout(() => {
          const rol = data.user.rol_id;
          if (rol === 1) window.location.href = '/admin-dashboard';
          if (rol === 2) window.location.href = '/empresa-dashboard';
          if (rol === 3) window.location.href = '/seleccion-empresa';
        }, 1000);

      } catch (err) {
        console.error(err);
        mostrarAlerta("danger", "Error", "Error al iniciar sesión");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }


  // ------------------- SELECTOR TIPO USUARIO -------------------
  const tipoCards     = document.querySelectorAll('.tipo-usuario');
  const empresaFields = document.getElementById('empresaFields');
  const rolInput      = document.getElementById('rol_id');

  tipoCards.forEach(card => {
    card.addEventListener('click', () => {
      tipoCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      if (card.dataset.tipo === 'empresa') {
        empresaFields.classList.remove('hidden');
        rolInput.value = 2;
      } else {
        empresaFields.classList.add('hidden');
        rolInput.value = 3;
      }
    });
  });


  // ------------------- REGISTRO -------------------
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const formDataRaw = new FormData(registerForm);
      const formData    = Object.fromEntries(formDataRaw);
      formData.rol_id   = Number(formData.rol_id);

      if (!formData.nombre || !formData.email || !formData.password) {
        mostrarAlerta("warning", "Campos incompletos", "Completa todos los campos obligatorios");
        submitBtn.disabled = false;
        return;
      }

      if (formData.rol_id === 2) {
        if (!formData.empresa_nombre || !formData.empresa_rfc) {
          mostrarAlerta("warning", "Datos de empresa", "El nombre y RFC de la empresa son obligatorios");
          submitBtn.disabled = false;
          return;
        }

        // El backend espera los campos sueltos, no un objeto anidado
        // empresa_nombre, empresa_rfc, empresa_direccion, empresa_telefono,
        // empresa_ciudad, empresa_tipo ya vienen del form como campos sueltos — no hay que tocarlos
        formData.empresa_estado = 'activa';

      } else {
        // Limpiar campos empresa si es solo usuario
        delete formData.empresa_nombre;
        delete formData.empresa_rfc;
        delete formData.empresa_telefono;
        delete formData.empresa_ciudad;
        delete formData.empresa_direccion;
        delete formData.empresa_tipo;
        formData.empresa_id = null;
      }

      try {
        const res = await fetch(`${API_BASE}/api/usuarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result = await res.json();

        if (res.ok) {
          mostrarAlerta("success", "Cuenta creada", result.mensaje || "Usuario registrado correctamente");
          setTimeout(() => window.location.href = '/login', 1500);
        } else {
          mostrarAlerta("danger", "Error", result.mensaje || "Error al registrar usuario");
        }

      } catch (err) {
        console.error(err);
        mostrarAlerta("danger", "Error", "Error al registrar usuario");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

});