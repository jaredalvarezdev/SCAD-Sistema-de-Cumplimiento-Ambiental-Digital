// routes/usuarios.routes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const jwt = require('jsonwebtoken');

// ---------------- MIDDLEWARES ----------------
// Verifica que el usuario tenga un token válido
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ mensaje: "Token no proporcionado" });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ mensaje: "Token inválido" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ mensaje: "Token inválido o expirado" });
  }
};

// Verifica que el usuario sea admin
const verificarAdmin = (req, res, next) => {
  if (!req.user || req.user.rol_id !== 1) {
    return res.status(403).json({ mensaje: "Solo admins pueden realizar esta acción" });
  }
  next();
};

// ---------------- RUTAS ----------------
// Crear usuario (y empresa si aplica)
router.post('/', usuariosController.registrarUsuario);

// Login
router.post('/login', usuariosController.login);

// Solicitar código de recuperación
router.post('/recuperar', usuariosController.solicitarRecuperacion);

// Cambiar contraseña
router.post('/cambiar', usuariosController.cambiarContrasena);

// Obtener todos los usuarios (solo admin)
router.get('/', verificarToken, verificarAdmin, usuariosController.obtenerUsuarios);

// Editar usuario (nombre, email, rol, activo, empresa)
router.put('/:id', verificarToken, verificarAdmin, usuariosController.editarUsuario);

// Eliminar usuario (CON CASCADA DE REPORTES Y AUDITORÍAS)
router.delete('/:id', verificarToken, verificarAdmin, usuariosController.eliminarUsuario);

module.exports = router;