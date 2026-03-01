const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/verificarToken')

const {
  crearReporte,
  listarReportes,
  verReporte,
  cambiarEstadoReporte
} = require('../controllers/reportesController')

// Crear reporte → solo empresas
router.post('/', verificarToken, crearReporte)

// Listar reportes → admin, auditor, empresa (solo su empresa)
router.get('/', verificarToken, listarReportes)

// Ver reporte por ID → admin, auditor, empresa (solo su empresa)
router.get('/:id', verificarToken, verReporte)

// Cambiar estado → solo admin y auditor
router.patch('/:id/estado', verificarToken, cambiarEstadoReporte)

module.exports = router