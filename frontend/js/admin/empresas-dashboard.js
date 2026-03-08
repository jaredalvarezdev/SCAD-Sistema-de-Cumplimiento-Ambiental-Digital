const API_BASE = "http://localhost:3000";

let accionActual = null;
let empresaActual = null;
let empresasData = [];

document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!token || !usuario) {
    window.location.href = "/login.html";
    return;
  }

  document.getElementById("nombreUsuario").textContent = usuario.nombre;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login.html";
  });

  document.getElementById("btnAgregarEmpresa").addEventListener("click", abrirModalAgregar);
  document.getElementById("btnCancelar").addEventListener("click", cerrarModal);
  document.getElementById("btnConfirmar").addEventListener("click", confirmarAccion);

  await cargarDashboard();

});


/* =========================
   ALERTAS TAILWIND
========================= */

function mostrarAlerta(tipo, titulo, mensaje, duracion = 4000) {
  const container = document.getElementById("alertContainer");
  
  const tiposConfig = {
    success: {
      bg: '#1B6B4F',
      text: '#FFFFFF',
      border: '#1B6B4F',
      svg: '<svg class="w-4 h-4 me-2 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>'
    },
    danger: {
      bg: 'rgba(220, 38, 38, 0.1)',
      text: '#DC2626',
      border: 'rgba(220, 38, 38, 0.2)',
      svg: '<svg class="w-4 h-4 me-2 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>'
    },
    warning: {
      bg: 'rgba(251, 191, 36, 0.1)',
      text: '#F59E0B',
      border: 'rgba(251, 191, 36, 0.2)',
      svg: '<svg class="w-4 h-4 me-2 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>'
    },
    info: {
      bg: 'rgba(3, 102, 214, 0.1)',
      text: '#0366D6',
      border: 'rgba(3, 102, 214, 0.2)',
      svg: '<svg class="w-4 h-4 me-2 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>'
    }
  };

  const config = tiposConfig[tipo] || tiposConfig.info;

  const alertDiv = document.createElement("div");
  alertDiv.className = `flex items-start sm:items-center p-4 mb-4 text-sm rounded-lg`;
  alertDiv.style.backgroundColor = config.bg;
  alertDiv.style.color = config.text;
  alertDiv.style.border = `1px solid ${config.border}`;
  alertDiv.setAttribute("role", "alert");

  alertDiv.innerHTML = `
    ${config.svg}
    <div>
      <span class="font-medium me-1">${titulo}:</span>
      <span>${mensaje}</span>
    </div>
  `;
  
  container.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.style.opacity = '0';
    alertDiv.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => alertDiv.remove(), 300);
  }, duracion);
}


/* =========================
   CARGAR DASHBOARD
========================= */

