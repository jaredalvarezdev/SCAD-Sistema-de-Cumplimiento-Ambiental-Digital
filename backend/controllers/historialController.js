const supabase = require('../config/supabase');

/* ==========================================
   OBTENER HISTORIAL GLOBAL (admin)
   Reemplaza el anterior que leía tabla 'historial'
   Ahora lee de 'historial_cambios'
========================================== */
const obtenerHistorial = async (req, res) => {
  try {
    const { limit = 200 } = req.query;

    const { data, error } = await supabase
      .from('historial_cambios')
      .select(`
        id,
        accion,
        tabla_afectada,
        descripcion_detallada,
        registro_id,
        fecha,
        usuarios ( id, nombre, email )
      `)
      .order('fecha', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

/* ==========================================
   CREAR REGISTRO EN HISTORIAL
   Mantiene compatibilidad con el anterior
========================================== */
const crearRegistroHistorial = async (req, res) => {
  try {
    const { id: usuario_id } = req.user;
    const { accion, descripcion, tabla_afectada, registro_id } = req.body;

    const { data, error } = await supabase
      .from('historial_cambios')
      .insert([{
        usuario_id,
        accion,
        tabla_afectada: tabla_afectada || 'general',
        descripcion_detallada: descripcion,
        registro_id: registro_id || null,
        fecha: new Date().toISOString()
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