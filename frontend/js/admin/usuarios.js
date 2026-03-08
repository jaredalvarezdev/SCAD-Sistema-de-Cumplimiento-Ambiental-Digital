const API_BASE = "http://localhost:3000";

let accionActual = null;
let usuarioActual = null;
let usuariosData = [];
let empresasData = [];
let esAdmin = false;

/* =========================
   COLORES POR ROL
========================= */

const rolesColores = {
  1: { bg: '#DC2626', color: '#FFFFFF', nombre: 'Admin' },
  2: { bg: '#2563EB', color: '#FFFFFF', nombre: 'Empresa' },
  3: { bg: '#059669', color: '#FFFFFF', nombre: 'Auditor' }
};

document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!token || !usuario) {
    window.location.href = "/login.html";
    return;
  }

  // Detectar si el usuario logueado es Admin (rol_id === 1)
  esAdmin = usuario.rol_id === 1;

  document.getElementById("nombreUsuario").textContent = usuario.nombre;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login.html";
  });

  document.getElementById("btnAgregarUsuario").addEventListener("click", abrirModalAgregar);
  document.getElementById("btnCancelar").addEventListener("click", cerrarModal);
  document.getElementById("btnConfirmar").addEventListener("click", confirmarAccion);

  await Promise.all([
    cargarEmpresas(),
    cargarUsuarios()
  ]);

});


/* =========================
   ALERTAS
========================= */

function mostrarAlerta(tipo, titulo, mensaje, duracion = 4000) {
  const container = document.getElementById("alertContainer");

  const tiposConfig = {
    success: { bg: '#1B6B4F',                text: '#FFFFFF', border: '#1B6B4F' },
    danger:  { bg: 'rgba(220, 38, 38, 0.1)', text: '#DC2626', border: 'rgba(220, 38, 38, 0.2)' },
    warning: { bg: 'rgba(251, 191, 36, 0.1)',text: '#F59E0B', border: 'rgba(251, 191, 36, 0.2)' },
    info:    { bg: 'rgba(3, 102, 214, 0.1)', text: '#0366D6', border: 'rgba(3, 102, 214, 0.2)' }
  };

  const config = tiposConfig[tipo] || tiposConfig.info;

  const alertDiv = document.createElement("div");
  alertDiv.style.backgroundColor = config.bg;
  alertDiv.style.color = config.text;
  alertDiv.style.border = `1px solid ${config.border}`;
  alertDiv.style.padding = '16px';
  alertDiv.style.borderRadius = '8px';
  alertDiv.style.display = 'flex';
  alertDiv.style.gap = '12px';
  alertDiv.style.marginBottom = '12px';
  alertDiv.style.animation = 'slideInRight 0.3s ease-out';

  alertDiv.innerHTML = `
    <div style="font-weight: 600;">${titulo}</div>
    <div>${mensaje}</div>
  `;

  container.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.style.opacity = '0';
    alertDiv.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => alertDiv.remove(), 300);
  }, duracion);
}


/* =========================
   CARGAR EMPRESAS
========================= */

async function cargarEmpresas() {

  const token = localStorage.getItem("token");

  try {

    const res = await fetch(`${API_BASE}/api/empresas`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      empresasData = await res.json();

      const inputEmpresa = document.getElementById("inputEmpresa");
      inputEmpresa.innerHTML = '<option value="">Sin empresa asignada</option>' +
        empresasData.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    }

  } catch (error) {
    console.error("Error cargando empresas:", error);
  }

}


/* =========================
   CARGAR USUARIOS
========================= */

