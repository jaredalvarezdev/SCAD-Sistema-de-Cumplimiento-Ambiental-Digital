const supabase = require('../config/supabase');

/* ==========================================
   OBTENER NOTIFICACIONES (por empresa)
========================================== */
const obtenerNotificaciones = async (req, res) => {
  try {
    const { empresa_id } = req.user; // ✅ corregido

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('empresa_id', empresa_id)
      .order('fecha', { ascending: false });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

/* ==========================================
   MARCAR NOTIFICACIÓN COMO LEÍDA
========================================== */
const marcarComoLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id } = req.user; // ✅ corregido

    const { data, error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select();

    if (error) throw error;

    res.json({
      mensaje: 'Notificación marcada como leída',
      data
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar notificación' });
  }
};

/* ==========================================
   CREAR NOTIFICACIÓN
========================================== */
const crearNotificacion = async (req, res) => {
  try {
    const { empresa_id } = req.user; // ✅ corregido
    const { titulo, mensaje } = req.body;

    const { data, error } = await supabase
      .from('notificaciones')
      .insert([{
        empresa_id,
        titulo,
        mensaje
        // fecha se guarda sola si tiene DEFAULT NOW()
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      mensaje: 'Notificación creada correctamente',
      data
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al crear notificación' });
  }
};

module.exports = {
  obtenerNotificaciones,
  marcarComoLeida,
  crearNotificacion
};