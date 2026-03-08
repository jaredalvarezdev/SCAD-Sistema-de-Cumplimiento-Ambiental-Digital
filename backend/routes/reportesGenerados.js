const express = require('express');
const router  = express.Router();

const verificarToken  = require('../middlewares/verificarToken');
const verificarRol    = require('../middlewares/verificarRol');
const ctrl            = require('../controllers/reportesGeneradosController');

// ── Tipos de reportes documentales ──────────────────────────────────────────
// GET /api/reportes-generados/tipos
router.get('/tipos',
  verificarToken, verificarRol([1, 2, 3]),
  ctrl.listarTipos
);

// ── Listar todos los reportes generados ─────────────────────────────────────
// GET /api/reportes-generados
// GET /api/reportes-generados?empresa_id=X&tipo_reporte_id=Y
router.get('/',
  verificarToken, verificarRol([1, 2, 3]),
  ctrl.listarReportesGenerados
);

// ── Ver un reporte generado por ID ──────────────────────────────────────────
// GET /api/reportes-generados/:id
router.get('/:id',
  verificarToken, verificarRol([1, 2, 3]),
  ctrl.verReporteGenerado
);

// ── Analizar una sola evidencia y generar PDF individual ────────────────────
// POST /api/reportes-generados/analizar-evidencia/:evidencia_id
router.post('/analizar-evidencia/:evidencia_id',
  verificarToken, verificarRol([1, 2, 3]),
  ctrl.analizarEvidencia
);

// ── Generar reporte PDF consolidado de todas las evidencias de un reporte ───
// POST /api/reportes-generados/consolidado/:reporte_id
router.post('/consolidado/:reporte_id',
  verificarToken, verificarRol([1, 2]),
  ctrl.generarConsolidado
);

// ── Eliminar reporte generado ────────────────────────────────────────────────
// DELETE /api/reportes-generados/:id
router.delete('/:id',
  verificarToken, verificarRol([1]),
  ctrl.eliminarReporteGenerado
);

module.exports = router;