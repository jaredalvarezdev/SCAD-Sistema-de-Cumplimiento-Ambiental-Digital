const API_BASE = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");
  const usuarioLogueado = JSON.parse(localStorage.getItem("usuario"));

  if (!token || !usuarioLogueado) {
    window.location.href = "/login";
    return;
  }

  document.getElementById("nombreUsuario").textContent =
    usuarioLogueado.nombre;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login";
  });

  document.getElementById("btnCancelar")
    .addEventListener("click", cerrarModal);

  await cargarUsuarios();
});


/* ===============================
   CARGAR USUARIOS
=================================*/
async function cargarUsuarios() {

  try {

    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/api/usuarios`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Error backend:", error);
      return;
    }

    const usuarios = await res.json();
    const tabla = document.getElementById("tablaUsuarios");

    if (!usuarios || usuarios.length === 0) {
      tabla.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;">
            No hay usuarios registrados
          </td>
        </tr>
      `;
      return;
    }

    tabla.innerHTML = usuarios.map(user => {

      const nombreSeguro = user.nombre.replace(/'/g, "\\'");
      const emailSeguro = user.email.replace(/'/g, "\\'");

      return `
        <tr>
          <td>${user.id}</td>
          <td>${user.nombre}</td>
          <td>${user.email}</td>
          <td>${
            user.rol_id == 1
              ? "Admin"
              : user.rol_id == 2
              ? "Empresa"
              : "Auditor"
          }</td>
          <td>${user.activo ? "Activo" : "Inactivo"}</td>

          <td>
            <div class="acciones">
              <button class="btn-editar"
                onclick="abrirModalEditar(${user.id}, '${nombreSeguro}', '${emailSeguro}', ${user.rol_id}, ${user.activo})">
                ✏
              </button>

              <button class="btn-eliminar"
                onclick="eliminarUsuario(${user.id})">
                🗑
              </button>
            </div>
          </td>
        </tr>
      `;

    }).join("");

  } catch (error) {
    console.error("Error cargando usuarios:", error);
  }
}


/* ===============================
   EDITAR
=================================*/
function abrirModalEditar(id, nombre, email, rol_id, activo) {

  document.getElementById("modalTitulo").textContent =
    "Editar Usuario";

  document.getElementById("modalSubtitulo").textContent =
    "Actualiza la información";

  document.getElementById("modalContenido").innerHTML = `
    <input type="hidden" id="editId" value="${id}">

    <label>Nombre</label>
    <input type="text" id="editNombre" value="${nombre}">

    <label>Email</label>
    <input type="email" id="editEmail" value="${email}">

    <label>Rol</label>
    <select id="editRol">
      <option value="1" ${rol_id == 1 ? "selected" : ""}>Admin</option>
      <option value="2" ${rol_id == 2 ? "selected" : ""}>Empresa</option>
      <option value="3" ${rol_id == 3 ? "selected" : ""}>Auditor</option>
    </select>

    <label>
      <input type="checkbox" id="editActivo" ${activo ? "checked" : ""}>
      Activo
    </label>
  `;

  document.getElementById("btnGuardar").onclick = guardarCambios;

  document.getElementById("modalGlobal").style.display = "flex";
}


/* ===============================
   GUARDAR CAMBIOS
=================================*/
async function guardarCambios() {

  const token = localStorage.getItem("token");

  const id = document.getElementById("editId").value;
  const nombre = document.getElementById("editNombre").value;
  const email = document.getElementById("editEmail").value;
  const rol_id = document.getElementById("editRol").value;
  const activo = document.getElementById("editActivo").checked;

  const res = await fetch(`${API_BASE}/api/usuarios/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ nombre, email, rol_id, activo })
  });

  if (res.ok) {
    cerrarModal();
    cargarUsuarios();
  } else {
    console.error("Error al actualizar");
  }
}


/* ===============================
   ELIMINAR
=================================*/
async function eliminarUsuario(id) {

  const token = localStorage.getItem("token");

  if (!confirm("¿Seguro que deseas eliminar este usuario?"))
    return;

  const res = await fetch(`${API_BASE}/api/usuarios/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.ok) {
    cargarUsuarios();
  } else {
    console.error("Error al eliminar");
  }
}


/* ===============================
   CERRAR MODAL
=================================*/
function cerrarModal() {
  document.getElementById("modalGlobal").style.display = "none";
}