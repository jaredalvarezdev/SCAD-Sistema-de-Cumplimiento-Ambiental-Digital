const express = require('express')
const router = express.Router()

const verificarToken = require('../middlewares/verificarToken')

const {
  subirEvidencia,
  verEvidencias
} = require('../controllers/evidenciasController')

// Subir evidencia
router.post('/', verificarToken, subirEvidencia)

// Ver evidencias de un reporte
router.get('/:reporte_id', verificarToken, verEvidencias)

module.exports = router