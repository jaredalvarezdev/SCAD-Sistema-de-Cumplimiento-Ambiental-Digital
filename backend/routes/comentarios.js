const express = require('express')
const router = express.Router()
const verificarToken = require('../middlewares/verificarToken')

const {
  crearComentario,
  verComentarios,
  editarComentario,
  eliminarComentario
} = require('../controllers/comentariosController')

// Crear comentario
router.post('/', verificarToken, crearComentario)

// Ver comentarios de un reporte
router.get('/:reporte_id', verificarToken, verComentarios)

// Editar comentario
router.put('/:id', verificarToken, editarComentario)

// Eliminar comentario
router.delete('/:id', verificarToken, eliminarComentario)

module.exports = router