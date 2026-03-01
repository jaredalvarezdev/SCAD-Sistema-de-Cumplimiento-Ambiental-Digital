const supabase = require('../config/supabase')

/*
SUBIR EVIDENCIA A UN REPORTE
*/
const subirEvidencia = async (req, res) => {
  try {

    const { reporte_id, nombre_archivo, tipo_archivo, ruta_archivo } = req.body
    const { id } = req.user

    const { data, error } = await supabase
      .from('evidencias')
      .insert([
        {
          reporte_id,
          nombre_archivo,
          tipo_archivo,
          ruta_archivo,
          usuario_id: id
        }
      ])
      .select()

    if (error) return res.status(400).json(error)

    res.status(201).json({
      mensaje: 'Evidencia subida correctamente',
      data
    })

  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/*
VER EVIDENCIAS DE UN REPORTE
*/
const verEvidencias = async (req, res) => {
  try {

    const { reporte_id } = req.params

    const { data, error } = await supabase
      .from('evidencias')
      .select('*')
      .eq('reporte_id', reporte_id)

    if (error) return res.status(400).json(error)

    res.json(data)

  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = {
  subirEvidencia,
  verEvidencias
}