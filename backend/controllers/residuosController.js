const supabase = require('../config/supabase');
const { generarPDFResiduos } = require('../services/pdfResiduosService');

// ─── HELPER: subir PDF a Storage ────────────────────────────────────────────
const subirPDF = async (pdfBuffer, nombrePDF) => {
  const { error } = await supabase.storage
    .from('evidencias')
    .upload(`reportes_residuos/${nombrePDF}`, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) console.warn('[Residuos] Error al subir PDF:', error.message);

  const { data } = supabase.storage
    .from('evidencias')
    .getPublicUrl(`reportes_residuos/${nombrePDF}`);

  return data?.publicUrl || null;
};

// ─── HELPER: obtener o crear tipo de reporte documental ─────────────────────
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
      descripcion: 'Reporte formal de residuos sólidos generado por SCAD',
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
// 1. LISTAR TIPOS DE RESIDUOS (catálogo)
//    GET /api/residuos/tipos
// ══════════════════════════════════════════════════════════════════════════════
const listarTipos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('residuos_tipos')
      .select('*')
      .eq('activo', true)
      .order('categoria')
      .order('nombre');

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, tipos: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. GUARDAR PERÍODO DEL REPORTE
//    POST /api/residuos/periodo
// ══════════════════════════════════════════════════════════════════════════════
const guardarPeriodo = async (req, res) => {
  const {
    reporte_id, periodo_inicio, periodo_fin,
    responsable_nombre, responsable_cargo,
    responsable_firma, num_generador, observaciones_gral
  } = req.body;
  const { empresa_id } = req.user;

  if (!reporte_id || !periodo_inicio || !periodo_fin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: reporte_id, periodo_inicio, periodo_fin' });
  }

  try {
    // Verificar que el reporte pertenece a la empresa
    const { data: reporte } = await supabase
      .from('reportes')
      .select('id, empresa_id')
      .eq('id', reporte_id)
      .single();

    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });
    if (reporte.empresa_id !== empresa_id) return res.status(403).json({ error: 'Sin acceso a este reporte' });

    // Upsert: si ya existe un período para este reporte, actualizarlo
    const { data: existente } = await supabase
      .from('residuos_periodos')
      .select('id')
      .eq('reporte_id', reporte_id)
      .single();

    let data, error;

    if (existente) {
      ({ data, error } = await supabase
        .from('residuos_periodos')
        .update({
          periodo_inicio, periodo_fin,
          responsable_nombre, responsable_cargo,
          responsable_firma: responsable_firma || false,
          num_generador, observaciones_gral
        })
        .eq('id', existente.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('residuos_periodos')
        .insert({
          reporte_id, empresa_id,
          periodo_inicio, periodo_fin,
          responsable_nombre, responsable_cargo,
          responsable_firma: responsable_firma || false,
          num_generador, observaciones_gral,
          creado_en: new Date().toISOString()
        })
        .select()
        .single());
    }

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true, periodo: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. OBTENER PERÍODO DE UN REPORTE
//    GET /api/residuos/periodo/:reporte_id
// ══════════════════════════════════════════════════════════════════════════════
const obtenerPeriodo = async (req, res) => {
  const { reporte_id } = req.params;
  try {
    const { data, error } = await supabase
      .from('residuos_periodos')
      .select('*')
      .eq('reporte_id', reporte_id)
      .single();

    if (error) return res.json({ ok: true, periodo: null });
    return res.json({ ok: true, periodo: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. AGREGAR REGISTRO DE RESIDUO
//    POST /api/residuos/registro
// ══════════════════════════════════════════════════════════════════════════════
const agregarRegistro = async (req, res) => {
  const {
    reporte_id, tipo_residuo_id, cantidad, unidad_medida,
    metodo_disposicion, empresa_transportista, destino_final,
    num_manifiesto, fecha_generacion, fecha_disposicion, observaciones
  } = req.body;
  const { id: creado_por, empresa_id } = req.user;

  if (!reporte_id || !tipo_residuo_id || !cantidad || !fecha_generacion) {
    return res.status(400).json({ error: 'Faltan campos: reporte_id, tipo_residuo_id, cantidad, fecha_generacion' });
  }

  try {
    const { data, error } = await supabase
      .from('residuos_registros')
      .insert({
        reporte_id, empresa_id, tipo_residuo_id,
        cantidad, unidad_medida: unidad_medida || 'kg',
        metodo_disposicion, empresa_transportista,
        destino_final, num_manifiesto,
        fecha_generacion, fecha_disposicion,
        observaciones, creado_por,
        creado_en: new Date().toISOString()
      })
      .select(`
        *,
        residuos_tipos ( nombre, categoria, peligroso, clave_semarnat )
      `)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ ok: true, registro: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 5. LISTAR REGISTROS DE UN REPORTE
//    GET /api/residuos/registros/:reporte_id
// ══════════════════════════════════════════════════════════════════════════════
const listarRegistros = async (req, res) => {
  const { reporte_id } = req.params;
  try {
    const { data, error } = await supabase
      .from('residuos_registros')
      .select(`
        *,
        residuos_tipos ( nombre, categoria, peligroso, clave_semarnat, unidad_medida )
      `)
      .eq('reporte_id', reporte_id)
      .order('fecha_generacion', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, registros: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 6. ELIMINAR REGISTRO
//    DELETE /api/residuos/registro/:id
// ══════════════════════════════════════════════════════════════════════════════
const eliminarRegistro = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('residuos_registros')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, mensaje: 'Registro eliminado correctamente' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 7. GENERAR PDF FORMAL DE RESIDUOS SÓLIDOS
//    POST /api/residuos/generar-pdf/:reporte_id
// ══════════════════════════════════════════════════════════════════════════════
const generarPDF = async (req, res) => {
  const { reporte_id } = req.params;
  const { id: usuario_id, empresa_id } = req.user;

  try {
    // 1. Obtener reporte con empresa
    const { data: reporte, error: errR } = await supabase
      .from('reportes')
      .select(`*, empresas ( * ), estados_reporte ( nombre )`)
      .eq('id', reporte_id)
      .single();

    if (errR || !reporte) return res.status(404).json({ error: 'Reporte no encontrado' });

    // 2. Obtener período
    const { data: periodo } = await supabase
      .from('residuos_periodos')
      .select('*')
      .eq('reporte_id', reporte_id)
      .single();

    if (!periodo) {
      return res.status(400).json({ error: 'El reporte no tiene período configurado. Completa primero los datos del período.' });
    }

    // 3. Obtener todos los registros de residuos
    const { data: registros, error: errReg } = await supabase
      .from('residuos_registros')
      .select(`*, residuos_tipos ( nombre, categoria, peligroso, clave_semarnat )`)
      .eq('reporte_id', reporte_id)
      .order('fecha_generacion');

    if (errReg) return res.status(500).json({ error: errReg.message });
    if (!registros || registros.length === 0) {
      return res.status(400).json({ error: 'No hay registros de residuos. Agrega al menos un residuo antes de generar el PDF.' });
    }

    // 4. Calcular totales por categoría
    const totales = {};
    let totalGeneral = 0;
    registros.forEach(r => {
      const cat = r.residuos_tipos?.categoria || 'Sin categoría';
      if (!totales[cat]) totales[cat] = { cantidad: 0, unidad: r.unidad_medida || 'kg', registros: 0 };
      totales[cat].cantidad  += parseFloat(r.cantidad);
      totales[cat].registros += 1;
      totalGeneral           += parseFloat(r.cantidad);
    });

    // 5. Generar PDF
    console.log(`[Residuos] Generando PDF para reporte ${reporte_id} con ${registros.length} registros`);
    const pdfBuffer = await generarPDFResiduos({
      reporte,
      empresa: reporte.empresas,
      periodo,
      registros,
      totales,
      totalGeneral
    });

    // 6. Subir PDF al storage
    const nombrePDF = `residuos_reporte${reporte_id}_${Date.now()}.pdf`;
    const pdfUrl = await subirPDF(pdfBuffer, nombrePDF);

    // 7. Registrar en reportes_generados
    const tipoReporteId = await obtenerTipoReporte('Reporte de Residuos Sólidos');

    const { data: reporteGenerado } = await supabase
      .from('reportes_generados')
      .insert({
        empresa_id,
        tipo_reporte_id: tipoReporteId,
        ruta_archivo:    pdfUrl,
        generado_por:    usuario_id,
        creado_en:       new Date().toISOString()
      })
      .select('id')
      .single();

    console.log(`[Residuos] PDF generado correctamente → ${pdfUrl}`);

    return res.json({
      ok: true,
      mensaje: 'PDF de residuos generado correctamente',
      pdf_url: pdfUrl,
      reporte_generado_id: reporteGenerado?.id || null,
      total_registros: registros.length,
      total_general: totalGeneral,
      totales_por_categoria: totales
    });

  } catch (err) {
    console.error('[Residuos] Error al generar PDF:', err.message);
    return res.status(500).json({ error: 'Error al generar el PDF de residuos', detalle: err.message });
  }
};

module.exports = {
  listarTipos,
  guardarPeriodo,
  obtenerPeriodo,
  agregarRegistro,
  listarRegistros,
  eliminarRegistro,
  generarPDF
};