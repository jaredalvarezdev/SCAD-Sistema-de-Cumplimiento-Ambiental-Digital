const API_BASE = "http://localhost:3000";

let elementoActual = null;
let accionActual = null;

document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");
  const usuarioLogueado = JSON.parse(localStorage.getItem("usuario"));

  if (!token || !usuarioLogueado) {
    window.location.href = "/login.html";
    return;
  }

  document.getElementById("nombreUsuario").textContent =
    usuarioLogueado.nombre;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login.html";
  });

  document.getElementById("btnCancelar")
    .addEventListener("click", cerrarModal);

  document.getElementById("btnGuardar")
    .addEventListener("click", ejecutarAccionModal);

  await cargarDashboard();
});


// ================= DASHBOARD =================

async function cargarDashboard() {
  await Promise.all([
    cargarUsuarios(),
    cargarEmpresas(),
    cargarAuditorias(),
    cargarReportes()
  ]);
}


// ================= USUARIOS =================

async function cargarUsuarios() {

  const token = localStorage.getItem("token");
  const tbody = document.getElementById("tablaUsuarios");

  try {

    const res = await fetch(`${API_BASE}/api/usuarios`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    const usuarios = data.data || data;

    document.getElementById("totalUsuarios").textContent =
      usuarios.length;

    if (!tbody) return;

    tbody.innerHTML = "";

    usuarios.slice(0, 5).forEach(user => {

      const nombreSeguro = user.nombre.replace(/'/g, "\\'");
      const emailSeguro = user.email.replace(/'/g, "\\'");

      tbody.innerHTML += `
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
            <button onclick="editarUsuario(${user.id}, '${nombreSeguro}', '${emailSeguro}', ${user.rol_id}, ${user.activo})">✏</button>
            <button onclick="eliminarUsuario(${user.id})">🗑</button>
          </td>
        </tr>
      `;
    });

  } catch (error) {
    console.error("Error cargando usuarios:", error);
  }
}


// ================= EMPRESAS =================

async function cargarEmpresas() {

  const token = localStorage.getItem("token");

  try {

    const res = await fetch(`${API_BASE}/api/empresas`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    const empresas = data.data || data;

    const totalEmpresas = document.getElementById("totalEmpresas");
    if (totalEmpresas)
      totalEmpresas.textContent = empresas.length;

  } catch (error) {
    console.error("Error cargando empresas:", error);
  }
}


// ================= AUDITORIAS =================

async function cargarAuditorias() {

  const token = localStorage.getItem("token");

  try {

    const res = await fetch(`${API_BASE}/api/auditorias`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    const auditorias = data.data || data;

    const totalAuditorias =
      document.getElementById("totalAuditorias");

    if (totalAuditorias)
      totalAuditorias.textContent = auditorias.length;

  } catch (error) {
    console.error("Error cargando auditorías:", error);
  }
}


// ================= REPORTES =================

async function cargarReportes() {

  const token = localStorage.getItem("token");

  try {

    const res = await fetch(`${API_BASE}/api/reportes`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    const reportes = data.data || data;

    const totalReportes =
      document.getElementById("totalReportes");

    if (totalReportes)
      totalReportes.textContent = reportes.length;

  } catch (error) {
    console.error("Error cargando reportes:", error);
  }
}


// ================= EDITAR =================

window.editarUsuario = (id, nombre, email, rol_id, activo) => {

  elementoActual = id;
  accionActual = "editar";

  document.getElementById("modalTitulo").textContent =
    "Editar Usuario";

  document.getElementById("modalSubtitulo").textContent =
    "Modificar información";

  document.getElementById("modalContenido").innerHTML = `
    <input id="editNombre" value="${nombre}">
    <input id="editEmail" value="${email}">
    <select id="editRol">
      <option value="1" ${rol_id == 1 ? "selected" : ""}>Admin</option>
      <option value="2" ${rol_id == 2 ? "selected" : ""}>Empresa</option>
      <option value="3" ${rol_id == 3 ? "selected" : ""}>Auditor</option>
    </select>
    <select id="editActivo">
      <option value="true" ${activo ? "selected" : ""}>Activo</option>
      <option value="false" ${!activo ? "selected" : ""}>Inactivo</option>
    </select>
  `;

  abrirModal();
};


// ================= ELIMINAR =================

window.eliminarUsuario = (id) => {

  elementoActual = id;
  accionActual = "eliminar";

  document.getElementById("modalTitulo").textContent =
    "Confirmar eliminación";

  document.getElementById("modalSubtitulo").textContent =
    "Esta acción es permanente";

  document.getElementById("modalContenido").innerHTML =
    "<p>¿Eliminar este usuario?</p>";

  abrirModal();
};


// ================= EJECUTAR =================

async function ejecutarAccionModal() {

  const token = localStorage.getItem("token");

  try {

    if (accionActual === "editar") {

      const nombre =
        document.getElementById("editNombre").value;

      const email =
        document.getElementById("editEmail").value;

      const rol_id =
        Number(document.getElementById("editRol").value);

      const activo =
        document.getElementById("editActivo").value === "true";

      await fetch(`${API_BASE}/api/usuarios/${elementoActual}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, email, rol_id, activo })
      });
    }

    if (accionActual === "eliminar") {

      await fetch(`${API_BASE}/api/usuarios/${elementoActual}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    cerrarModal();
    await cargarUsuarios();

  } catch (error) {
    console.error("Error ejecutando acción:", error);
  }
}


// ================= MODAL =================

function abrirModal() {
  document.getElementById("modalGlobal").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modalGlobal").style.display = "none";
}