const express = require('express')
const router = express.Router()

const supabase = require('../config/supabase')

// Obtener usuarios
router.get('/', async (req, res) => {

    const { data, error } = await supabase
        .from('usuarios')
        .select('*')

    if (error) {
        return res.status(500).json(error)
    }

    res.json(data)
})


// Crear usuario
router.post('/', async (req, res) => {

    const { nombre, email, password, rol_id } = req.body

    const { data, error } = await supabase
        .from('usuarios')
        .insert([
            {
                nombre,
                email,
                password,
                rol_id
            }
        ])

    if (error) {
        return res.status(500).json(error)
    }

    res.json({
        mensaje: "Usuario creado",
        data
    })
})

module.exports = router