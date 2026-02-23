import supabase from '../config/supabase.js'

export const registrarUsuario = async (req, res) => {

  try {

    const { nombre, email, password, rol_id } = req.body

    const { data, error } = await supabase
      .from('usuarios')
      .insert([
        { nombre, email, password, rol_id }
      ])

    if (error) {
      return res.status(500).json(error)
    }

    res.json({
      mensaje: "Usuario registrado correctamente",
      data
    })

  } catch (err) {
    res.status(500).json(err)
  }

}