const supabase = require('../config/supabase')
const { validarReporteIA } = require('../services/deepCheckService')

/* ---------------- CREAR REPORTE ---------------- */
const crearReporte = async (req, res) => {
  try {
    const { titulo, descripcion } = req.body
    const { id, empresa_id, rol_id } = req.user

    if (rol_id !== 2)
      return res.status(403).json({ mensaje: 'Solo las empresas pueden crear reportes' })

    if (!titulo || !descripcion)
      return res.status(400).json({ mensaje: 'Faltan campos obligatorios' })

    if (descripcion.length < 20)
      return res.status(400).json({ mensaje: 'La descripción es demasiado corta' })

    const resultadoIA = await validarReporteIA(descripcion)

    const { data, error } = await supabase
      .from('reportes')
      .insert([{
        titulo,
        descripcion,
        usuario_id: id,
        empresa_id,
        estado_id: 1,
        validacion_ia: resultadoIA.observacion,
        confianza_ia: resultadoIA.confianza,
        modelo_ia: 'deepseek-v1',
        fecha_validacion_ia: new Date()
      }])
      .select()
      .single()

    if (error) return res.status(400).json(error)

    res.status(201).json({
      mensaje: 'Reporte creado correctamente',
      analisis_ia: resultadoIA,
      data
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- LISTAR REPORTES (CON PAGINACIÓN Y FILTROS) ---------------- */
const listarReportes = async (req, res) => {
  try {
    const { rol_id, empresa_id } = req.user
    const { estado_id, page = 1, limit = 10 } = req.query

    const from = (page - 1) * limit
    const to = from + parseInt(limit) - 1

    let query = supabase
      .from('reportes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    // Empresa solo ve los suyos
    if (rol_id === 2)
      query = query.eq('empresa_id', empresa_id)

    // Filtro por estado opcional
    if (estado_id)
      query = query.eq('estado_id', estado_id)

    const { data, error, count } = await query

    if (error) return res.status(400).json(error)

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      data
    })

  } catch (error) {
    console.error(error)
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

    if (error || !reporte)
      return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    if (rol_id === 2 && reporte.empresa_id !== empresa_id)
      return res.status(403).json({ mensaje: 'No tienes acceso a este reporte' })

    res.json(reporte)

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- CAMBIAR ESTADO DEL REPORTE ---------------- */
const cambiarEstadoReporte = async (req, res) => {
  try {
    const { id } = req.params
    const { estado_id } = req.body
    const { rol_id } = req.user

    if (![1, 3].includes(rol_id))
      return res.status(403).json({ mensaje: 'No tienes permisos para cambiar el estado' })

    if (!estado_id)
      return res.status(400).json({ mensaje: 'estado_id es obligatorio' })

    // Verificar que exista el reporte
    const { data: reporte } = await supabase
      .from('reportes')
      .select('id')
      .eq('id', id)
      .single()

    if (!reporte)
      return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    const { data, error } = await supabase
      .from('reportes')
      .update({ estado_id })
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(400).json(error)

    res.json({
      mensaje: 'Estado del reporte actualizado',
      data
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = {
  crearReporte,
  listarReportes,
  verReporte,
  cambiarEstadoReporte
}