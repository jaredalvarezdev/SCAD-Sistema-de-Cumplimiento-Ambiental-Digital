require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('SCAD Backend funcionando')
})

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
})