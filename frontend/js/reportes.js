const tablaReportes = document.getElementById('tablaReportes');
const token = localStorage.getItem('token');

async function cargarReportes() {
  try {
    const res = await fetch('http://localhost:3000/api/reportes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.data?.length) {
      tablaReportes.innerHTML = '';
      data.data.forEach(rep => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${rep.id}</td>
          <td>${rep.nombre}</td>
          <td>${rep.empresa_id}</td>
          <td>${rep.fecha}</td>
        `;
        tablaReportes.appendChild(row);
      });
    } else {
      tablaReportes.innerHTML = '<tr><td colspan="4">No hay reportes registrados</td></tr>';
    }

  } catch (err) {
    console.error(err);
    tablaReportes.innerHTML = '<tr><td colspan="4">Error al cargar reportes</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', cargarReportes);