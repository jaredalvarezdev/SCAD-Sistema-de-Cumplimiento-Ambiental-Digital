const express = require('express');
const router = express.Router();
const empresasController = require('../controllers/empresasController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

// Estadísticas → solo admin
router.get(
  '/estadisticas',
  verificarToken,
  verificarRol([1]),
  empresasController.obtenerEstadisticasEmpresas
);

// ← NUEVO: Empresas disponibles para auditores (rol 3) — lista básica id+nombre
router.get(
  '/disponibles',
  verificarToken,
  verificarRol([1, 2, 3]),
  empresasController.obtenerEmpresasDisponibles
);

// Obtener todas las empresas → solo admin
router.get(
  '/',
  verificarToken,
  verificarRol([1]),
  empresasController.obtenerEmpresas
);

// Obtener empresa por ID → admin Y empresa (rol 2 necesita ver su propia empresa)
router.get(
  '/:id',
  verificarToken,
  verificarRol([1, 2, 3]),
  empresasController.obtenerEmpresa
);

// Crear empresa → solo admin
router.post(
  '/',
  verificarToken,
  verificarRol([1]),
  empresasController.crearEmpresa
);

// Editar empresa → solo admin
router.put(
  '/:id',
  verificarToken,
  verificarRol([1]),
  empresasController.editarEmpresa
);

// Eliminar empresa → solo admin
router.delete(
  '/:id',
  verificarToken,
  verificarRol([1]),
  empresasController.eliminarEmpresa
);

module.exports = router;