async function cargarDashboard() {
  const token = localStorage.getItem("token");

  try {
    const resStats = await fetch(`${API_BASE}/api/empresas/estadisticas`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (resStats.ok) {
      const stats = await resStats.json();
      document.getElementById("totalEmpresas").textContent = stats.totalEmpresas;
      document.getElementById("empresasActivas").textContent = stats.empresasActivas;
      document.getElementById("empresasSuspendidas").textContent = stats.empresasSuspendidas;
      document.getElementById("promedioCumplimiento").textContent = stats.promedioCumplimiento + "%";
    }

    await cargarEmpresas();

  } catch (error) {
    console.error("Error cargando dashboard:", error);
    mostrarAlerta("danger", "Error", "No se pudo cargar el dashboard");
  }
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

    if (!res.ok) return;

    const empresas = await res.json();
    empresasData = empresas;

    const grid = document.getElementById("gridEmpresas");
    grid.innerHTML = empresas.map(empresa => {
      
      const estadoColor = empresa.estado === 'activa' ? '#1B6B4F' : empresa.estado === 'suspendida' ? '#dc2626' : '#6b7280';
      const estadoTextColor = '#FFFFFF';
      
      return `
        <div class="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer" onclick="abrirModalEditar(${empresa.id})">
          
          <!-- Header with Icon -->
          <div class="flex justify-between items-start mb-3">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(27, 107, 79, 0.15);">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #1B6B4F; stroke-width: 2;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              </svg>
            </div>
            <span class="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full" style="background-color: ${estadoColor}; color: ${estadoTextColor};">
              ${empresa.estado}
            </span>
          </div>

          <!-- Title y Tipo -->
          <h5 class="mb-0.5 text-sm font-semibold text-gray-900">${empresa.nombre}</h5>
          <p class="text-xs text-gray-500 mb-3">${empresa.tipo_empresa || 'Sin clasificar'}</p>

          <!-- Info Items con iconos -->
          <div class="space-y-2 mb-4">
            ${empresa.telefono ? `
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                <span class="text-xs text-gray-600">${empresa.telefono}</span>
              </div>
            ` : ''}
            ${empresa.email ? `
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"></path>
                </svg>
                <span class="text-xs text-gray-600 truncate">${empresa.email}</span>
              </div>
            ` : ''}
          </div>

          <!-- Cumplimiento -->
          <div class="mb-2.5">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-semibold text-gray-700">Cumplimiento</span>
              <span class="text-xs font-bold text-gray-700">${empresa.nivel_cumplimiento}%</span>
            </div>
            <div class="w-full rounded-full overflow-hidden" style="background: #e5e7eb; height: 6px;">
              <div style="width: ${empresa.nivel_cumplimiento}%; background: #1B6B4F; height: 100%;"></div>
            </div>
          </div>

          <!-- Actions Buttons -->
          <div class="flex gap-2 mt-4" onclick="event.stopPropagation()">
            <button onclick="abrirModalEditar(${empresa.id})" class="flex-1 inline-flex justify-center items-center text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 font-medium rounded text-xs px-3 py-1.5 transition-colors">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              Editar
            </button>
            <button onclick="eliminarEmpresa(${empresa.id})" class="flex-1 inline-flex justify-center items-center text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 font-medium rounded text-xs px-3 py-1.5 transition-colors">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"></path>
              </svg>
              Eliminar
            </button>
          </div>

        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Error cargando empresas:", error);
    mostrarAlerta("danger", "Error", "No se pudieron cargar las empresas");
  }
}


/* =========================
   MODAL
========================= */

function abrirModalAgregar() {
  accionActual = "crear";
  empresaActual = null;

  document.getElementById("modalTitulo").textContent = "Agregar Empresa";
  limpiarFormulario();

  const modal = document.getElementById("modalEmpresa");
  modal.classList.add("active");
}

function abrirModalEditar(id) {
  accionActual = "editar";
  empresaActual = id;

  document.getElementById("modalTitulo").textContent = "Editar Empresa";

  const empresa = empresasData.find(e => e.id === id);
  if (empresa) {
    document.getElementById("inputNombre").value = empresa.nombre;
    document.getElementById("inputRFC").value = empresa.rfc || '';
    document.getElementById("inputEmail").value = empresa.email || '';
    document.getElementById("inputTelefono").value = empresa.telefono || '';
    document.getElementById("inputDireccion").value = empresa.direccion || '';
    document.getElementById("inputCiudad").value = empresa.ciudad || '';
    document.getElementById("inputTipoEmpresa").value = empresa.tipo_empresa || '';
    document.getElementById("inputEstado").value = empresa.estado || 'activa';
    document.getElementById("inputCumplimiento").value = empresa.nivel_cumplimiento || 0;
  }

  const modal = document.getElementById("modalEmpresa");
  modal.classList.add("active");
}

function cerrarModal() {
  const modal = document.getElementById("modalEmpresa");
  modal.classList.remove("active");
  limpiarFormulario();
}

function limpiarFormulario() {
  document.getElementById("inputNombre").value = '';
  document.getElementById("inputRFC").value = '';
  document.getElementById("inputEmail").value = '';
  document.getElementById("inputTelefono").value = '';
  document.getElementById("inputDireccion").value = '';
  document.getElementById("inputCiudad").value = '';
  document.getElementById("inputTipoEmpresa").value = '';
  document.getElementById("inputEstado").value = 'activa';
  document.getElementById("inputCumplimiento").value = 0;
}


/* =========================
   ACCIONES
========================= */

function eliminarEmpresa(id) {
  accionActual = "eliminar";
  empresaActual = id;

  const empresa = empresasData.find(e => e.id === id);
  if (empresa) {
    mostrarConfirmacionEliminar(empresa.nombre);
  }
}

function mostrarConfirmacionEliminar(nombreEmpresa) {
  document.getElementById("modalTitulo").textContent = "Eliminar Empresa";
  
  const modal = document.getElementById("modalEmpresa");
  const formulario = document.getElementById("formularioEmpresa");
  
  formulario.innerHTML = `
    <p style="color: #666; line-height: 1.6;">
      ¿Estás seguro de que deseas eliminar la empresa <strong>${nombreEmpresa}</strong>? 
      Esta acción no se puede deshacer y se eliminarán todos sus datos asociados.
    </p>
  `;
  
  modal.classList.add("active");
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
   CREAR EMPRESA
========================= */

async function confirmarCrear() {
  const token = localStorage.getItem("token");
  const nombre = document.getElementById("inputNombre").value.trim();
  const rfc = document.getElementById("inputRFC").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const telefono = document.getElementById("inputTelefono").value.trim();
  const direccion = document.getElementById("inputDireccion").value.trim();
  const ciudad = document.getElementById("inputCiudad").value.trim();
  const tipo_empresa = document.getElementById("inputTipoEmpresa").value.trim();
  const estado = document.getElementById("inputEstado").value;
  const nivel_cumplimiento = parseInt(document.getElementById("inputCumplimiento").value) || 0;

  if (!nombre) {
    mostrarAlerta("warning", "Validación", "El nombre de la empresa es requerido");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/empresas`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        rfc: rfc || null,
        email: email || null,
        telefono: telefono || null,
        direccion: direccion || null,
        ciudad: ciudad || null,
        tipo_empresa: tipo_empresa || null,
        estado,
        nivel_cumplimiento
      })
    });

    if (res.ok) {
      mostrarAlerta("success", "Éxito", "Empresa creada correctamente");
      setTimeout(() => cargarDashboard(), 500);
    } else {
      const errorData = await res.json();
      mostrarAlerta("danger", "Error", errorData.mensaje || "Error al crear la empresa");
    }
  } catch (error) {
    console.error("Error creando empresa:", error);
    mostrarAlerta("danger", "Error", "Error al crear la empresa");
  }
}


