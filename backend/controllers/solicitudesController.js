const supabase = require('../config/supabase')

// Listar solicitudes de unión pendientes de la empresa (solo admin/propietario)
const listarSolicitudes = async (req, res) => {
  try {
    const empresaId = Number(req.params.id)

    if (req.user.rol_id !== 1 && Number(req.user.empresa_id) !== empresaId) {
      return res.status(403).json({ mensaje: 'No autorizado' })
    }

    const { data, error } = await supabase
      .from('solicitudes_union')
      .select('id, usuario_id, estado, creado_en')
      .eq('empresa_id', empresaId)
      .eq('estado', 'pendiente')

    if (error) return res.status(500).json({ mensaje: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

// Aceptar solicitud de unión
const aceptarSolicitud = async (req, res) => {
  try {
    const { empresa_id, solicitud_id } = req.params

    if (req.user.rol_id !== 1 && Number(req.user.empresa_id) !== Number(empresa_id)) {
      return res.status(403).json({ mensaje: 'No autorizado' })
    }

    const { data: solicitud, error } = await supabase
      .from('solicitudes_union')
      .select('*')
      .eq('id', Number(solicitud_id))
      .single()

    if (error || !solicitud) return res.status(404).json({ mensaje: 'Solicitud no encontrada' })

    // Asignar empresa al usuario
    await supabase
      .from('usuarios')
      .update({ empresa_id: Number(empresa_id) })
      .eq('id', solicitud.usuario_id)

    // Marcar solicitud como aceptada
    await supabase
      .from('solicitudes_union')
      .update({ estado: 'aceptada' })
      .eq('id', Number(solicitud_id))

    res.json({ mensaje: 'Solicitud aceptada correctamente' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

// Rechazar solicitud de unión
const rechazarSolicitud = async (req, res) => {
  try {
    const { empresa_id, solicitud_id } = req.params

    if (req.user.rol_id !== 1 && Number(req.user.empresa_id) !== Number(empresa_id)) {
      return res.status(403).json({ mensaje: 'No autorizado' })
    }

    await supabase
      .from('solicitudes_union')
      .update({ estado: 'rechazada' })
      .eq('id', Number(solicitud_id))

    res.json({ mensaje: 'Solicitud rechazada correctamente' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = {
  listarSolicitudes,
  aceptarSolicitud,
  rechazarSolicitud
}