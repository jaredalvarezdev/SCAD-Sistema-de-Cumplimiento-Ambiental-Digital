const supabase = require('../config/supabase')

const verificarPermiso = (permisoNombre) => async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ mensaje: 'Token requerido' })

    // Obtener el id del permiso por nombre
    const { data: permiso, error: errorPermiso } = await supabase
      .from('permisos')
      .select('id')
      .eq('nombre', permisoNombre)
      .single()

    if (errorPermiso || !permiso) return res.status(403).json({ mensaje: 'Permiso no encontrado' })

    // Verificar si el rol tiene ese permiso
    const { data: rolPermiso, error: errorRol } = await supabase
      .from('rol_permisos')
      .select('permiso_id')
      .eq('rol_id', req.user.rol_id)
      .eq('permiso_id', permiso.id)
      .single()

    if (errorRol || !rolPermiso) return res.status(403).json({ mensaje: 'No autorizado' })

    next()
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = verificarPermiso