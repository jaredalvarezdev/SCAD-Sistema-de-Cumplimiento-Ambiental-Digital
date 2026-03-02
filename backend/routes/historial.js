const express = require('express');
const router = express.Router();
const { obtenerHistorial, crearRegistroHistorial } = require('../controllers/historialController');

// Rutas de historial
router.get('/', obtenerHistorial);
router.post('/', crearRegistroHistorial);

module.exports = router;