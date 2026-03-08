const express = require('express');
const router  = express.Router();

const verificarToken = require('../middlewares/verificarToken');
const verificarRol   = require('../middlewares/verificarRol');
const ctrl           = require('../controllers/residuosController');

// Catálogo de tipos de residuos
// GET /api/residuos/tipos
router.get('/tipos',
  verificarToken, verificarRol([1, 2, 3]),
  ctrl.listarTipos
);

// Guardar período del reporte
// POST /api/residuos/periodo
router.post('/periodo',
  verificarToken, verificarRol([1, 2]),
  ctrl.guardarPeriodo
);

// Obtener período de un reporte
// GET /api/residuos/periodo/:reporte_id
router.get('/periodo/:reporte_id',
  verificarToken, verificarRol([1, 2, 3]),
  ctrl.obtenerPeriodo
);

// Agregar registro de residuo
// POST /api/residuos/registro
router.post('/registro',
  verificarToken, verificarRol([1, 2]),
  ctrl.agregarRegistro
);

// Listar registros de un reporte
// GET /api/residuos/registros/:reporte_id
router.get('/registros/:reporte_id',
  verificarToken, verificarRol([1, 2, 3]),
  ctrl.listarRegistros
);

// Eliminar registro
// DELETE /api/residuos/registro/:id
router.delete('/registro/:id',
  verificarToken, verificarRol([1, 2]),
  ctrl.eliminarRegistro
);

// Generar PDF formal de residuos sólidos
// POST /api/residuos/generar-pdf/:reporte_id
router.post('/generar-pdf/:reporte_id',
  verificarToken, verificarRol([1, 2]),
  ctrl.generarPDF
);

module.exports = router;