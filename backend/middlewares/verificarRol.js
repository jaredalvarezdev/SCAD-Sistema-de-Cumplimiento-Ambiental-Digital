const supabase = require('../config/supabase')

const verificarRol = (rolesPermitidos = []) => {
  return async (req, res, next) => {
    try {
      const { rol_id } = req.user
      if (!rolesPermitidos.includes(rol_id)) {
        return res.status(403).json({ mensaje: 'No tienes permisos para esta acción' })
      }

      // Opcional: si quieres verificar permisos específicos en la tabla rol_permisos
      // const { data: permisos } = await supabase
      //   .from('rol_permisos')
      //   .select('permiso_id')
      //   .eq('rol_id', rol_id)

      next()
    } catch (err) {
      res.status(500).json({ mensaje: 'Error al verificar rol' })
    }
  }
}

module.exports = verificarRol