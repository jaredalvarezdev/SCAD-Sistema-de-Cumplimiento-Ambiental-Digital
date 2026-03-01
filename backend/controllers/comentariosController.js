const supabase = require('../config/supabase')

/* ---------------- CREAR COMENTARIO ---------------- */
const crearComentario = async (req, res) => {
  try {
    const { mensaje, reporte_id } = req.body
    const { id: usuario_id, rol_id, empresa_id } = req.user

    if (!mensaje || !reporte_id) return res.status(400).json({ mensaje: 'mensaje y reporte_id son obligatorios' })

    // Obtener reporte
    const { data: reporte, error: errorReporte } = await supabase
      .from('reportes')
      .select('empresa_id')
      .eq('id', reporte_id)
      .single()

    if (errorReporte || !reporte) return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    // Empresa solo puede comentar sus reportes
    if (rol_id === 2 && reporte.empresa_id !== empresa_id)
      return res.status(403).json({ mensaje: 'No puedes comentar este reporte' })

    const { data, error } = await supabase
      .from('comentarios')
      .insert([{ mensaje, reporte_id, usuario_id }])
      .select()

    if (error) return res.status(400).json(error)

    res.status(201).json({ mensaje: 'Comentario creado', data })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- VER COMENTARIOS ---------------- */
const verComentarios = async (req, res) => {
  try {
    const { reporte_id } = req.params
    const { rol_id, empresa_id } = req.user

    // Validar acceso al reporte
    const { data: reporte, error: errorReporte } = await supabase
      .from('reportes')
      .select('empresa_id')
      .eq('id', reporte_id)
      .single()

    if (errorReporte || !reporte) return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    if (rol_id === 2 && reporte.empresa_id !== empresa_id)
      return res.status(403).json({ mensaje: 'No tienes acceso a estos comentarios' })

    const { data, error } = await supabase
      .from('comentarios')
      .select('*')
      .eq('reporte_id', reporte_id)
      .order('fecha', { ascending: true })

    if (error) return res.status(400).json(error)

    res.json(data)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- EDITAR COMENTARIO ---------------- */
const editarComentario = async (req, res) => {
  try {
    const { id } = req.params
    const { mensaje } = req.body
    const { rol_id, id: usuario_id } = req.user

    if (!mensaje) return res.status(400).json({ mensaje: 'mensaje es obligatorio' })

    const { data: comentario, error: errorComentario } = await supabase
      .from('comentarios')
      .select('usuario_id')
      .eq('id', id)
      .single()

    if (errorComentario || !comentario) return res.status(404).json({ mensaje: 'Comentario no encontrado' })

    if (rol_id !== 1 && comentario.usuario_id !== usuario_id)
      return res.status(403).json({ mensaje: 'No puedes editar este comentario' })

    const { data, error } = await supabase
      .from('comentarios')
      .update({ mensaje })
      .eq('id', id)
      .select()

    if (error) return res.status(400).json(error)

    res.json({ mensaje: 'Comentario actualizado', data })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- ELIMINAR COMENTARIO ---------------- */
const eliminarComentario = async (req, res) => {
  try {
    const { id } = req.params
    const { rol_id, id: usuario_id } = req.user

    const { data: comentario, error: errorComentario } = await supabase
      .from('comentarios')
      .select('usuario_id')
      .eq('id', id)
      .single()

    if (errorComentario || !comentario) return res.status(404).json({ mensaje: 'Comentario no encontrado' })

    if (rol_id !== 1 && comentario.usuario_id !== usuario_id)
      return res.status(403).json({ mensaje: 'No puedes eliminar este comentario' })

    const { error } = await supabase.from('comentarios').delete().eq('id', id)
    if (error) return res.status(400).json(error)

    res.json({ mensaje: 'Comentario eliminado' })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = {
  crearComentario,
  verComentarios,
  editarComentario,
  eliminarComentario
}