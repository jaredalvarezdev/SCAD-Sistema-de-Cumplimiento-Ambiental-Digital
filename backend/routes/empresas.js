const express = require('express')
const router = express.Router()
const verificarToken = require('../middlewares/verificarToken')
const verificarRol = require('../middlewares/verificarRol')

const {
  crearEmpresa,
  listarEmpresas,
  actualizarEmpresa,
  eliminarEmpresa
} = require('../controllers/empresasController')

router.post('/', verificarToken, verificarRol([1]), crearEmpresa)
router.get('/', verificarToken, verificarRol([1, 2]), listarEmpresas)
router.patch('/:id', verificarToken, verificarRol([1, 2]), actualizarEmpresa)
router.delete('/:id', verificarToken, verificarRol([1]), eliminarEmpresa)

module.exports = router