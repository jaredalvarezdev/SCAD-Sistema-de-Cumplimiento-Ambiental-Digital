const supabase = require('../config/supabase');

const crearNotificacionInterna = async (usuario_id, mensaje) => {
  try {
    await supabase.from('notificaciones').insert([{
      usuario_id,
      mensaje,
      leido: false,
      fecha: new Date().toISOString()
    }]);
  } catch (err) {
    console.warn('[Notificaciones] Error al crear notificación interna:', err.message);
  }
};

module.exports = { crearNotificacionInterna };