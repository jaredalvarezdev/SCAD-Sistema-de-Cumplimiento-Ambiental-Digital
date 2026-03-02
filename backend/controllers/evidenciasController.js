const supabase = require('../config/supabase')

/*
SUBIR EVIDENCIA A UN REPORTE
*/
const subirEvidencia = async (req, res) => {
  try {
    const { reporte_id, nombre_archivo, tipo_archivo, ruta_archivo } = req.body
    const { id, empresa_id, rol_id } = req.user

    if (!reporte_id || !nombre_archivo || !ruta_archivo)
      return res.status(400).json({ mensaje: 'Faltan campos obligatorios' })

    // Verificar que el reporte exista
    const { data: reporte, error: errorReporte } = await supabase
      .from('reportes')
      .select('id, empresa_id')
      .eq('id', reporte_id)
      .single()

    if (errorReporte || !reporte)
      return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    // Si es empresa, validar que el reporte le pertenezca
    if (rol_id === 2 && reporte.empresa_id !== empresa_id)
      return res.status(403).json({ mensaje: 'No puedes subir evidencia a este reporte' })

    const { data, error } = await supabase
      .from('evidencias')
      .insert([{
        reporte_id,
        nombre_archivo,
        tipo_archivo,
        ruta_archivo,
        usuario_id: id
      }])
      .select()
      .single()

    if (error) return res.status(400).json(error)

    res.status(201).json({
      mensaje: 'Evidencia subida correctamente',
      data
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/*
VER EVIDENCIAS DE UN REPORTE
*/
const verEvidencias = async (req, res) => {
  try {
    const { reporte_id } = req.params
    const { rol_id, empresa_id } = req.user

    // Verificar que el reporte exista
    const { data: reporte } = await supabase
      .from('reportes')
      .select('id, empresa_id')
      .eq('id', reporte_id)
      .single()

    if (!reporte)
      return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    // Empresa solo puede ver evidencias de sus reportes
    if (rol_id === 2 && reporte.empresa_id !== empresa_id)
      return res.status(403).json({ mensaje: 'No tienes acceso a este reporte' })

    const { data, error } = await supabase
      .from('evidencias')
      .select('*')
      .eq('reporte_id', reporte_id)
      .order('created_at', { ascending: false })

    if (error) return res.status(400).json(error)

    res.json(data)

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = {
  subirEvidencia,
  verEvidencias
}