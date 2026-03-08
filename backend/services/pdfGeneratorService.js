const PDFDocument = require('pdfkit');

// ── Paleta de colores SCAD ───────────────────────────────────────────────────
const VERDE    = '#2E7D32';
const VERDE_CL = '#E8F5E9';
const GRIS     = '#455A64';
const ROJO     = '#C62828';
const NARANJA  = '#E65100';
const NEGRO    = '#212121';
const AZUL     = '#1565C0';
const AZUL_CL  = '#E3F2FD';

const colorEstado = (e) =>
  e === 'CUMPLE' ? VERDE : e === 'NO_CUMPLE' ? ROJO : NARANJA;

const colorRiesgo = (r) =>
  r === 'BAJO' ? VERDE : r === 'ALTO' ? ROJO : NARANJA;

const fechaFormato = () =>
  new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

// Altura máxima antes del pie de página
const MAX_Y = 740;

// ─── Encabezado reutilizable ─────────────────────────────────────────────────
const dibujarEncabezado = (doc, subtitulo) => {
  doc.rect(0, 0, 595, 90).fill(VERDE);
  doc.fillColor('white')
     .fontSize(22).font('Helvetica-Bold').text('SCAD', 50, 20)
     .fontSize(11).font('Helvetica').text('Sistema de Cumplimiento Ambiental Digital', 50, 48)
     .fontSize(10).text(subtitulo, 50, 65)
     .text(`Generado: ${fechaFormato()}`, 350, 55, { align: 'right', width: 195 });
};

// ─── Pie de página (se dibuja al final, en la posición actual) ──────────────
const dibujarPie = (doc, texto) => {
  const y = doc.y + 20;
  doc.rect(0, y, 595, 45).fill(GRIS);
  doc.fillColor('white').fontSize(8).font('Helvetica')
     .text('SCAD - Sistema de Cumplimiento Ambiental Digital', 50, y + 8, { align: 'center', width: 495 })
     .text(texto, 50, y + 22, { align: 'center', width: 495 });
};

// ─── Línea separadora con título ────────────────────────────────────────────
const seccion = (doc, titulo, y) => {
  doc.fillColor(NEGRO).fontSize(13).font('Helvetica-Bold').text(titulo, 50, y);
  doc.moveTo(50, y + 17).lineTo(545, y + 17).strokeColor(VERDE).lineWidth(2).stroke();
  return y + 25;
};

// ─── Nueva página con encabezado ─────────────────────────────────────────────
const nuevaPagina = (doc, subtitulo) => {
  doc.addPage();
  dibujarEncabezado(doc, subtitulo);
  return 110;
};

// ══════════════════════════════════════════════════════════════════════════════
// PDF 1: ANÁLISIS INDIVIDUAL DE UNA EVIDENCIA
// ══════════════════════════════════════════════════════════════════════════════

