const express = require('express')
const router = express.Router()
const usuariosController = require('../controllers/usuariosController')
const jwt = require('jsonwebtoken')

// Middleware para rutas protegidas
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  if (!authHeader) return res.status(401).json({ mensaje: "Token no proporcionado" })
  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ mensaje: "Token inválido" })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ mensaje: "Token inválido o expirado" })
  }
}

/* ---------------- RUTAS ---------------- */
// Crear usuario (y empresa si aplica)
router.post('/', usuariosController.registrarUsuario)

// Login
router.post('/login', usuariosController.login)

// Solicitar código de recuperación
router.post('/recuperar', usuariosController.solicitarRecuperacion)

// Cambiar contraseña
router.post('/cambiar', usuariosController.cambiarContrasena)

module.exports = router