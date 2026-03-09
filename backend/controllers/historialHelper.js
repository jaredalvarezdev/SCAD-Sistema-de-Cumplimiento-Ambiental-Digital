const supabase = require('../config/supabase')

/**
 * Registra una acción en historial_cambios
 * @param {number} usuario_id
 * @param {string} tabla_afectada  — 'reportes' | 'evidencias' | 'usuarios' | 'empresas' | 'auditorias'
 * @param {string} accion          — 'crear' | 'editar' | 'eliminar' | 'cambiar_estado' | 'subir' | 'observacion'
 * @param {number} registro_id
 * @param {string} descripcion_detallada
 */
const registrarHistorial = async (usuario_id, tabla_afectada, accion, registro_id, descripcion_detallada) => {
  try {
    await supabase.from('historial_cambios').insert([{
      usuario_id,
      tabla_afectada,
      accion,
      registro_id,
      descripcion_detallada,
      fecha: new Date().toISOString()
    }])
  } catch (err) {
    console.warn('[Historial] Error al registrar:', err.message)
  }
}

module.exports = { registrarHistorial }