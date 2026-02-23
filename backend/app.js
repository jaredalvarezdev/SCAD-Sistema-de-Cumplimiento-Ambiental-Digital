require('dotenv').config()

const express = require('express')
const cors = require('cors')
const usuariosRoutes = require('./routes/usuarios.js')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('SCAD Backend funcionando')
})

app.use('/api/usuarios', usuariosRoutes)

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
})