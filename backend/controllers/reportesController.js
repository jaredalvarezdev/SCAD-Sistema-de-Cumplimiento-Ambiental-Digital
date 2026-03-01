const supabase = require('../config/supabase')
const { validarReporteIA } = require('../services/deepCheckService')

/* ---------------- CREAR REPORTE ---------------- */
const crearReporte = async (req, res) => {
  try {
    const { titulo, descripcion } = req.body
    const { id, empresa_id, rol_id } = req.user

    // Solo empresas pueden crear reportes
    if (rol_id !== 2) return res.status(403).json({ mensaje: 'Solo las empresas pueden crear reportes' })

    if (!titulo || !descripcion) return res.status(400).json({ mensaje: 'Faltan campos obligatorios' })

    // Validación con IA
    const resultadoIA = await validarReporteIA(descripcion)

    const { data, error } = await supabase
      .from('reportes')
      .insert([{
        titulo,
        descripcion,
        usuario_id: id,
        empresa_id,
        estado_id: 1, // estado inicial
        validacion_ia: resultadoIA.observacion,
        confianza_ia: resultadoIA.confianza
      }])
      .select()

    if (error) return res.status(400).json(error)

    res.status(201).json({
      mensaje: 'Reporte creado correctamente',
      analisis_ia: resultadoIA,
      data
    })

  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- LISTAR REPORTES ---------------- */
const listarReportes = async (req, res) => {
  try {
    const { rol_id, empresa_id } = req.user

    let query = supabase.from('reportes').select('*')

    // Empresa solo ve los suyos
    if (rol_id === 2) query = query.eq('empresa_id', empresa_id)

    const { data, error } = await query
    if (error) return res.status(400).json(error)

    res.json(data)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- VER REPORTE POR ID ---------------- */
const verReporte = async (req, res) => {
  try {
    const { id } = req.params
    const { rol_id, empresa_id } = req.user

    const { data: reporte, error } = await supabase
      .from('reportes')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !reporte) return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    if (rol_id === 2 && reporte.empresa_id !== empresa_id)
      return res.status(403).json({ mensaje: 'No tienes acceso a este reporte' })

    res.json(reporte)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- CAMBIAR ESTADO DEL REPORTE ---------------- */
const cambiarEstadoReporte = async (req, res) => {
  try {
    const { id } = req.params
    const { estado_id } = req.body
    const { rol_id } = req.user

    // Solo admin (1) y auditor (3)
    if (![1, 3].includes(rol_id)) return res.status(403).json({ mensaje: 'No tienes permisos para cambiar el estado' })
    if (!estado_id) return res.status(400).json({ mensaje: 'estado_id es obligatorio' })

    const { data, error } = await supabase
      .from('reportes')
      .update({ estado_id })
      .eq('id', id)
      .select()

    if (error) return res.status(400).json(error)

    res.json({ mensaje: 'Estado del reporte actualizado', data })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = {
  crearReporte,
  listarReportes,
  verReporte,
  cambiarEstadoReporte
}