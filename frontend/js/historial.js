const tablaHistorial = document.getElementById('tablaHistorial');
const token = localStorage.getItem('token');

async function cargarHistorial() {
  try {
    const res = await fetch('http://localhost:3000/api/historial', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.data?.length) {
      tablaHistorial.innerHTML = '';
      data.data.forEach(hist => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${hist.id}</td>
          <td>${hist.usuario_id}</td>
          <td>${hist.accion}</td>
          <td>${hist.fecha}</td>
        `;
        tablaHistorial.appendChild(row);
      });
    } else {
      tablaHistorial.innerHTML = '<tr><td colspan="4">No hay historial registrado</td></tr>';
    }

  } catch (err) {
    console.error(err);
    tablaHistorial.innerHTML = '<tr><td colspan="4">Error al cargar historial</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', cargarHistorial);