async function cargarUsuarios() {

  const token = localStorage.getItem("token");

  try {

    const res = await fetch(`${API_BASE}/api/usuarios`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    const usuarios = await res.json();
    usuariosData = usuarios;

    const tabla = document.getElementById("tbodyUsuarios");

    tabla.innerHTML = usuarios.map(user => {
      const rolInfo = rolesColores[user.rol_id];
      const estadoBg = user.activo ? '#1B6B4F' : '#6b7280';
      const estadoTexto = user.activo ? 'Activo' : 'Inactivo';

      return `
        <tr>
          <td>#${user.id}</td>
          <td style="font-weight: 600;">${user.nombre}</td>
          <td>${user.email}</td>
          <td>
            <span style="display: inline-block; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background-color: ${rolInfo.bg}; color: ${rolInfo.color};">
              ${rolInfo.nombre}
            </span>
          </td>
          <td>
            <span style="display: inline-block; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background-color: ${user.activo ? 'rgba(27, 107, 79, 0.1)' : '#f3f4f6'}; color: ${estadoBg};">
              ${estadoTexto}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button onclick="editarUsuario(${user.id})" style="padding: 8px 14px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151; transition: all 0.2s; min-width: 90px;">
                Editar
              </button>
              <button onclick="eliminarUsuario(${user.id})" style="padding: 8px 14px; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; color: #dc2626; transition: all 0.2s; min-width: 90px;">
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

  } catch (error) {
    console.error("Error cargando usuarios:", error);
    mostrarAlerta("danger", "Error", "No se pudieron cargar los usuarios");
  }

}


/* =========================
   MODAL - AGREGAR
========================= */

function abrirModalAgregar() {
  accionActual = "crear";
  usuarioActual = null;

  document.getElementById("modalTitulo").textContent = "Agregar Usuario";
  document.getElementById("modalTexto").textContent = "Completa los datos para crear un nuevo usuario.";
  document.getElementById("modalInputs").style.display = "block";

  // Campo empresa solo visible para admins
  document.getElementById("grupoEmpresa").style.display = esAdmin ? "block" : "none";

  limpiarFormulario();

  document.getElementById("modalConfirmacion").classList.add("active");
}


/* =========================
   MODAL - EDITAR
========================= */

function editarUsuario(id) {
  accionActual = "editar";
  usuarioActual = id;

  document.getElementById("modalTitulo").textContent = "Editar Usuario";
  document.getElementById("modalTexto").textContent = "Modifica los datos del usuario para actualizar la información.";
  document.getElementById("modalInputs").style.display = "block";

  // Campo empresa solo visible para admins
  document.getElementById("grupoEmpresa").style.display = esAdmin ? "block" : "none";

  const usuario = usuariosData.find(u => u.id === id);
  if (usuario) {
    document.getElementById("inputNombre").value = usuario.nombre;
    document.getElementById("inputEmail").value = usuario.email;
    document.getElementById("inputRol").value = usuario.rol_id;
    document.getElementById("inputActivo").value = usuario.activo;
    if (esAdmin) {
      document.getElementById("inputEmpresa").value = usuario.empresa_id || '';
    }
  }

  document.getElementById("modalConfirmacion").classList.add("active");
}


/* =========================
   MODAL - ELIMINAR
========================= */

function eliminarUsuario(id) {
  accionActual = "eliminar";
  usuarioActual = id;

  document.getElementById("modalTitulo").textContent = "Eliminar Usuario";
  document.getElementById("modalTexto").textContent = "Esta acción eliminará el usuario permanentemente de la base de datos. ¿Estás seguro de que deseas continuar?";
  document.getElementById("modalInputs").style.display = "none";

  document.getElementById("modalConfirmacion").classList.add("active");
}


/* =========================
   MODAL - CERRAR
========================= */

function cerrarModal() {
  document.getElementById("modalConfirmacion").classList.remove("active");
}


/* =========================
   LIMPIAR FORMULARIO
========================= */

function limpiarFormulario() {
  document.getElementById("inputNombre").value = '';
  document.getElementById("inputEmail").value = '';
  document.getElementById("inputRol").value = '1';
  document.getElementById("inputActivo").value = 'true';
  document.getElementById("inputEmpresa").value = '';
}


/* =========================
   CONFIRMAR
========================= */

async function confirmarAccion() {

  if (accionActual === "eliminar") {
    await confirmarEliminar();
  } else if (accionActual === "editar") {
    await confirmarEditar();
  } else if (accionActual === "crear") {
    await confirmarCrear();
  }

  cerrarModal();

}


/* =========================
   CREAR USUARIO
========================= */

async function confirmarCrear() {

  const token = localStorage.getItem("token");
  const nombre   = document.getElementById("inputNombre").value.trim();
  const email    = document.getElementById("inputEmail").value.trim();
  const rol_id   = parseInt(document.getElementById("inputRol").value);
  const activo   = document.getElementById("inputActivo").value === "true";
  const empresa_id = esAdmin ? (document.getElementById("inputEmpresa").value || null) : null;

  if (!nombre) { mostrarAlerta("warning", "Validación", "El nombre del usuario es requerido"); return; }
  if (!email)  { mostrarAlerta("warning", "Validación", "El email es requerido"); return; }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) { mostrarAlerta("warning", "Validación", "El email no tiene un formato válido"); return; }

  try {

    const res = await fetch(`${API_BASE}/api/usuarios`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        email,
        rol_id,
        activo,
        empresa_id: empresa_id ? parseInt(empresa_id) : null
      })
    });

    if (res.ok) {
      mostrarAlerta("success", "Éxito", "Usuario creado correctamente");
      setTimeout(() => cargarUsuarios(), 500);
    } else {
      const errorData = await res.json();
      mostrarAlerta("danger", "Error", errorData.mensaje || "Error al crear el usuario");
    }

  } catch (error) {
    console.error("Error creando usuario:", error);
    mostrarAlerta("danger", "Error", "Error al crear el usuario");
  }

}


/* =========================
   EDITAR USUARIO
========================= */

async function confirmarEditar() {

  const token = localStorage.getItem("token");
  const nombre   = document.getElementById("inputNombre").value.trim();
  const email    = document.getElementById("inputEmail").value.trim();
  const rol_id   = parseInt(document.getElementById("inputRol").value);
  const activo   = document.getElementById("inputActivo").value === "true";
  const empresa_id = esAdmin ? (document.getElementById("inputEmpresa").value || null) : null;

  if (!nombre) { mostrarAlerta("warning", "Validación", "El nombre del usuario es requerido"); return; }
  if (!email)  { mostrarAlerta("warning", "Validación", "El email es requerido"); return; }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) { mostrarAlerta("warning", "Validación", "El email no tiene un formato válido"); return; }

  try {

    const res = await fetch(`${API_BASE}/api/usuarios/${usuarioActual}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        email,
        rol_id,
        activo,
        empresa_id: empresa_id ? parseInt(empresa_id) : null
      })
    });

    if (res.ok) {
      mostrarAlerta("success", "Éxito", "Usuario actualizado correctamente");
      setTimeout(() => cargarUsuarios(), 500);
    } else {
      const errorData = await res.json();
      mostrarAlerta("danger", "Error", errorData.mensaje || "Error al actualizar el usuario");
    }

  } catch (error) {
    console.error("Error editando usuario:", error);
    mostrarAlerta("danger", "Error", "Error al editar el usuario");
  }

}


/* =========================
   ELIMINAR USUARIO
========================= */

async function confirmarEliminar() {

  const token = localStorage.getItem("token");

  try {

    const res = await fetch(`${API_BASE}/api/usuarios/${usuarioActual}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      mostrarAlerta("success", "Éxito", "Usuario eliminado correctamente");
      setTimeout(() => cargarUsuarios(), 500);
    } else {
      try {
        const errorData = await res.json();
        mostrarAlerta("danger", "Error", errorData.mensaje || errorData.message || "Error al eliminar el usuario");
      } catch {
        let mensajeError = "Error al eliminar el usuario";
        if (res.status === 403)      mensajeError = "No tienes permisos para eliminar este usuario";
        else if (res.status === 404) mensajeError = "El usuario no existe";
        else if (res.status === 401) mensajeError = "Tu sesión ha expirado. Vuelve a iniciar sesión.";
        else if (res.status === 500) mensajeError = "Error interno del servidor";
        mostrarAlerta("danger", "Error", mensajeError);
      }
    }

  } catch (error) {
    console.error("Error eliminando usuario:", error);
    mostrarAlerta("danger", "Error", "Error al eliminar el usuario");
  }

}