const express = require('express')
const router  = express.Router()

const verificarToken = require('../middlewares/verificarToken')
const verificarRol   = require('../middlewares/verificarRol')
const reportesController = require('../controllers/reportesController')

// Estadísticas admin
router.get('/estadisticas',
  verificarToken, verificarRol([1]),
  reportesController.obtenerEstadisticas
)

// Estadísticas empresa (antes de /:id)
router.get('/estadisticas/empresa/:empresa_id',
  verificarToken, verificarRol([1, 2]),
  reportesController.obtenerEstadisticasEmpresa
)

// Eliminar por usuario (antes de /:id)
router.delete('/usuario/:usuarioId',
  verificarToken, verificarRol([1]),
  reportesController.eliminarReportesPorUsuario
)

// Crear reporte
router.post('/',
  verificarToken, verificarRol([2]),
  reportesController.crearReporte
)

// Listar reportes
router.get('/',
  verificarToken, verificarRol([1, 2, 3]),
  reportesController.listarReportes
)

// Ver reporte por ID
router.get('/:id',
  verificarToken, verificarRol([1, 2, 3]),
  reportesController.verReporte
)

// Cambiar estado
router.patch('/:id/estado',
  verificarToken, verificarRol([1, 3]),
  reportesController.cambiarEstadoReporte
)

// Eliminar reporte individual
router.delete('/:id',
  verificarToken, verificarRol([1, 2]),
  reportesController.eliminarReporte
)

module.exports = router