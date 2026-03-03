const tablaRoles = document.getElementById('tablaRoles');
const token = localStorage.getItem('token');

async function cargarRoles() {
  try {
    const res = await fetch('http://localhost:3000/api/roles', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.data?.length) {
      tablaRoles.innerHTML = '';
      data.data.forEach(role => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${role.id}</td>
          <td>${role.nombre}</td>
          <td>${role.descripcion}</td>
        `;
        tablaRoles.appendChild(row);
      });
    } else {
      tablaRoles.innerHTML = '<tr><td colspan="3">No hay roles registrados</td></tr>';
    }

  } catch (err) {
    console.error(err);
    tablaRoles.innerHTML = '<tr><td colspan="3">Error al cargar roles</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', cargarRoles);