const { createClient } = require('@supabase/supabase-js');
const { extraerDelArchivo } = require('../services/extraccionService');
const { generarPDFAnalisis, generarPDFConsolidado } = require('../services/pdfGeneratorService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ─── HELPER: descargar archivo de Supabase Storage ─────────────────────────

const descargarArchivo = async (url) => {
  const match = url.match(/\/object\/public\/([^\/]+)\/(.+)$/);
  if (!match) throw new Error(`Formato de URL no reconocido: ${url}`);

  const bucket = match[1];
  const ruta   = match[2];

  const { data, error } = await supabase.storage.from(bucket).download(ruta);
  if (error || !data) throw new Error(`No se pudo descargar: ${error?.message}`);

  const buffer = Buffer.from(await data.arrayBuffer());
  return { buffer, bucket, ruta };
};

// ─── HELPER: subir PDF a Storage y obtener URL pública ─────────────────────

const subirPDF = async (pdfBuffer, bucket, rutaPDF) => {
  const { error } = await supabase
    .storage
    .from(bucket)
    .upload(rutaPDF, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (error) console.warn('[SCAD] Advertencia al subir PDF:', error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(rutaPDF);
  return data?.publicUrl || null;
};

// ─── HELPER: obtener o crear tipo de reporte documental ────────────────────

const obtenerTipoReporte = async (nombre) => {
  const { data: existente } = await supabase
    .from('tipos_reportes_documentales')
    .select('id')
    .eq('nombre', nombre)
    .eq('activo', true)
    .single();

  if (existente) return existente.id;

  const { data: nuevo, error } = await supabase
    .from('tipos_reportes_documentales')
    .insert({
      nombre,
      descripcion: `Reporte generado automáticamente por análisis IA de SCAD`,
      formato: 'PDF',
      activo: true,
      creado_en: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) throw new Error(`No se pudo crear tipo de reporte: ${error.message}`);
  return nuevo.id;
};

// ══════════════════════════════════════════════════════════════════════════════
// 1. ANALIZAR UNA SOLA EVIDENCIA
//    POST /api/reportes-generados/analizar-evidencia/:evidencia_id
// ══════════════════════════════════════════════════════════════════════════════

const analizarEvidencia = async (req, res) => {
  const { evidencia_id } = req.params;
  const usuario_id = req.usuario?.id;

  try {
    // 1. Obtener evidencia con datos de empresa
    const { data: evidencia, error: errEv } = await supabase
      .from('evidencias')
      .select(`*, reportes ( id, titulo, empresa_id, empresas ( nombre ) )`)
      .eq('id', evidencia_id)
      .single();

    if (errEv || !evidencia) {
      return res.status(404).json({ error: 'Evidencia no encontrada' });
    }
    if (!evidencia.ruta_archivo) {
      return res.status(400).json({ error: 'La evidencia no tiene archivo adjunto' });
    }

    // 2. Descargar archivo
    const { buffer, bucket } = await descargarArchivo(evidencia.ruta_archivo);
    const nombreArchivo = evidencia.nombre_archivo || evidencia.ruta_archivo.split('/').pop();
    const nombreEmpresa = evidencia.reportes?.empresas?.nombre || 'No especificada';

    // 3. Extraer y analizar con IA
    console.log(`[SCAD] Analizando evidencia ${evidencia_id}: ${nombreArchivo}`);
    const extraccion = await extraerDelArchivo(buffer, nombreArchivo);

    // Asegurar confianza válida
    const confianza = extraccion.analisis_ia?.confianza || 50;

    // 4. Generar PDF del análisis individual
    const pdfBuffer = await generarPDFAnalisis({
      nombre_archivo:        nombreArchivo,
      empresa:               nombreEmpresa,
      total_caracteres:      extraccion.total_caracteres,
      fechas_encontradas:    extraccion.fechas_encontradas,
      vigencias_encontradas: extraccion.vigencias_encontradas,
      analisis_ia:           extraccion.analisis_ia
    });

    // 5. Subir PDF al bucket en carpeta reportes_ia/
    const nombrePDF = `analisis_ev${evidencia_id}_${Date.now()}.pdf`;
    const pdfUrl = await subirPDF(pdfBuffer, bucket, `reportes_ia/${nombrePDF}`);

    // 6. Actualizar evidencia con resultado del análisis
    const analisisTexto = JSON.stringify({
      tipo_documento:        extraccion.analisis_ia.tipo_documento,
      resumen:               extraccion.analisis_ia.resumen,
      estado_cumplimiento:   extraccion.analisis_ia.estado_cumplimiento,
      nivel_riesgo:          extraccion.analisis_ia.nivel_riesgo,
      puntos_clave:          extraccion.analisis_ia.puntos_clave,
      recomendaciones:       extraccion.analisis_ia.recomendaciones,
      fechas_encontradas:    extraccion.fechas_encontradas,
      vigencias_encontradas: extraccion.vigencias_encontradas,
      pdf_analisis_url:      pdfUrl
    });

    await supabase
      .from('evidencias')
      .update({
        analisis_ia:         analisisTexto,
        confianza_ia:        confianza,
        modelo_ia:           'deepseek-chat',
        fecha_validacion_ia: new Date().toISOString()
      })
      .eq('id', evidencia_id);

    // 7. Registrar en reportes_generados
    const tipoReporteId = await obtenerTipoReporte('Análisis IA - Evidencia Individual');

    const { data: reporteGenerado, error: errRG } = await supabase
      .from('reportes_generados')
      .insert({
        empresa_id:      evidencia.reportes?.empresa_id,
        tipo_reporte_id: tipoReporteId,
        ruta_archivo:    pdfUrl,
        generado_por:    usuario_id,
        creado_en:       new Date().toISOString()
      })
      .select('id')
      .single();

    if (errRG) console.warn('[SCAD] No se pudo registrar en reportes_generados:', errRG.message);

    console.log(`[SCAD] Evidencia ${evidencia_id} analizada correctamente`);

    return res.json({
      ok: true,
      mensaje: 'Evidencia analizada correctamente',
      reporte_generado_id: reporteGenerado?.id || null,
      resultado: {
        nombre_archivo:        nombreArchivo,
        empresa:               nombreEmpresa,
        total_caracteres:      extraccion.total_caracteres,
        fechas_encontradas:    extraccion.fechas_encontradas,
        vigencias_encontradas: extraccion.vigencias_encontradas,
        analisis_ia:           extraccion.analisis_ia,
        pdf_url:               pdfUrl
      }
    });

  } catch (error) {
    console.error('[SCAD] Error al analizar evidencia:', error.message);
    return res.status(500).json({
      error: 'Error interno al analizar la evidencia',
      detalle: error.message
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. GENERAR REPORTE CONSOLIDADO DE UN REPORTE COMPLETO
//    POST /api/reportes-generados/consolidado/:reporte_id
// ══════════════════════════════════════════════════════════════════════════════

const generarConsolidado = async (req, res) => {
  const { reporte_id } = req.params;
  const usuario_id = req.usuario?.id;

  try {
    // 1. Obtener el reporte con empresa y estado
    const { data: reporte, error: errReporte } = await supabase
      .from('reportes')
      .select(`
        *,
        empresas ( id, nombre, rfc, ciudad, estado ),
        estados_reporte ( nombre )
      `)
      .eq('id', reporte_id)
      .single();

    if (errReporte || !reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // 2. Obtener todas las evidencias del reporte
    const { data: evidencias, error: errEv } = await supabase
      .from('evidencias')
      .select('*')
      .eq('reporte_id', reporte_id);

    if (errEv) {
      return res.status(500).json({ error: 'Error al obtener evidencias', detalle: errEv.message });
    }

    if (!evidencias || evidencias.length === 0) {
      return res.status(400).json({ error: 'El reporte no tiene evidencias adjuntas' });
    }

    // 3. Analizar evidencias que aún no tienen análisis IA
    console.log(`[SCAD] Procesando ${evidencias.length} evidencia(s) del reporte ${reporte_id}`);

    const resultadosEvidencias = [];
    let bucketRef = 'evidencias';

    for (const evidencia of evidencias) {
      if (!evidencia.ruta_archivo) continue;

      try {
        if (evidencia.analisis_ia) {
          const analisisPrevio = JSON.parse(evidencia.analisis_ia);
          resultadosEvidencias.push({
            nombre_archivo:        evidencia.nombre_archivo,
            analisis_ia:           analisisPrevio,
            fechas_encontradas:    analisisPrevio.fechas_encontradas    || [],
            vigencias_encontradas: analisisPrevio.vigencias_encontradas || [],
            total_caracteres:      0,
            ya_analizada:          true
          });
          continue;
        }

        const { buffer, bucket } = await descargarArchivo(evidencia.ruta_archivo);
        bucketRef = bucket;
        const nombreArchivo = evidencia.nombre_archivo || evidencia.ruta_archivo.split('/').pop();
        const extraccion = await extraerDelArchivo(buffer, nombreArchivo);

        const confianza = extraccion.analisis_ia?.confianza || 50;

        const analisisTexto = JSON.stringify({
          tipo_documento:        extraccion.analisis_ia.tipo_documento,
          resumen:               extraccion.analisis_ia.resumen,
          estado_cumplimiento:   extraccion.analisis_ia.estado_cumplimiento,
          nivel_riesgo:          extraccion.analisis_ia.nivel_riesgo,
          puntos_clave:          extraccion.analisis_ia.puntos_clave,
          recomendaciones:       extraccion.analisis_ia.recomendaciones,
          fechas_encontradas:    extraccion.fechas_encontradas,
          vigencias_encontradas: extraccion.vigencias_encontradas,
          pdf_analisis_url:      null
        });

        await supabase
          .from('evidencias')
          .update({
            analisis_ia:         analisisTexto,
            confianza_ia:        confianza,
            modelo_ia:           'deepseek-chat',
            fecha_validacion_ia: new Date().toISOString()
          })
          .eq('id', evidencia.id);

        resultadosEvidencias.push({
          nombre_archivo:        nombreArchivo,
          analisis_ia:           extraccion.analisis_ia,
          fechas_encontradas:    extraccion.fechas_encontradas,
          vigencias_encontradas: extraccion.vigencias_encontradas,
          total_caracteres:      extraccion.total_caracteres,
          ya_analizada:          false
        });

      } catch (errEvidencia) {
        console.warn(`[SCAD] No se pudo procesar evidencia ${evidencia.id}:`, errEvidencia.message);
        resultadosEvidencias.push({
          nombre_archivo: evidencia.nombre_archivo || 'Desconocido',
          error: errEvidencia.message,
          analisis_ia: null,
          ya_analizada: false
        });
      }
    }

    // 4. Calcular métricas consolidadas
    const analizadas   = resultadosEvidencias.filter(r => r.analisis_ia);
    const cumple       = analizadas.filter(r => r.analisis_ia?.estado_cumplimiento === 'CUMPLE').length;
    const noCumple     = analizadas.filter(r => r.analisis_ia?.estado_cumplimiento === 'NO_CUMPLE').length;
    const enRevision   = analizadas.filter(r => r.analisis_ia?.estado_cumplimiento === 'REQUIERE_REVISION').length;
    const riesgosAltos = analizadas.filter(r => r.analisis_ia?.nivel_riesgo === 'ALTO').length;

    const estadoGeneral =
      noCumple > 0   ? 'NO_CUMPLE'          :
      enRevision > 0 ? 'REQUIERE_REVISION'  : 'CUMPLE';

    const nivelRiesgoGeneral =
      riesgosAltos > 0 ? 'ALTO'  :
      analizadas.some(r => r.analisis_ia?.nivel_riesgo === 'MEDIO') ? 'MEDIO' : 'BAJO';

    // Calcular confianza promedio real
    const confianzaPromedio = analizadas.length > 0
      ? Math.round(
          analizadas.reduce((sum, r) => sum + (r.analisis_ia?.confianza || 50), 0) / analizadas.length
        )
      : 0;

    // 5. Generar PDF consolidado
    console.log('[SCAD] Generando PDF consolidado...');
    const pdfBuffer = await generarPDFConsolidado({
      reporte,
      empresa: reporte.empresas,
      evidencias: resultadosEvidencias,
      metricas: { cumple, noCumple, enRevision, riesgosAltos, estadoGeneral, nivelRiesgoGeneral }
    });

    // 6. Subir PDF consolidado
    const nombrePDF = `consolidado_reporte${reporte_id}_${Date.now()}.pdf`;
    const pdfUrl = await subirPDF(pdfBuffer, bucketRef, `reportes_consolidados/${nombrePDF}`);

    // 7. Actualizar validacion_ia en reportes con confianza real
    await supabase
      .from('reportes')
      .update({
        validacion_ia:       estadoGeneral,
        confianza_ia:        confianzaPromedio,
        modelo_ia:           'deepseek-chat',
        fecha_validacion_ia: new Date().toISOString()
      })
      .eq('id', reporte_id);

    // 8. Registrar en reportes_generados
    const tipoReporteId = await obtenerTipoReporte('Análisis IA - Reporte Consolidado');

    const { data: reporteGenerado, error: errRG } = await supabase
      .from('reportes_generados')
      .insert({
        empresa_id:      reporte.empresa_id,
        tipo_reporte_id: tipoReporteId,
        ruta_archivo:    pdfUrl,
        generado_por:    usuario_id,
        creado_en:       new Date().toISOString()
      })
      .select('id')
      .single();

    if (errRG) console.warn('[SCAD] No se pudo registrar en reportes_generados:', errRG.message);

    console.log(`[SCAD] Reporte consolidado generado para reporte ${reporte_id}`);

    return res.json({
      ok: true,
      mensaje: 'Reporte consolidado generado correctamente',
      reporte_generado_id: reporteGenerado?.id || null,
      pdf_url: pdfUrl,
      metricas: { cumple, noCumple, enRevision, riesgosAltos, estadoGeneral, nivelRiesgoGeneral },
      total_evidencias: evidencias.length,
      evidencias_analizadas: analizadas.length
    });

  } catch (error) {
    console.error('[SCAD] Error al generar consolidado:', error.message);
    return res.status(500).json({
      error: 'Error interno al generar el reporte consolidado',
      detalle: error.message
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. LISTAR REPORTES GENERADOS (con filtros)
//    GET /api/reportes-generados
//    GET /api/reportes-generados?empresa_id=X
// ══════════════════════════════════════════════════════════════════════════════

const listarReportesGenerados = async (req, res) => {
  const { empresa_id, tipo_reporte_id, limit = 50, offset = 0 } = req.query;
  const usuario = req.usuario;

  try {
    let query = supabase
      .from('reportes_generados')
      .select(`
        *,
        empresas ( nombre, ciudad ),
        tipos_reportes_documentales ( nombre, formato ),
        usuarios ( nombre, email )
      `)
      .order('creado_en', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (usuario?.rol_id === 2 && usuario?.empresa_id) {
      query = query.eq('empresa_id', usuario.empresa_id);
    } else if (empresa_id) {
      query = query.eq('empresa_id', empresa_id);
    }

    if (tipo_reporte_id) {
      query = query.eq('tipo_reporte_id', tipo_reporte_id);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true, total: data.length, reportes: data });

  } catch (error) {
    return res.status(500).json({ error: 'Error al listar reportes generados', detalle: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. VER UN REPORTE GENERADO POR ID
//    GET /api/reportes-generados/:id
// ══════════════════════════════════════════════════════════════════════════════

const verReporteGenerado = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('reportes_generados')
      .select(`
        *,
        empresas ( nombre, rfc, ciudad, estado ),
        tipos_reportes_documentales ( nombre, descripcion, formato ),
        usuarios ( nombre, email )
      `)
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Reporte generado no encontrado' });

    return res.json({ ok: true, reporte: data });

  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el reporte', detalle: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 5. LISTAR TIPOS DE REPORTES DOCUMENTALES
//    GET /api/reportes-generados/tipos
// ══════════════════════════════════════════════════════════════════════════════

const listarTipos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tipos_reportes_documentales')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true, tipos: data });

  } catch (error) {
    return res.status(500).json({ error: 'Error al listar tipos', detalle: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 6. ELIMINAR REPORTE GENERADO
//    DELETE /api/reportes-generados/:id
// ══════════════════════════════════════════════════════════════════════════════

const eliminarReporteGenerado = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('reportes_generados')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true, mensaje: 'Reporte generado eliminado correctamente' });

  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar', detalle: error.message });
  }
};

module.exports = {
  analizarEvidencia,
  generarConsolidado,
  listarReportesGenerados,
  verReporteGenerado,
  listarTipos,
  eliminarReporteGenerado
};