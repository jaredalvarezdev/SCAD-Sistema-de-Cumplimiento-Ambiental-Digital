const supabase = require('../config/supabase')

/* ---------------- LISTAR SOLICITUDES ---------------- */
const listarSolicitudes = async (req, res) => {
  try {
    const empresaId = Number(req.params.id)

    if (
      req.user.rol_id !== 1 &&
      Number(req.user.empresa_id) !== empresaId
    ) {
      return res.status(403).json({ mensaje: 'No autorizado' })
    }

    const { data, error } = await supabase
      .from('solicitudes_union')
      .select('id, usuario_id, estado, creado_en')
      .eq('empresa_id', empresaId)
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: false })

    if (error) return res.status(500).json({ mensaje: error.message })

    res.json(data)

  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- ACEPTAR SOLICITUD ---------------- */
const aceptarSolicitud = async (req, res) => {
  try {
    const empresa_id = Number(req.params.empresa_id)
    const solicitud_id = Number(req.params.solicitud_id)

    if (
      req.user.rol_id !== 1 &&
      Number(req.user.empresa_id) !== empresa_id
    ) {
      return res.status(403).json({ mensaje: 'No autorizado' })
    }

    const { data: solicitud, error } = await supabase
      .from('solicitudes_union')
      .select('*')
      .eq('id', solicitud_id)
      .eq('empresa_id', empresa_id)
      .single()

    if (error || !solicitud)
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' })

    if (solicitud.estado !== 'pendiente')
      return res.status(400).json({ mensaje: 'La solicitud ya fue procesada' })

    // Actualizar usuario
    const { error: errorUsuario } = await supabase
      .from('usuarios')
      .update({ empresa_id })
      .eq('id', solicitud.usuario_id)

    if (errorUsuario)
      return res.status(400).json({ mensaje: errorUsuario.message })

    // Marcar solicitud como aceptada
    const { error: errorSolicitud } = await supabase
      .from('solicitudes_union')
      .update({ estado: 'aceptada' })
      .eq('id', solicitud_id)

    if (errorSolicitud)
      return res.status(400).json({ mensaje: errorSolicitud.message })

    res.json({ mensaje: 'Solicitud aceptada correctamente' })

  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- RECHAZAR SOLICITUD ---------------- */
const rechazarSolicitud = async (req, res) => {
  try {
    const empresa_id = Number(req.params.empresa_id)
    const solicitud_id = Number(req.params.solicitud_id)

    if (
      req.user.rol_id !== 1 &&
      Number(req.user.empresa_id) !== empresa_id
    ) {
      return res.status(403).json({ mensaje: 'No autorizado' })
    }

    const { data: solicitud } = await supabase
      .from('solicitudes_union')
      .select('estado')
      .eq('id', solicitud_id)
      .eq('empresa_id', empresa_id)
      .single()

    if (!solicitud)
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' })

    if (solicitud.estado !== 'pendiente')
      return res.status(400).json({ mensaje: 'La solicitud ya fue procesada' })

    const { error } = await supabase
      .from('solicitudes_union')
      .update({ estado: 'rechazada' })
      .eq('id', solicitud_id)

    if (error)
      return res.status(400).json({ mensaje: error.message })

    res.json({ mensaje: 'Solicitud rechazada correctamente' })

  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = {
  listarSolicitudes,
  aceptarSolicitud,
  rechazarSolicitud
}