/* =========================
   EDITAR EMPRESA
========================= */

async function confirmarEditar() {
  const token = localStorage.getItem("token");
  const nombre = document.getElementById("inputNombre").value.trim();
  const rfc = document.getElementById("inputRFC").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const telefono = document.getElementById("inputTelefono").value.trim();
  const direccion = document.getElementById("inputDireccion").value.trim();
  const ciudad = document.getElementById("inputCiudad").value.trim();
  const tipo_empresa = document.getElementById("inputTipoEmpresa").value.trim();
  const estado = document.getElementById("inputEstado").value;
  const nivel_cumplimiento = parseInt(document.getElementById("inputCumplimiento").value) || 0;

  if (!nombre) {
    mostrarAlerta("warning", "Validación", "El nombre de la empresa es requerido");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/empresas/${empresaActual}`, {
      method: "PUT",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        rfc: rfc || null,
        email: email || null,
        telefono: telefono || null,
        direccion: direccion || null,
        ciudad: ciudad || null,
        tipo_empresa: tipo_empresa || null,
        estado,
        nivel_cumplimiento
      })
    });

    if (res.ok) {
      mostrarAlerta("success", "Éxito", "Empresa actualizada correctamente");
      setTimeout(() => cargarDashboard(), 500);
    } else {
      const errorData = await res.json();
      mostrarAlerta("danger", "Error", errorData.mensaje || "Error al actualizar la empresa");
    }
  } catch (error) {
    console.error("Error editando empresa:", error);
    mostrarAlerta("danger", "Error", "Error al editar la empresa");
  }
}


/* =========================
   ELIMINAR EMPRESA
========================= */

async function confirmarEliminar() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/api/empresas/${empresaActual}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      mostrarAlerta("success", "Éxito", "Empresa eliminada correctamente");
      setTimeout(() => cargarDashboard(), 500);
    } else {
      try {
        const errorData = await res.json();
        mostrarAlerta("danger", "Error", errorData.mensaje || errorData.message || "Error al eliminar la empresa");
      } catch {
        let mensajeError = "Error al eliminar la empresa";
        
        if (res.status === 403) {
          mensajeError = "No tienes permisos para eliminar esta empresa";
        } else if (res.status === 404) {
          mensajeError = "La empresa no existe";
        } else if (res.status === 401) {
          mensajeError = "Tu sesión ha expirado";
        }
        
        mostrarAlerta("danger", "Error", mensajeError);
      }
    }
  } catch (error) {
    console.error("Error eliminando empresa:", error);
    mostrarAlerta("danger", "Error", "Error al eliminar la empresa");
  }
}