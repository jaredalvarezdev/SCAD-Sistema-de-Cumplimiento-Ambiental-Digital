const express = require('express')
const router  = express.Router()

const verificarToken = require('../middlewares/verificarToken')
const { subirEvidenciaArchivo, subirEvidencia, verEvidencias, eliminarEvidencia } = require('../controllers/evidenciasController')

// Subir evidencia con archivo (FormData)
router.post('/upload',
  verificarToken,
  subirEvidenciaArchivo
)

// Subir evidencia con base64 (mantener para compatibilidad)
router.post('/',
  verificarToken,
  subirEvidencia
)

// Ver evidencias de un reporte
router.get('/:reporte_id',
  verificarToken,
  verEvidencias
)

// Eliminar evidencia por ID
router.delete('/:id',
  verificarToken,
  eliminarEvidencia
)

module.exports = router