const generarPDFAnalisis = (datos) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
      const buffers = [];

      doc.on('data', c => buffers.push(c));
      doc.on('end',  () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const SUB = 'Reporte de Análisis Automatizado - Evidencia Individual';

      // Encabezado
      dibujarEncabezado(doc, SUB);
      let y = 110;

      // ── Información del documento ──────────────────────────────────────────
      y = seccion(doc, 'Información del Documento', y);
      doc.rect(50, y, 495, 70).fill(VERDE_CL);
      doc.fillColor(NEGRO).fontSize(10).font('Helvetica')
         .text(`Archivo:         ${datos.nombre_archivo}`,             62, y + 10)
         .text(`Tipo detectado:  ${datos.analisis_ia.tipo_documento}`, 62, y + 25)
         .text(`Caracteres:      ${datos.total_caracteres.toLocaleString()}`, 62, y + 40)
         .text(`Empresa:         ${datos.empresa || 'No especificada'}`, 310, y + 10)
         .text(`Fechas halladas: ${datos.fechas_encontradas.length}`,   310, y + 25)
         .text(`Vigencias:       ${datos.vigencias_encontradas.length}`, 310, y + 40);
      y += 85;

      // ── Estado y riesgo ────────────────────────────────────────────────────
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      y = seccion(doc, 'Resultado del Análisis', y);
      doc.rect(50, y, 235, 55).fill(colorEstado(datos.analisis_ia.estado_cumplimiento));
      doc.fillColor('white')
         .fontSize(9).font('Helvetica').text('ESTADO DE CUMPLIMIENTO', 62, y + 8)
         .fontSize(15).font('Helvetica-Bold').text(datos.analisis_ia.estado_cumplimiento, 62, y + 26);
      doc.rect(310, y, 235, 55).fill(colorRiesgo(datos.analisis_ia.nivel_riesgo));
      doc.fillColor('white')
         .fontSize(9).font('Helvetica').text('NIVEL DE RIESGO', 322, y + 8)
         .fontSize(15).font('Helvetica-Bold').text(datos.analisis_ia.nivel_riesgo, 322, y + 26);
      y += 70;

      // ── Resumen ───────────────────────────────────────────────────────────
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      y = seccion(doc, 'Resumen del Documento', y);
      doc.fillColor(GRIS).fontSize(10).font('Helvetica')
         .text(datos.analisis_ia.resumen, 50, y, { width: 495, align: 'justify' });
      y = doc.y + 15;

      // ── Fechas encontradas ────────────────────────────────────────────────
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      y = seccion(doc, 'Fechas Encontradas', y);
      if (datos.fechas_encontradas.length === 0) {
        doc.fillColor(GRIS).fontSize(10).font('Helvetica')
           .text('No se encontraron fechas en el documento.', 50, y);
        y += 20;
      } else {
        const cols = 3;
        datos.fechas_encontradas.slice(0, 15).forEach((fecha, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const xPos = 50 + col * 165;
          const yPos = y + row * 22;
          if (yPos > MAX_Y) return;
          doc.rect(xPos, yPos, 158, 18).fill('#F1F8E9');
          doc.fillColor(VERDE).fontSize(9).font('Helvetica')
             .text(`• ${fecha}`, xPos + 5, yPos + 5, { width: 148 });
        });
        y += (Math.ceil(datos.fechas_encontradas.length / cols)) * 22 + 10;
      }

      // ── Vigencias ─────────────────────────────────────────────────────────
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      y = seccion(doc, 'Vigencias Detectadas', y + 5);
      if (datos.vigencias_encontradas.length === 0) {
        doc.fillColor(GRIS).fontSize(10).font('Helvetica')
           .text('No se encontraron vigencias en el documento.', 50, y);
        y += 20;
      } else {
        datos.vigencias_encontradas.forEach(v => {
          if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
          doc.rect(50, y, 495, 18).fill('#FFF8E1');
          doc.fillColor(NARANJA).fontSize(9).font('Helvetica')
             .text(`⏱ ${v}`, 55, y + 5, { width: 485 });
          y += 22;
        });
      }

      // ── Puntos clave ──────────────────────────────────────────────────────
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      y = seccion(doc, 'Puntos Clave del Análisis IA', y + 5);
      (datos.analisis_ia.puntos_clave || []).forEach((punto, i) => {
        if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
        doc.rect(50, y, 495, 20).fill(i % 2 === 0 ? '#F5F5F5' : 'white');
        doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
           .text(`• ${punto}`, 58, y + 6, { width: 479 });
        y += 22;
      });

      // ── Recomendaciones ───────────────────────────────────────────────────
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      y += 5;
      doc.rect(50, y, 495, 22).fill(VERDE);
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold')
         .text('Recomendaciones', 58, y + 5);
      y += 27;
      (datos.analisis_ia.recomendaciones || []).forEach(rec => {
        if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
        doc.rect(50, y, 8, 16).fill(VERDE);
        doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
           .text(rec, 65, y + 3, { width: 480 });
        y += 22;
      });

      // ── Pie de página ─────────────────────────────────────────────────────
      dibujarPie(doc, `Confianza del análisis: ${datos.analisis_ia.confianza || 0}%`);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// PDF 2: REPORTE CONSOLIDADO DE TODAS LAS EVIDENCIAS
// ══════════════════════════════════════════════════════════════════════════════

const generarPDFConsolidado = ({ reporte, empresa, evidencias, metricas }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
      const buffers = [];

      doc.on('data', c => buffers.push(c));
      doc.on('end',  () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const SUB = 'Reporte Consolidado de Cumplimiento Ambiental';

      // ── Encabezado ────────────────────────────────────────────────────────
      dibujarEncabezado(doc, SUB);
      let y = 110;

      // ── Datos del reporte ─────────────────────────────────────────────────
      y = seccion(doc, 'Datos del Reporte', y);
      doc.rect(50, y, 495, 80).fill(AZUL_CL);
      doc.fillColor(NEGRO).fontSize(10).font('Helvetica')
         .text(`Reporte:   ${reporte.titulo}`,                              62, y + 10)
         .text(`Empresa:   ${empresa?.nombre || 'No especificada'}`,        62, y + 25)
         .text(`RFC:       ${empresa?.rfc    || 'N/A'}`,                    62, y + 40)
         .text(`Ciudad:    ${empresa?.ciudad || 'N/A'}, ${empresa?.estado || ''}`, 62, y + 55)
         .text(`Estado del reporte: aprobado`,                              310, y + 10)
         .text(`Evidencias analizadas: ${evidencias.length}`,               310, y + 25)
         .text(`Fecha de creación: ${new Date(reporte.fecha_creacion).toLocaleDateString('es-MX')}`, 310, y + 40);
      y += 95;

      // ── Resumen ejecutivo ─────────────────────────────────────────────────
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      y = seccion(doc, 'Resumen Ejecutivo', y);

      const estColor = colorEstado(metricas.estadoGeneral);
      doc.rect(50, y, 495, 65).fill(estColor);
      doc.fillColor('white')
         .fontSize(11).font('Helvetica').text('ESTADO GENERAL DE CUMPLIMIENTO', 62, y + 8)
         .fontSize(20).font('Helvetica-Bold').text(metricas.estadoGeneral, 62, y + 28)
         .fontSize(9).font('Helvetica').text(`Riesgo general: ${metricas.nivelRiesgoGeneral}`, 62, y + 52);
      y += 78;

      // Métricas en 4 cajas
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      const cajaW = 115;
      const cajas = [
        { label: 'CUMPLEN',     valor: metricas.cumple,       color: VERDE   },
        { label: 'NO CUMPLEN',  valor: metricas.noCumple,     color: ROJO    },
        { label: 'EN REVISIÓN', valor: metricas.enRevision,   color: NARANJA },
        { label: 'RIESGO ALTO', valor: metricas.riesgosAltos, color: ROJO    }
      ];
      cajas.forEach((c, i) => {
        const xC = 50 + i * (cajaW + 6);
        doc.rect(xC, y, cajaW, 55).fill(c.color);
        doc.fillColor('white')
           .fontSize(8).font('Helvetica').text(c.label, xC + 5, y + 8, { width: cajaW - 10, align: 'center' })
           .fontSize(22).font('Helvetica-Bold').text(String(c.valor), xC + 5, y + 22, { width: cajaW - 10, align: 'center' });
      });
      y += 68;

      // ── Detalle por evidencia ─────────────────────────────────────────────
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      y = seccion(doc, 'Análisis por Evidencia', y + 5);

      evidencias.forEach((ev, idx) => {
        if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }

        // Encabezado de evidencia
        doc.rect(50, y, 495, 22).fill(GRIS);
        doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
           .text(`${idx + 1}. ${ev.nombre_archivo}`, 58, y + 6, { width: 390 });

        if (ev.analisis_ia) {
          const eColor = colorEstado(ev.analisis_ia.estado_cumplimiento);
          doc.rect(430, y + 3, 108, 16).fill(eColor);
          doc.fillColor('white').fontSize(8).font('Helvetica')
             .text(ev.analisis_ia.estado_cumplimiento, 432, y + 7, { width: 104, align: 'center' });
        }
        y += 25;

        if (!ev.analisis_ia) {
          doc.rect(50, y, 495, 20).fill('#FFEBEE');
          doc.fillColor(ROJO).fontSize(9).font('Helvetica')
             .text(`Error al procesar: ${ev.error || 'desconocido'}`, 58, y + 6);
          y += 25;
          return;
        }

        // Tipo y riesgo
        const bgColor = idx % 2 === 0 ? '#F5F5F5' : 'white';
        doc.rect(50, y, 495, 18).fill(bgColor);
        doc.fillColor(GRIS).fontSize(9).font('Helvetica')
           .text(`Tipo: ${ev.analisis_ia.tipo_documento}`, 58, y + 5)
           .text(`Riesgo: ${ev.analisis_ia.nivel_riesgo}`, 310, y + 5);
        y += 20;

        // Resumen
        if (ev.analisis_ia.resumen) {
          if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
          doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
             .text(ev.analisis_ia.resumen, 58, y, { width: 479, align: 'justify' });
          y = doc.y + 5;
        }

        // Puntos clave (máx 3)
        const puntos = (ev.analisis_ia.puntos_clave || []).slice(0, 3);
        puntos.forEach(p => {
          if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
          doc.fillColor(AZUL).fontSize(8).font('Helvetica')
             .text(`  ▸ ${p}`, 58, y, { width: 479 });
          y = doc.y + 2;
        });

        y += 10;
      });

      // ── Recomendaciones consolidadas ──────────────────────────────────────
      if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
      y = seccion(doc, 'Recomendaciones Generales', y + 5);

      const todasRecomendaciones = [
        ...new Set(
          evidencias
            .filter(ev => ev.analisis_ia?.recomendaciones)
            .flatMap(ev => ev.analisis_ia.recomendaciones)
        )
      ].slice(0, 10);

      if (todasRecomendaciones.length === 0) {
        doc.fillColor(GRIS).fontSize(10).font('Helvetica')
           .text('No hay recomendaciones adicionales.', 50, y);
        y = doc.y + 10;
      } else {
        todasRecomendaciones.forEach(rec => {
          if (y > MAX_Y) { y = nuevaPagina(doc, SUB); }
          doc.rect(50, y, 8, 16).fill(VERDE);
          doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
             .text(rec, 65, y + 3, { width: 480 });
          y += 22;
        });
      }

      // ── Pie de página ─────────────────────────────────────────────────────
      dibujarPie(doc, `Total evidencias: ${evidencias.length} | Estado: ${metricas.estadoGeneral}`);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generarPDFAnalisis, generarPDFConsolidado };