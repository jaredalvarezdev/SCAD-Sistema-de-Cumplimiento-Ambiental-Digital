const express = require('express');
const router  = express.Router();
const verificarToken = require('../middlewares/verificarToken');

const {
  obtenerNotificaciones,
  marcarComoLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
  eliminarTodas,
  crearNotificacion,
} = require('../controllers/notificacionesController');

// IMPORTANTE: rutas estáticas ANTES que las dinámicas (/:id)
router.get('/',                  verificarToken, obtenerNotificaciones);
router.post('/',                 verificarToken, crearNotificacion);
router.patch('/leer-todas',      verificarToken, marcarTodasLeidas);
router.patch('/:id/leida',       verificarToken, marcarComoLeida);
router.delete('/eliminar-todas', verificarToken, eliminarTodas);
router.delete('/:id',            verificarToken, eliminarNotificacion);

module.exports = router;