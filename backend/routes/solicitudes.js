const express = require('express')
const router = express.Router()
const verificarToken = require('../middlewares/verificarToken')
const verificarRol = require('../middlewares/verificarRol')

const {
  listarSolicitudes,
  aceptarSolicitud,
  rechazarSolicitud
} = require('../controllers/solicitudesController')

// Listar solicitudes pendientes
router.get('/:id', verificarToken, verificarRol([1, 2]), listarSolicitudes)

// Aceptar solicitud
router.patch('/:empresa_id/aceptar/:solicitud_id', verificarToken, verificarRol([1, 2]), aceptarSolicitud)

// Rechazar solicitud
router.patch('/:empresa_id/rechazar/:solicitud_id', verificarToken, verificarRol([1, 2]), rechazarSolicitud)

module.exports = router