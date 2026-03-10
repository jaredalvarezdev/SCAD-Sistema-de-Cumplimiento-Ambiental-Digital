const supabase = require('../config/supabase');
const { validarEvidenciaIA } = require('../services/IAevidencia');
const { registrarHistorial } = require('./historialHelper');
const { crearNotificacionInterna } = require('./notificacionesController'); // ← NUEVO

/* ── Helper: obtener id del primer admin ── */
const getAdminId = async () => {
  const { data } = await supabase
    .from('usuarios').select('id').eq('rol_id', 1).limit(1).single();
  return data?.id || null;
};

/* Sanitizar nombre de archivo */
function sanitizarNombre(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\s+/g, '_');
}

/* Obtener tipo de archivo simplificado */
function obtenerTipo(mime) {
  if (!mime) return 'archivo';
  if (mime.includes('pdf'))   return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'docx';
  if (mime.includes('excel') || mime.includes('sheet'))   return 'xlsx';
  if (mime.includes('image/png'))  return 'png';
  if (mime.includes('image/jpeg')) return 'jpg';
  if (mime.includes('image'))      return 'imagen';
  return mime.split('/')[1]?.substring(0, 20) || 'archivo';
}

// ─── Analizar evidencia con IA y actualizar BD (se ejecuta en background) ───

