require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/pages',  express.static(path.join(__dirname, '../frontend/pages')));
app.use('/css',    express.static(path.join(__dirname, '../frontend/css')));
app.use('/js',     express.static(path.join(__dirname, '../frontend/js')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// Rutas de la API
const usuariosRoutes          = require('./routes/usuarios.js');
const empresasRoutes          = require('./routes/empresas.js');
const reportesRoutes          = require('./routes/reportes.js');
const evidenciasRoutes        = require('./routes/evidencias.js');
const comentariosRoutes       = require('./routes/comentarios.js');
const historialRoutes         = require('./routes/historial.js');
const notificacionesRoutes    = require('./routes/notificaciones.js');
const reportesGeneradosRoutes = require('./routes/reportesGenerados.js');
const residuosRoutes          = require('./routes/residuos.js');
const auditoriasRoutes        = require('./routes/auditorias.js');
const solicitudesRoutes       = require('./routes/solicitudes.js'); // ← NUEVO

app.use('/api/usuarios',           usuariosRoutes);
app.use('/api/empresas',           empresasRoutes);
app.use('/api/reportes',           reportesRoutes);
app.use('/api/evidencias',         evidenciasRoutes);
app.use('/api/comentarios',        comentariosRoutes);
app.use('/api/historial',          historialRoutes);
app.use('/api/notificaciones',     notificacionesRoutes);
app.use('/api/reportes-generados', reportesGeneradosRoutes);
app.use('/api/residuos',           residuosRoutes);
app.use('/api/auditorias',         auditoriasRoutes);
app.use('/api/solicitudes',        solicitudesRoutes); // ← NUEVO

// Rutas HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/register.html'));
});

app.get('/seleccion-empresa', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/seleccion-empresa.html'));
});

app.get('/empresa-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/empresa/empresa-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin/admin-dashboard.html'));
});

// Rutas para páginas admin
app.get('/pages/admin/empresas.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin/empresas.html'));
});

app.get('/pages/admin/usuarios.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin/usuarios.html'));
});

app.get('/pages/admin/reportes.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin/reportes.html'));
});

app.get('/pages/admin/auditorias.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin/auditorias.html'));
});

app.get('/pages/admin/historial.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin/actividad.html')); // ← apunta a actividad.html
});

app.get('/pages/admin/configuracion.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/admin/configuracion.html'));
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});