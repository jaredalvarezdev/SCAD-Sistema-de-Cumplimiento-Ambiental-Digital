const API_BASE = "http://localhost:3000";

let accionActual = null;
let usuarioActual = null;
let usuariosData = [];

/* =========================
   COLORES POR ROL
========================= */

const rolesColores = {
  1: { bg: '#DC2626', color: '#FFFFFF', nombre: 'Admin' },      // Rojo
  2: { bg: '#2563EB', color: '#FFFFFF', nombre: 'Empresa' },    // Azul
  3: { bg: '#059669', color: '#FFFFFF', nombre: 'Auditor' }     // Verde
};

document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!token || !usuario) {
    window.location.href = "/login.html";
    return;
  }

  const nombreUsuarioEl = document.getElementById("nombreUsuario");
  const logoutBtnEl = document.getElementById("logoutBtn");
  const btnCancelarEl = document.getElementById("btnCancelar");
  const btnConfirmarEl = document.getElementById("btnConfirmar");

  if (nombreUsuarioEl) nombreUsuarioEl.textContent = usuario.nombre;

  if (logoutBtnEl) {
    logoutBtnEl.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "/login.html";
    });
  }

  if (btnCancelarEl) btnCancelarEl.addEventListener("click", cerrarModal);
  if (btnConfirmarEl) btnConfirmarEl.addEventListener("click", confirmarAccion);

  await cargarDashboard();

});


/* =========================
   ALERTAS
========================= */