const analizarYActualizar = async (evidenciaId, reporteId, buffer, nombreArchivo) => {
  try {
    console.log(`[IA] Iniciando análisis de evidencia ${evidenciaId}: ${nombreArchivo}`);

    const resultado = await validarEvidenciaIA(buffer, nombreArchivo);

    console.log(`[IA] Resultado: ${resultado.estado_cumplimiento} | Confianza: ${resultado.confianza}% | Nuevo estado reporte: ${resultado.nuevo_estado_reporte}`);

    const analisisJSON = JSON.stringify({
      tipo_documento:              resultado.tipo_documento       || 'No determinado',
      resumen:                     resultado.observacion          || '',
      estado_cumplimiento:         resultado.estado_cumplimiento  || 'REQUIERE_REVISION',
      nivel_riesgo:                resultado.esta_vigente === false ? 'ALTO' : resultado.esta_vigente === true ? 'BAJO' : 'MEDIO',
      puntos_clave:                resultado.normativas_referenciadas || [],
      recomendaciones:             [],
      fechas_encontradas:          [],
      vigencias_encontradas:       [],
      fecha_vencimiento_detectada: resultado.fecha_vencimiento_detectada || null,
      es_ambiental:                resultado.es_ambiental,
      esta_vigente:                resultado.esta_vigente,
      confianza:                   resultado.confianza
    });

    // 1. Actualizar la evidencia con el resultado de la IA
    await supabase
      .from('evidencias')
      .update({
        analisis_ia:         analisisJSON,
        confianza_ia:        resultado.confianza,
        modelo_ia:           'deepseek-chat',
        fecha_validacion_ia: new Date().toISOString()
      })
      .eq('id', evidenciaId);

    // 2. Actualizar el reporte: confianza_ia, validacion_ia y estado_id
    await supabase
      .from('reportes')
      .update({
        validacion_ia:       resultado.observacion,
        confianza_ia:        resultado.confianza,
        modelo_ia:           'deepseek-chat',
        fecha_validacion_ia: new Date().toISOString(),
        estado_id:           resultado.nuevo_estado_reporte
      })
      .eq('id', reporteId);

    console.log(`[IA] Reporte ${reporteId} actualizado → estado ${resultado.nuevo_estado_reporte}`);

    // ← NUEVO: notificar al admin si la IA rechazó (estado_id = 4)
    if (resultado.nuevo_estado_reporte === 4) {
      const { data: reporte } = await supabase
        .from('reportes')
        .select('titulo, empresas(nombre)')
        .eq('id', reporteId)
        .single();

      const adminId = await getAdminId();
      if (adminId) {
        const empresaNombre = reporte?.empresas?.nombre || 'una empresa';
        const reporteTitulo = reporte?.titulo           || `#${reporteId}`;
        await crearNotificacionInterna(adminId,
          `La IA rechazó una evidencia del reporte "${reporteTitulo}" de ${empresaNombre}`);
      }
    }

  } catch (err) {
    console.error(`[IA] Error en análisis background de evidencia ${evidenciaId}:`, err.message);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SUBIR EVIDENCIA CON ARCHIVO (FormData) — análisis IA automático
// ══════════════════════════════════════════════════════════════════════════════

const subirEvidenciaArchivo = async (req, res) => {
  try {
    const { reporte_id } = req.body;
    const { id: usuario_id, empresa_id, rol_id } = req.user;
    const file = req.file;

    if (!reporte_id || !file) {
      return res.status(400).json({ mensaje: 'Faltan campos: reporte_id y archivo' });
    }

    const { data: reporte, error: errorReporte } = await supabase
      .from('reportes')
      .select('id, empresa_id, titulo')
      .eq('id', reporte_id)
      .single();

    if (errorReporte || !reporte) {
      return res.status(404).json({ mensaje: 'Reporte no encontrado' });
    }

    if (rol_id === 2 && reporte.empresa_id !== empresa_id) {
      return res.status(403).json({ mensaje: 'No puedes subir evidencia a este reporte' });
    }

    const nombreSanitizado = sanitizarNombre(file.originalname);
    const rutaStorage = `reporte_${reporte_id}/${Date.now()}_${nombreSanitizado}`;
    const contentType = file.mimetype || 'application/octet-stream';

    console.log('[Upload] Subiendo:', file.originalname, '->', rutaStorage);

    const { error: uploadError } = await supabase.storage
      .from('evidencias')
      .upload(rutaStorage, file.buffer, { contentType, upsert: false });

    if (uploadError) {
      console.error('[Upload] Error Supabase:', uploadError);
      return res.status(400).json({ mensaje: 'Error al subir archivo: ' + uploadError.message });
    }

    const { data: urlData } = supabase.storage
      .from('evidencias')
      .getPublicUrl(rutaStorage);

    const urlArchivo = urlData.publicUrl;

    const { data: evidencia, error: errorBD } = await supabase
      .from('evidencias')
      .insert([{
        reporte_id,
        nombre_archivo: file.originalname,
        tipo_archivo:   obtenerTipo(file.mimetype),
        ruta_archivo:   urlArchivo,
        usuario_id,
        fecha_subida:   new Date().toISOString()
      }])
      .select()
      .single();

    if (errorBD) {
      console.error('[Upload] Error BD:', errorBD);
      return res.status(400).json({ mensaje: errorBD.message });
    }

    console.log(`[Upload] Evidencia guardada: ID ${evidencia.id}`);

    res.status(201).json({
      mensaje: 'Evidencia subida correctamente. Analizando con IA...',
      data: evidencia,
      ia_procesando: true
    });

    registrarHistorial(usuario_id, 'evidencias', 'subir', evidencia.id,
      `Se subió la evidencia "${file.originalname}" al reporte "${reporte.titulo}"`);

    analizarYActualizar(evidencia.id, reporte_id, file.buffer, file.originalname);

  } catch (error) {
    console.error('[Upload] Error general:', error);
    res.status(500).json({ mensaje: 'Error del servidor: ' + error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SUBIR EVIDENCIA JSON (base64) — también con análisis IA automático
// ══════════════════════════════════════════════════════════════════════════════

const subirEvidencia = async (req, res) => {
  try {
    const { reporte_id, nombre_archivo, tipo_archivo, ruta_archivo, mime_type } = req.body;
    const { id: usuario_id, empresa_id, rol_id } = req.user;

    if (!reporte_id || !nombre_archivo || !ruta_archivo)
      return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });

    const { data: reporte, error: errorReporte } = await supabase
      .from('reportes')
      .select('id, empresa_id, titulo')
      .eq('id', reporte_id)
      .single();

    if (errorReporte || !reporte)
      return res.status(404).json({ mensaje: 'Reporte no encontrado' });

    if (rol_id === 2 && reporte.empresa_id !== empresa_id)
      return res.status(403).json({ mensaje: 'No puedes subir evidencia a este reporte' });

    let urlArchivo   = ruta_archivo;
    let bufferParaIA = null;

    if (ruta_archivo.startsWith('data:')) {
      const nombreSanitizado = sanitizarNombre(nombre_archivo);
      const base64Data  = ruta_archivo.split(',')[1];
      bufferParaIA      = Buffer.from(base64Data, 'base64');
      const rutaStorage = `reporte_${reporte_id}/${Date.now()}_${nombreSanitizado}`;
      const contentType = mime_type || 'application/octet-stream';

      const { error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(rutaStorage, bufferParaIA, { contentType, upsert: false });

      if (uploadError)
        return res.status(400).json({ mensaje: 'Error al subir archivo: ' + uploadError.message });

      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(rutaStorage);

      urlArchivo = urlData.publicUrl;
    }

    const { data: evidencia, error } = await supabase
      .from('evidencias')
      .insert([{
        reporte_id,
        nombre_archivo,
        tipo_archivo:  tipo_archivo || null,
        ruta_archivo:  urlArchivo,
        usuario_id,
        fecha_subida:  new Date().toISOString()
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ mensaje: error.message });

    res.status(201).json({
      mensaje: 'Evidencia subida correctamente. Analizando con IA...',
      data: evidencia,
      ia_procesando: true
    });

    registrarHistorial(usuario_id, 'evidencias', 'subir', evidencia.id,
      `Se subió la evidencia "${nombre_archivo}" al reporte "${reporte.titulo}"`);

    if (bufferParaIA) {
      analizarYActualizar(evidencia.id, reporte_id, bufferParaIA, nombre_archivo);
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// VER EVIDENCIAS DE UN REPORTE
// ══════════════════════════════════════════════════════════════════════════════

const verEvidencias = async (req, res) => {
  try {
    const { reporte_id } = req.params;
    const { rol_id, empresa_id } = req.user;

    const { data: reporte } = await supabase
      .from('reportes')
      .select('id, empresa_id')
      .eq('id', reporte_id)
      .single();

    if (!reporte)
      return res.status(404).json({ mensaje: 'Reporte no encontrado' });

    if (rol_id === 2 && reporte.empresa_id !== empresa_id)
      return res.status(403).json({ mensaje: 'No tienes acceso a este reporte' });

    const { data, error } = await supabase
      .from('evidencias')
      .select('*')
      .eq('reporte_id', reporte_id)
      .order('fecha_subida', { ascending: false });

    if (error) return res.status(400).json({ mensaje: error.message });

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ELIMINAR EVIDENCIA
// ══════════════════════════════════════════════════════════════════════════════

const eliminarEvidencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: usuario_id, rol_id, empresa_id } = req.user;

    const { data: evidencia, error: errorGet } = await supabase
      .from('evidencias')
      .select('id, usuario_id, reporte_id, ruta_archivo, nombre_archivo')
      .eq('id', id)
      .single();

    if (errorGet || !evidencia)
      return res.status(404).json({ mensaje: 'Evidencia no encontrada' });

    if (rol_id === 2) {
      const { data: reporte } = await supabase
        .from('reportes')
        .select('empresa_id')
        .eq('id', evidencia.reporte_id)
        .single();

      if (!reporte || reporte.empresa_id !== empresa_id)
        return res.status(403).json({ mensaje: 'No tienes acceso a esta evidencia' });
    }

    if (evidencia.ruta_archivo) {
      try {
        const match = evidencia.ruta_archivo.match(/\/object\/public\/evidencias\/(.+)$/);
        if (match) {
          await supabase.storage.from('evidencias').remove([match[1]]);
        }
      } catch (e) {
        console.warn('[Delete] No se pudo eliminar archivo del storage:', e.message);
      }
    }

    const { error } = await supabase.from('evidencias').delete().eq('id', id);
    if (error) return res.status(500).json({ mensaje: 'Error al eliminar la evidencia' });

    await registrarHistorial(usuario_id, 'evidencias', 'eliminar', parseInt(id),
      `Se eliminó la evidencia "${evidencia.nombre_archivo}"`);

    res.json({ mensaje: 'Evidencia eliminada correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

module.exports = {
  subirEvidenciaArchivo,
  subirEvidencia,
  verEvidencias,
  eliminarEvidencia
};