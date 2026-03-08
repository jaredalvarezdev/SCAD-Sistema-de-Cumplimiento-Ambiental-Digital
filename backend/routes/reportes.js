const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/verificarToken')
const verificarRol = require('../middlewares/verificarRol') 
const reportesController = require('../controllers/reportesController')

// =========================
// RUTAS REPORTES
// =========================

// Estadísticas → solo admin (rol_id 1)
router.get(
  '/estadisticas',
  verificarToken,
  verificarRol([1]),
  reportesController.obtenerEstadisticas
)

// Crear reporte → solo empresas (rol_id 2)
router.post(
  '/',
  verificarToken,
  verificarRol([2]),
  reportesController.crearReporte
)

// Listar reportes → admin, auditor, empresa (solo su empresa)
router.get(
  '/',
  verificarToken,
  verificarRol([1,2,3]),
  reportesController.listarReportes
)

// Ver reporte por ID → admin, auditor, empresa (solo su empresa)
router.get(
  '/:id',
  verificarToken,
  verificarRol([1,2,3]),
  reportesController.verReporte
)

// Cambiar estado → solo admin y auditor (rol_id 1 y 3)
router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol([1,3]),
  reportesController.cambiarEstadoReporte
)

// ========== NUEVA RUTA ==========
// Eliminar reportes por usuario (cascada) → solo admin
router.delete(
  '/usuario/:usuarioId',
  verificarToken,
  verificarRol([1]),
  reportesController.eliminarReportesPorUsuario
)

module.exports = router