const supabase = require('../config/supabase')
const { registrarHistorial } = require('./historialHelper') // ← NUEVO

/* ── LISTAR AUDITORÍAS (con datos del reporte) ── */
const listarAuditorias = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('auditorias')
      .select(`
        id,
        observaciones,
        fecha,
        usuario_id,
        reporte_id,
        usuarios ( id, nombre, email ),
        reportes (
          id,
          titulo,
          estado_id,
          confianza_ia,
          validacion_ia,
          fecha_creacion,
          empresa_id,
          empresas ( id, nombre )
        )
      `)
      .order('fecha', { ascending: false })

    if (error) return res.status(400).json(error)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ── VER AUDITORÍAS DE UN REPORTE ── */
const verAuditoriasPorReporte = async (req, res) => {
  try {
    const { reporte_id } = req.params

    const { data, error } = await supabase
      .from('auditorias')
      .select(`
        id,
        observaciones,
        fecha,
        usuarios ( id, nombre, email )
      `)
      .eq('reporte_id', reporte_id)
      .order('fecha', { ascending: false })

    if (error) return res.status(400).json(error)
    res.json(data)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ── CREAR AUDITORÍA (guardar observaciones del admin) ── */
const crearAuditoria = async (req, res) => {
  try {
    const { reporte_id, observaciones } = req.body
    const { id: usuario_id, rol_id } = req.user

    if (rol_id !== 1)
      return res.status(403).json({ mensaje: 'Solo el admin puede crear auditorías' })
    if (!reporte_id)
      return res.status(400).json({ mensaje: 'reporte_id es obligatorio' })

    const { data, error } = await supabase
      .from('auditorias')
      .insert([{ reporte_id, usuario_id, observaciones: observaciones || '' }])
      .select()
      .single()

    if (error) return res.status(400).json(error)

    // ← NUEVO: obtener titulo del reporte para el historial
    const { data: reporte } = await supabase
      .from('reportes')
      .select('titulo')
      .eq('id', reporte_id)
      .single()

    await registrarHistorial(usuario_id, 'auditorias', 'observacion', data.id,
      `Admin dejó observación en reporte "${reporte?.titulo || '#' + reporte_id}": "${(observaciones || '').substring(0, 80)}"`);

    res.status(201).json({ mensaje: 'Auditoría registrada', data })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ── ELIMINAR AUDITORÍA ── */
const eliminarAuditoria = async (req, res) => {
  try {
    const { id } = req.params
    const { rol_id } = req.user

    if (rol_id !== 1)
      return res.status(403).json({ mensaje: 'Sin permisos' })

    const { error } = await supabase.from('auditorias').delete().eq('id', id)
    if (error) return res.status(400).json(error)

    res.json({ mensaje: 'Auditoría eliminada' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = {
  listarAuditorias,
  verAuditoriasPorReporte,
  crearAuditoria,
  eliminarAuditoria
}