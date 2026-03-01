const supabase = require('../config/supabase')

// Crear empresa (solo admin global)
const crearEmpresa = async (req, res) => {
  try {
    if (req.user.rol_id !== 1) return res.status(403).json({ mensaje: 'No autorizado' })

    const { nombre, rfc, direccion, telefono, email } = req.body
    const { data, error } = await supabase.from('empresas').insert([{ nombre, rfc, direccion, telefono, email }]).select()
    if (error) return res.status(400).json({ mensaje: error.message })

    res.status(201).json({ mensaje: 'Empresa creada correctamente', data })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

// Listar empresas
const listarEmpresas = async (req, res) => {
  try {
    let data, error
    if (req.user.rol_id === 1) {
      ;({ data, error } = await supabase.from('empresas').select('*'))
    } else if (req.user.rol_id === 2) {
      ;({ data, error } = await supabase.from('empresas').select('*').eq('id', Number(req.user.empresa_id)))
    } else {
      return res.status(403).json({ mensaje: 'No autorizado' })
    }

    if (error) return res.status(500).json({ mensaje: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

// Actualizar empresa
const actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, rfc, direccion, telefono, email } = req.body
    const actualizacion = {}
    if (nombre) actualizacion.nombre = nombre
    if (rfc) actualizacion.rfc = rfc
    if (direccion) actualizacion.direccion = direccion
    if (telefono) actualizacion.telefono = telefono
    if (email) actualizacion.email = email

    if (req.user.rol_id === 1 || (req.user.rol_id === 2 && Number(req.user.empresa_id) === Number(id))) {
      const { data, error } = await supabase.from('empresas').update(actualizacion).eq('id', Number(id)).select()
      if (error) return res.status(400).json({ mensaje: error.message })
      return res.json({ mensaje: 'Empresa actualizada correctamente', data })
    }

    return res.status(403).json({ mensaje: 'No autorizado' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

// Eliminar empresa (solo admin global)
const eliminarEmpresa = async (req, res) => {
  try {
    if (req.user.rol_id !== 1) return res.status(403).json({ mensaje: 'No autorizado' })

    const { id } = req.params
    const { error } = await supabase.from('empresas').delete().eq('id', Number(id))
    if (error) return res.status(400).json({ mensaje: error.message })

    res.json({ mensaje: 'Empresa eliminada correctamente' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

module.exports = {
  crearEmpresa,
  listarEmpresas,
  actualizarEmpresa,
  eliminarEmpresa
}