function mostrarAlerta(tipo, titulo, mensaje, duracion = 4000) {
  const container = document.getElementById("alertContainer");
  
  if (!container) return;

  const tiposConfig = {
    success: {
      bg: '#1B6B4F',
      text: '#FFFFFF',
      border: '#1B6B4F'
    },
    danger: {
      bg: 'rgba(220, 38, 38, 0.1)',
      text: '#DC2626',
      border: 'rgba(220, 38, 38, 0.2)'
    },
    warning: {
      bg: 'rgba(251, 191, 36, 0.1)',
      text: '#F59E0B',
      border: 'rgba(251, 191, 36, 0.2)'
    },
    info: {
      bg: 'rgba(3, 102, 214, 0.1)',
      text: '#0366D6',
      border: 'rgba(3, 102, 214, 0.2)'
    }
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
   DASHBOARD
========================= */

async function cargarDashboard(){

  await Promise.all([
    cargarUsuarios(),
    cargarCards()
  ]);

}


/* =========================
   CARDS
========================= */

async function cargarCards(){

  const token = localStorage.getItem("token");

  try{

    const res = await fetch(`${API_BASE}/api/reportes/estadisticas`,{
      headers:{ Authorization:`Bearer ${token}` }
    });

    if(!res.ok) return;

    const data = await res.json();

    const totalUsuariosEl = document.getElementById("totalUsuarios");
    const totalEmpresasEl = document.getElementById("totalEmpresas");
    const totalReportesEl = document.getElementById("totalReportes");
    const totalAuditoriasEl = document.getElementById("totalAuditorias");

    if (totalUsuariosEl) totalUsuariosEl.textContent = data.totalUsuarios ?? 0;
    if (totalEmpresasEl) totalEmpresasEl.textContent = data.totalEmpresas ?? 0;
    if (totalReportesEl) totalReportesEl.textContent = data.totalReportes ?? 0;
    if (totalAuditoriasEl) totalAuditoriasEl.textContent = data.totalAuditorias ?? 0;

  }catch(error){
    console.error("Error cargando cards:", error);
    mostrarAlerta("danger", "Error", "No se pudieron cargar las estadísticas");
  }

}


/* =========================
   CARGAR USUARIOS
========================= */

async function cargarUsuarios(){

  const token = localStorage.getItem("token");

  try{

    const res = await fetch(`${API_BASE}/api/usuarios`,{
      headers:{ Authorization:`Bearer ${token}` }
    });

    if(!res.ok) return;

    const usuarios = await res.json();
    usuariosData = usuarios;

    const tabla = document.getElementById("tablaUsuarios");

    if (!tabla) return;

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

  }catch(error){
    console.error("Error cargando usuarios:", error);
    mostrarAlerta("danger", "Error", "No se pudieron cargar los usuarios");
  }

}


/* =========================
   MODAL
========================= */

function abrirModal(titulo, texto, accion, id){

  accionActual = accion;
  usuarioActual = id;

  const modalTitulo = document.getElementById("modalTitulo");
  const modalTexto = document.getElementById("modalTexto");
  const modalInputs = document.getElementById("modalInputs");

  if (modalTitulo) modalTitulo.textContent = titulo;
  if (modalTexto) modalTexto.textContent = texto;

  const modal = document.getElementById("modalConfirmacion");
  if (modal) modal.classList.add("active");

  // Si es editar, mostrar los inputs y cargar datos
  if(accion === "editar") {
    const usuario = usuariosData.find(u => u.id === id);
    if(usuario && modalInputs) {
      modalInputs.style.display = "block";
      const inputNombre = document.getElementById("inputNombre");
      const inputEmail = document.getElementById("inputEmail");
      const inputRol = document.getElementById("inputRol");
      const inputActivo = document.getElementById("inputActivo");

      if (inputNombre) inputNombre.value = usuario.nombre;
      if (inputEmail) inputEmail.value = usuario.email;
      if (inputRol) inputRol.value = usuario.rol_id;
      if (inputActivo) inputActivo.value = usuario.activo;
    }
  } else {
    // Si es eliminar, ocultar los inputs
    if (modalInputs) modalInputs.style.display = "none";
  }

}

function cerrarModal(){

  const modal = document.getElementById("modalConfirmacion");
  if (modal) modal.classList.remove("active");

}


/* =========================
   ACCIONES
========================= */

function editarUsuario(id){

  abrirModal(
    "Editar usuario",
    "Modifica los datos del usuario para actualizar la información.",
    "editar",
    id
  );

}

function eliminarUsuario(id){

  abrirModal(
    "Eliminar usuario",
    "Esta acción eliminará el usuario permanentemente de la base de datos. ¿Estás seguro de que deseas continuar?",
    "eliminar",
    id
  );

}


/* =========================
   CONFIRMAR
========================= */

async function confirmarAccion(){

  if(accionActual === "eliminar"){
    await confirmarEliminar();
  } else if(accionActual === "editar"){
    await confirmarEditar();
  }

  cerrarModal();

}


/* =========================
   EDITAR
========================= */

async function confirmarEditar(){

  const token = localStorage.getItem("token");
  const inputNombre = document.getElementById("inputNombre");
  const inputEmail = document.getElementById("inputEmail");
  const inputRol = document.getElementById("inputRol");
  const inputActivo = document.getElementById("inputActivo");

  const nombre = inputNombre ? inputNombre.value.trim() : '';
  const email = inputEmail ? inputEmail.value.trim() : '';
  const rol_id = inputRol ? inputRol.value : '1';
  const activo = inputActivo ? inputActivo.value === "true" : true;

  // Validar campos
  if(!nombre) {
    mostrarAlerta("warning", "Validación", "El nombre del usuario es requerido");
    return;
  }

  if(!email) {
    mostrarAlerta("warning", "Validación", "El email es requerido");
    return;
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(email)) {
    mostrarAlerta("warning", "Validación", "El email no tiene un formato válido");
    return;
  }

  try{

    const res = await fetch(`${API_BASE}/api/usuarios/${usuarioActual}`, {
      method: "PUT",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        email,
        rol_id: parseInt(rol_id),
        activo
      })
    });

    if(res.ok){
      mostrarAlerta("success", "Éxito", "Usuario actualizado correctamente");
      setTimeout(() => {
        cargarUsuarios();
        cargarCards();
      }, 500);
    } else {
      const errorData = await res.json();
      mostrarAlerta("danger", "Error", errorData.mensaje || errorData.message || "Error al actualizar el usuario");
    }

  }catch(error){
    console.error("Error editando usuario:", error);
    mostrarAlerta("danger", "Error", "Error al editar el usuario");
  }

}


/* =========================
   ELIMINAR
========================= */

async function confirmarEliminar(){

  const token = localStorage.getItem("token");

  try{

    const res = await fetch(`${API_BASE}/api/usuarios/${usuarioActual}`,{
      method:"DELETE",
      headers:{ Authorization:`Bearer ${token}` }
    });

    if(res.ok){
      mostrarAlerta("success", "Éxito", "Usuario y sus datos asociados eliminados correctamente");
      setTimeout(() => {
        cargarUsuarios();
        cargarCards();
      }, 500);
    } else {
      try {
        const errorData = await res.json();
        mostrarAlerta("danger", "Error", errorData.mensaje || errorData.message || "Error al eliminar el usuario");
      } catch {
        let mensajeError = "Error al eliminar el usuario";
        
        if(res.status === 403) {
          mensajeError = "No tienes permisos para eliminar este usuario";
        } else if(res.status === 404) {
          mensajeError = "El usuario no existe";
        } else if(res.status === 401) {
          mensajeError = "Tu sesión ha expirado. Vuelve a iniciar sesión.";
        } else if(res.status === 500) {
          mensajeError = "Error interno del servidor al eliminar el usuario";
        }
        
        mostrarAlerta("danger", "Error", mensajeError);
      }
    }

  }catch(error){
    console.error("Error eliminando usuario:", error);
    mostrarAlerta("danger", "Error", "Error al eliminar el usuario: " + error.message);
  }

}