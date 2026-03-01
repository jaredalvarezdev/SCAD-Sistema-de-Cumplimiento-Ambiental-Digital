require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express() // primero se crea la app

const usuariosRoutes = require('./routes/usuarios.js')
const empresasRoutes = require('./routes/empresas')
const reportesRoutes = require('./routes/reportes')
const evidenciasRoutes = require('./routes/evidencias')
const comentariosRoutes = require('./routes/comentarios')

// middlewares
app.use(cors())
app.use(express.json())

// rutas
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/empresas', empresasRoutes)
app.use('/api/reportes', reportesRoutes)
app.use('/api/evidencias', evidenciasRoutes)
app.use('/api/comentarios', comentariosRoutes)

// ruta principal
app.get('/', (req, res) => {
    res.send('SCAD Backend funcionando')
})

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
})