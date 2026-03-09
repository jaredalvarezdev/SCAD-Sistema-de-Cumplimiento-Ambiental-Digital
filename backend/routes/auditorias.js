const express        = require('express')
const router         = express.Router()
const verificarToken = require('../middlewares/verificarToken')
const verificarRol   = require('../middlewares/verificarRol')
const ctrl           = require('../controllers/auditoriasController')

// Listar todas las auditorías (solo admin)
router.get('/',
  verificarToken, verificarRol([1]),
  ctrl.listarAuditorias
)

// Ver auditorías de un reporte específico
router.get('/reporte/:reporte_id',
  verificarToken, verificarRol([1]),
  ctrl.verAuditoriasPorReporte
)

// Crear auditoría / observación
router.post('/',
  verificarToken, verificarRol([1]),
  ctrl.crearAuditoria
)

// Eliminar auditoría
router.delete('/:id',
  verificarToken, verificarRol([1]),
  ctrl.eliminarAuditoria
)

module.exports = router