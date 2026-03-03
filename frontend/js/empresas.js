const API_BASE = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!token || !usuario) {
    window.location.href = "/login.html";
    return;
  }

  document.getElementById("nombreUsuario").textContent =
    usuario.nombre;

  document.getElementById("logoutBtn")
    .addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "/login.html";
    });

  await cargarEmpresas();
});


// ================= CARGAR TODAS LAS EMPRESAS =================

async function cargarEmpresas() {

  const token = localStorage.getItem("token");
  const tbody = document.getElementById("tablaEmpresas");

  try {

    const res = await fetch(`${API_BASE}/api/empresas`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    const empresas = data.data || data;

    tbody.innerHTML = "";

    empresas.forEach(emp => {

      tbody.innerHTML += `
        <tr>
          <td>${emp.id}</td>
          <td>${emp.nombre}</td>
          <td>${emp.rfc || "-"}</td>
          <td>${emp.email || "-"}</td>
        </tr>
      `;
    });

  } catch (error) {
    console.error("Error cargando empresas:", error);
  }
}