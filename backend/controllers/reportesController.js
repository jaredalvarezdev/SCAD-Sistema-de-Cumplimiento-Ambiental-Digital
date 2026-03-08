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
      return res.status(400).json({ mensaje: 'La descripción debe tener al menos 20 caracteres' })

    const resultadoIA = await validarReporteIA(descripcion)

    const { data, error } = await supabase
      .from('reportes')
      .insert([{
        titulo,
        descripcion,
        usuario_id:          id,
        empresa_id,
        estado_id:           1,
        validacion_ia:       resultadoIA.observacion,
        confianza_ia:        resultadoIA.confianza,
        modelo_ia:           'deepseek-v1',
        fecha_validacion_ia: new Date()
      }])
      .select()
      .single()

    if (error) return res.status(400).json(error)

    res.status(201).json({ mensaje: 'Reporte creado correctamente', analisis_ia: resultadoIA, data })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- LISTAR REPORTES ---------------- */
const listarReportes = async (req, res) => {
  try {
    const { rol_id, empresa_id: empresa_id_token } = req.user
    const { estado_id, page = 1, limit = 100, empresa_id: empresa_id_query } = req.query

    const from = (page - 1) * limit
    const to   = from + parseInt(limit) - 1

    let query = supabase
      .from('reportes')
      .select('*', { count: 'exact' })
      .order('fecha_creacion', { ascending: false })
      .range(from, to)

    if (rol_id === 2)           query = query.eq('empresa_id', empresa_id_token)
    else if (empresa_id_query)  query = query.eq('empresa_id', empresa_id_query)
    if (estado_id)              query = query.eq('estado_id', estado_id)

    const { data, error, count } = await query
    if (error) return res.status(400).json(error)

    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), data })

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
      .from('reportes').select('*').eq('id', id).single()

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

/* ---------------- CAMBIAR ESTADO ---------------- */
const cambiarEstadoReporte = async (req, res) => {
  try {
    const { id } = req.params
    const { estado_id } = req.body
    const { rol_id } = req.user

    if (![1, 3].includes(rol_id))
      return res.status(403).json({ mensaje: 'No tienes permisos para cambiar el estado' })
    if (!estado_id)
      return res.status(400).json({ mensaje: 'estado_id es obligatorio' })

    const { data: reporte } = await supabase.from('reportes').select('id').eq('id', id).single()
    if (!reporte) return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    const { data, error } = await supabase
      .from('reportes').update({ estado_id }).eq('id', id).select().single()
    if (error) return res.status(400).json(error)

    res.json({ mensaje: 'Estado del reporte actualizado', data })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- ELIMINAR REPORTE POR ID ---------------- */
const eliminarReporte = async (req, res) => {
  try {
    const { id } = req.params
    const { rol_id, empresa_id } = req.user

    const { data: reporte, error: errorGet } = await supabase
      .from('reportes').select('id, empresa_id, estado_id').eq('id', id).single()

    if (errorGet || !reporte)
      return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    if (rol_id === 2) {
      if (reporte.empresa_id !== empresa_id)
        return res.status(403).json({ mensaje: 'No tienes acceso a este reporte' })
      if (reporte.estado_id !== 1)
        return res.status(403).json({ mensaje: 'Solo puedes eliminar reportes en estado pendiente' })
    }

    // Eliminar datos asociados en cascada
    await supabase.from('evidencias').delete().eq('reporte_id', id)
    await supabase.from('comentarios').delete().eq('reporte_id', id)
    await supabase.from('auditorias').delete().eq('reporte_id', id)

    const { error } = await supabase.from('reportes').delete().eq('id', id)
    if (error) return res.status(500).json({ mensaje: 'Error al eliminar el reporte' })

    res.json({ mensaje: 'Reporte eliminado correctamente' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- ELIMINAR REPORTES POR USUARIO (admin) ---------------- */
const eliminarReportesPorUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params
    if (req.user.rol_id !== 1)
      return res.status(403).json({ mensaje: 'Solo admins pueden eliminar reportes' })

    const { data: reportes, error: errorGet } = await supabase
      .from('reportes').select('id').eq('usuario_id', usuarioId)

    if (errorGet)
      return res.status(500).json({ mensaje: 'Error al buscar reportes: ' + errorGet.message })
    if (!reportes || reportes.length === 0)
      return res.json({ mensaje: 'No hay reportes para eliminar', reportesEliminados: 0 })

    const { error } = await supabase.from('reportes').delete().eq('usuario_id', usuarioId)
    if (error)
      return res.status(500).json({ mensaje: 'Error al eliminar reportes: ' + error.message })

    res.json({ mensaje: `${reportes.length} reportes eliminados correctamente`, reportesEliminados: reportes.length })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- ESTADISTICAS ADMIN ---------------- */
const obtenerEstadisticas = async (req, res) => {
  try {
    const { count: totalUsuarios }   = await supabase.from('usuarios').select('*',   { count: 'exact', head: true })
    const { count: totalEmpresas }   = await supabase.from('empresas').select('*',   { count: 'exact', head: true })
    const { count: totalReportes }   = await supabase.from('reportes').select('*',   { count: 'exact', head: true })
    const { count: totalAuditorias } = await supabase.from('auditorias').select('*', { count: 'exact', head: true })

    res.json({ totalUsuarios, totalEmpresas, totalReportes, totalAuditorias })

  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error obteniendo estadísticas' })
  }
}

/* ---------------- ESTADISTICAS EMPRESA ---------------- */
const obtenerEstadisticasEmpresa = async (req, res) => {
  try {
    const { empresa_id } = req.params

    // Estado IDs correctos: 1=Pendiente, 2=En revisión, 3=Aprobado, 4=Rechazado
    const { count: pendientes }   = await supabase.from('reportes').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa_id).eq('estado_id', 1)
    const { count: enRevision }   = await supabase.from('reportes').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa_id).eq('estado_id', 2)
    const { count: aprobados }    = await supabase.from('reportes').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa_id).eq('estado_id', 3)
    const { count: rechazados }   = await supabase.from('reportes').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa_id).eq('estado_id', 4)

    const { data: reportesEmpresa } = await supabase.from('reportes').select('id').eq('empresa_id', empresa_id)
    const reporteIds = reportesEmpresa ? reportesEmpresa.map(r => r.id) : []

    let evidencias = 0
    if (reporteIds.length > 0) {
      const { count } = await supabase.from('evidencias').select('*', { count: 'exact', head: true }).in('reporte_id', reporteIds)
      evidencias = count || 0
    }

    res.json({ pendientes, enRevision, aprobados, rechazados, evidencias })

  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error obteniendo estadísticas de empresa' })
  }
}

module.exports = {
  crearReporte,
  listarReportes,
  verReporte,
  cambiarEstadoReporte,
  eliminarReporte,
  eliminarReportesPorUsuario,
  obtenerEstadisticas,
  obtenerEstadisticasEmpresa
}