const tablaAuditorias = document.getElementById('tablaAuditorias');
const token = localStorage.getItem('token');

async function cargarAuditorias() {
  try {
    const res = await fetch('http://localhost:3000/api/auditorias', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.data?.length) {
      tablaAuditorias.innerHTML = '';
      data.data.forEach(aud => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${aud.id}</td>
          <td>${aud.nombre}</td>
          <td>${aud.empresa_id}</td>
          <td>${aud.fecha}</td>
        `;
        tablaAuditorias.appendChild(row);
      });
    } else {
      tablaAuditorias.innerHTML = '<tr><td colspan="4">No hay auditorías registradas</td></tr>';
    }

  } catch (err) {
    console.error(err);
    tablaAuditorias.innerHTML = '<tr><td colspan="4">Error al cargar auditorías</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', cargarAuditorias);