const express = require('express');
const router = express.Router();
const {
  obtenerNotificaciones,
  marcarComoLeida,
  crearNotificacion
} = require('../controllers/notificacionesController');

// Rutas de notificaciones
router.get('/', obtenerNotificaciones);
router.post('/', crearNotificacion);
router.patch('/:id/leida', marcarComoLeida);

module.exports = router;