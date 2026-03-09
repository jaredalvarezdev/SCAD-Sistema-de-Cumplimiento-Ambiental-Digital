const supabase = require('../config/supabase');

/* ==========================================
   OBTENER NOTIFICACIONES
========================================== */
const obtenerNotificaciones = async (req, res) => {
  try {
    const { id: usuario_id } = req.user; // token tiene { id, rol_id, empresa_id }

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order('fecha', { ascending: false });

    if (error) throw error;
    res.json(data);

  } catch (error) {
    console.error('[notificaciones] obtener:', error.message);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

/* ==========================================
   MARCAR UNA COMO LEÍDA
========================================== */
const marcarComoLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: usuario_id } = req.user;

    const { data, error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('id', id)
      .eq('usuario_id', usuario_id)
      .select();

    if (error) throw error;
    res.json({ mensaje: 'Notificación marcada como leída', data });

  } catch (error) {
    console.error('[notificaciones] marcarLeida:', error.message);
    res.status(500).json({ error: 'Error al actualizar notificación' });
  }
};

/* ==========================================
   MARCAR TODAS COMO LEÍDAS
========================================== */
const marcarTodasLeidas = async (req, res) => {
  try {
    const { id: usuario_id } = req.user;

    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('usuario_id', usuario_id)
      .eq('leido', false);

    if (error) throw error;
    res.json({ mensaje: 'Todas marcadas como leídas' });

  } catch (error) {
    console.error('[notificaciones] marcarTodas:', error.message);
    res.status(500).json({ error: 'Error al actualizar notificaciones' });
  }
};

/* ==========================================
   ELIMINAR UNA NOTIFICACIÓN
========================================== */
const eliminarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: usuario_id } = req.user;

    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('id', id)
      .eq('usuario_id', usuario_id);

    if (error) throw error;
    res.json({ mensaje: 'Notificación eliminada' });

  } catch (error) {
    console.error('[notificaciones] eliminar:', error.message);
    res.status(500).json({ error: 'Error al eliminar notificación' });
  }
};

/* ==========================================
   ELIMINAR TODAS
========================================== */
const eliminarTodas = async (req, res) => {
  try {
    const { id: usuario_id } = req.user;

    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('usuario_id', usuario_id);

    if (error) throw error;
    res.json({ mensaje: 'Todas las notificaciones eliminadas' });

  } catch (error) {
    console.error('[notificaciones] eliminarTodas:', error.message);
    res.status(500).json({ error: 'Error al eliminar notificaciones' });
  }
};

/* ==========================================
   CREAR NOTIFICACIÓN (vía API)
========================================== */
const crearNotificacion = async (req, res) => {
  try {
    const { id: usuario_id } = req.user;
    const { mensaje } = req.body;

    if (!mensaje) return res.status(400).json({ error: 'El mensaje es requerido' });

    const { data, error } = await supabase
      .from('notificaciones')
      .insert([{ usuario_id, mensaje, leido: false }])
      .select();

    if (error) throw error;
    res.status(201).json({ mensaje: 'Notificación creada', data });

  } catch (error) {
    console.error('[notificaciones] crear:', error.message);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
};

/* ==========================================
   HELPER INTERNO — usar desde otros controllers
   Ejemplo: await crearNotificacionInterna(usuario_id, 'Tu reporte fue aprobado')
========================================== */
const crearNotificacionInterna = async (usuario_id, mensaje) => {
  try {
    await supabase
      .from('notificaciones')
      .insert([{ usuario_id, mensaje, leido: false }]);
  } catch (err) {
    console.warn('[notificaciones] interna fallida:', err.message);
  }
};

module.exports = {
  obtenerNotificaciones,
  marcarComoLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
  eliminarTodas,
  crearNotificacion,
  crearNotificacionInterna,
};