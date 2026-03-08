const express = require('express');
const router = express.Router();
const empresasController = require('../controllers/empresasController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

// ¡IMPORTANTE! Esta ruta DEBE ir ANTES que /:id
// Si no, Express confundirá "estadisticas" con un ID
router.get(
  '/estadisticas',
  verificarToken,
  verificarRol([1]),
  empresasController.obtenerEstadisticasEmpresas
);

// Obtener todas las empresas (solo admin)
router.get(
  '/',
  verificarToken,
  verificarRol([1]),
  empresasController.obtenerEmpresas
);

// Obtener empresa por ID (solo admin)
router.get(
  '/:id',
  verificarToken,
  verificarRol([1]),
  empresasController.obtenerEmpresa
);

// Crear empresa (solo admin)
router.post(
  '/',
  verificarToken,
  verificarRol([1]),
  empresasController.crearEmpresa
);

// Editar empresa (solo admin)
router.put(
  '/:id',
  verificarToken,
  verificarRol([1]),
  empresasController.editarEmpresa
);

// Eliminar empresa (solo admin)
router.delete(
  '/:id',
  verificarToken,
  verificarRol([1]),
  empresasController.eliminarEmpresa
);

module.exports = router;