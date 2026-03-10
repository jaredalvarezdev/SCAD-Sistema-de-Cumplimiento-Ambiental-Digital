const express  = require('express');
const router   = express.Router();
const multer   = require('multer');

const verificarToken = require('../middlewares/verificarToken');
const {
  subirEvidenciaArchivo,
  subirEvidencia,
  verEvidencias,
  eliminarEvidencia
} = require('../controllers/evidenciasController');

// Multer local — campo 'archivo', máx 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Subir evidencia con archivo (FormData) — campo 'archivo'
router.post('/upload',
  verificarToken,
  upload.single('archivo'),
  subirEvidenciaArchivo
);

// Subir evidencia con base64
router.post('/',
  verificarToken,
  subirEvidencia
);

// Ver evidencias de un reporte
router.get('/:reporte_id',
  verificarToken,
  verEvidencias
);

// Eliminar evidencia por ID
router.delete('/:id',
  verificarToken,
  eliminarEvidencia
);

module.exports = router;