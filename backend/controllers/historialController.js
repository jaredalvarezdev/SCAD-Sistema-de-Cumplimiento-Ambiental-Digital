const supabase = require('../config/supabase');

/* ==========================================
   OBTENER HISTORIAL (por empresa)
========================================== */
const obtenerHistorial = async (req, res) => {
  try {
    const { empresa_id } = req.user; // ✅ corregido

    const { data, error } = await supabase
      .from('historial')
      .select('*')
      .eq('empresa_id', empresa_id)
      .order('fecha', { ascending: false });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

/* ==========================================
   CREAR REGISTRO EN HISTORIAL
========================================== */
const crearRegistroHistorial = async (req, res) => {
  try {
    const { empresa_id, id: usuario_id } = req.user; // ✅ corregido
    const { accion, descripcion } = req.body;

    const { data, error } = await supabase
      .from('historial')
      .insert([{
        empresa_id,
        usuario_id,
        accion,
        descripcion
        // fecha se guarda sola si tiene DEFAULT NOW()
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      mensaje: 'Registro agregado al historial',
      data
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al crear registro en historial' });
  }
};

module.exports = {
  obtenerHistorial,
  crearRegistroHistorial
};