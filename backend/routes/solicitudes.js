const express = require('express');
const router  = express.Router();
const verificarToken = require('../middlewares/verificarToken');

const {
  listarSolicitudes,
  solicitarUnion,
  aceptarSolicitud,
  rechazarSolicitud,
} = require('../controllers/solicitudesController');

// Usuario normal solicita unirse a una empresa como auditor
router.post('/empresa/:empresa_id/solicitar', verificarToken, solicitarUnion);

// Empresa ve sus solicitudes pendientes
router.get('/empresa/:id', verificarToken, listarSolicitudes);

// Empresa acepta o rechaza
router.patch('/empresa/:empresa_id/solicitudes/:solicitud_id/aceptar', verificarToken, aceptarSolicitud);
router.patch('/empresa/:empresa_id/solicitudes/:solicitud_id/rechazar', verificarToken, rechazarSolicitud);

module.exports = router;