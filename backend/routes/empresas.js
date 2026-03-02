const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

const {
  crearEmpresa,
  listarEmpresas,
  listarEmpresasParaUsuario, // <-- nueva ruta para rol 3
  actualizarEmpresa,
  eliminarEmpresa
} = require('../controllers/empresasController');

// Crear empresa (solo admin global)
router.post('/', verificarToken, verificarRol([1]), crearEmpresa);

// Listar empresas (admin y empresa)
router.get('/', verificarToken, verificarRol([1, 2]), listarEmpresas);

// Listar empresas disponibles para usuario normal (rol 3)
router.get('/disponibles', verificarToken, verificarRol([3]), listarEmpresasParaUsuario);

// Actualizar empresa (admin o empresa propia)
router.patch('/:id', verificarToken, verificarRol([1, 2]), actualizarEmpresa);

// Eliminar empresa (solo admin)
router.delete('/:id', verificarToken, verificarRol([1]), eliminarEmpresa);

module.exports = router;