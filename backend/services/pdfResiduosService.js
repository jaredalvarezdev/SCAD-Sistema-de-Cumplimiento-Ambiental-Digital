const PDFDocument = require('pdfkit');

const VERDE    = '#1B5E20';
const VERDE_CL = '#E8F5E9';
const VERDE_MD = '#2E7D32';
const GRIS     = '#455A64';
const GRIS_CL  = '#ECEFF1';
const NEGRO    = '#212121';
const ROJO     = '#B71C1C';
const AZUL     = '#0D47A1';
const NARANJA  = '#E65100';

const MAX_Y = 730; // límite seguro antes del pie

const fechaFormato = (fechaStr) => {
  if (!fechaStr) return '—';
  return new Date(fechaStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

const fechaCorta = (fechaStr) => {
  if (!fechaStr) return '—';
  return new Date(fechaStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
};

const formatearCantidad = (cantidad, unidad) => {
  return `${parseFloat(cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unidad || 'kg'}`;
};

const colorCategoria = (categoria) => {
  if (!categoria) return GRIS;
  if (categoria.toLowerCase().includes('peligroso') && !categoria.toLowerCase().includes('no')) return ROJO;
  if (categoria.toLowerCase().includes('especial')) return NARANJA;
  return VERDE_MD;
};

// ─── Encabezado reutilizable ────────────────────────────────────────────────
const dibujarEncabezado = (doc, fechaGeneracion) => {
  doc.rect(0, 0, 595, 100).fill(VERDE);
  doc.fillColor('white')
     .fontSize(26).font('Helvetica-Bold').text('SCAD', 45, 18)
     .fontSize(9).font('Helvetica').text('Sistema de Cumplimiento Ambiental Digital', 45, 50)
     .fontSize(8).text('Plataforma Oficial de Gestión Ambiental', 45, 64);
  doc.fillColor('white')
     .fontSize(13).font('Helvetica-Bold')
     .text('REPORTE DE GENERACIÓN Y MANEJO DE RESIDUOS SÓLIDOS', 200, 22, { width: 350, align: 'center' })
     .fontSize(9).font('Helvetica')
     .text('Conforme a la Ley General para la Prevención y Gestión Integral', 200, 44, { width: 350, align: 'center' })
     .text('de los Residuos (LGPGIR) y NOM-161-SEMARNAT-2011', 200, 56, { width: 350, align: 'center' })
     .fontSize(8)
     .text(`Generado: ${fechaGeneracion}`, 200, 74, { width: 350, align: 'center' });
  doc.rect(0, 100, 595, 5).fill('#81C784');
};

// ─── Nueva página con encabezado ────────────────────────────────────────────
const nuevaPagina = (doc, fechaGeneracion) => {
  doc.addPage();
  dibujarEncabezado(doc, fechaGeneracion);
  return 115;
};

// ─── Pie de página en posición actual ───────────────────────────────────────
const dibujarPie = (doc, reporte, empresa, fechaGeneracion) => {
  const y = doc.y + 15;
  doc.rect(0, y, 595, 42).fill(GRIS);
  doc.fillColor('white').fontSize(7).font('Helvetica')
     .text('SCAD — Sistema de Cumplimiento Ambiental Digital', 45, y + 8, { align: 'center', width: 505 })
     .text('Documento generado electrónicamente. Válido conforme a la LGPGIR y NOM-161-SEMARNAT-2011.', 45, y + 20, { align: 'center', width: 505 })
     .text(`Reporte ID: ${reporte?.id || '—'} | Empresa: ${empresa?.nombre || '—'} | ${fechaGeneracion}`, 45, y + 32, { align: 'center', width: 505 });
};

const generarPDFResiduos = ({ reporte, empresa, periodo, registros, totales, totalGeneral }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 45, size: 'A4', autoFirstPage: true });
      const buffers = [];

      doc.on('data', c => buffers.push(c));
      doc.on('end',  () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      dibujarEncabezado(doc, fechaGeneracion);
      let y = 115;

      const col1 = 50, col2 = 300;

      // ══════════════════════════════════════════════════════════════════
      // SECCIÓN 1: DATOS DE LA EMPRESA GENERADORA
      // ══════════════════════════════════════════════════════════════════
      doc.rect(45, y, 505, 18).fill(VERDE_MD);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text('I. DATOS DE LA EMPRESA GENERADORA', 50, y + 4);
      y += 22;

      doc.rect(45, y, 505, 95).fill(GRIS_CL).stroke('#CFD8DC');
      doc.fillColor(NEGRO).fontSize(9).font('Helvetica');

      doc.font('Helvetica-Bold').text('Razón Social:', col1, y + 8)
         .font('Helvetica').text(empresa?.nombre || '—', col1 + 85, y + 8);
      doc.font('Helvetica-Bold').text('RFC:', col2, y + 8)
         .font('Helvetica').text(empresa?.rfc || '—', col2 + 30, y + 8);

      doc.font('Helvetica-Bold').text('Domicilio:', col1, y + 24)
         .font('Helvetica').text(empresa?.direccion || '—', col1 + 65, y + 24, { width: 220 });
      doc.font('Helvetica-Bold').text('Ciudad/Estado:', col2, y + 24)
         .font('Helvetica').text(`${empresa?.ciudad || '—'}, ${empresa?.estado || '—'}`, col2 + 95, y + 24);

      doc.font('Helvetica-Bold').text('Teléfono:', col1, y + 40)
         .font('Helvetica').text(empresa?.telefono || '—', col1 + 60, y + 40);
      doc.font('Helvetica-Bold').text('Email:', col2, y + 40)
         .font('Helvetica').text(empresa?.email || '—', col2 + 40, y + 40);

      doc.font('Helvetica-Bold').text('Tipo de empresa:', col1, y + 56)
         .font('Helvetica').text(empresa?.tipo_empresa || '—', col1 + 105, y + 56);
      doc.font('Helvetica-Bold').text('N° Generador SEMARNAT:', col2, y + 56)
         .font('Helvetica').text(periodo?.num_generador || 'No registrado', col2 + 155, y + 56);

      doc.font('Helvetica-Bold').text('Nivel de cumplimiento:', col1, y + 72)
         .font('Helvetica').text(empresa?.nivel_cumplimiento ? `${empresa.nivel_cumplimiento}%` : '—', col1 + 140, y + 72);

      y += 105;

      // ══════════════════════════════════════════════════════════════════
      // SECCIÓN 2: PERÍODO DE REPORTE Y RESPONSABLE
      // ══════════════════════════════════════════════════════════════════
      if (y > MAX_Y) { y = nuevaPagina(doc, fechaGeneracion); }

      doc.rect(45, y, 505, 18).fill(VERDE_MD);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text('II. PERÍODO DE REPORTE Y RESPONSABLE', 50, y + 4);
      y += 22;

      doc.rect(45, y, 505, 55).fill(GRIS_CL).stroke('#CFD8DC');
      doc.fillColor(NEGRO).fontSize(9);

      doc.font('Helvetica-Bold').text('Período de reporte:', col1, y + 8)
         .font('Helvetica').text(
           `Del ${fechaFormato(periodo?.periodo_inicio)} al ${fechaFormato(periodo?.periodo_fin)}`,
           col1 + 120, y + 8
         );
      doc.font('Helvetica-Bold').text('Título del reporte:', col1, y + 24)
         .font('Helvetica').text(reporte?.titulo || '—', col1 + 115, y + 24);
      doc.font('Helvetica-Bold').text('Responsable:', col1, y + 40)
         .font('Helvetica').text(periodo?.responsable_nombre || '—', col1 + 85, y + 40);
      doc.font('Helvetica-Bold').text('Cargo:', col2, y + 40)
         .font('Helvetica').text(periodo?.responsable_cargo || '—', col2 + 45, y + 40);

      y += 65;

      // ══════════════════════════════════════════════════════════════════
      // SECCIÓN 3: RESUMEN POR CATEGORÍA
      // ══════════════════════════════════════════════════════════════════
      if (y > MAX_Y) { y = nuevaPagina(doc, fechaGeneracion); }

      doc.rect(45, y, 505, 18).fill(VERDE_MD);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text('III. RESUMEN DE RESIDUOS POR CATEGORÍA', 50, y + 4);
      y += 22;

      doc.rect(45, y, 505, 16).fill(GRIS);
      doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
         .text('CATEGORÍA', 50, y + 4)
         .text('N° REGISTROS', 260, y + 4)
         .text('TOTAL GENERADO', 360, y + 4)
         .text('TIPO', 470, y + 4);
      y += 18;

      let filaPar = false;
      Object.entries(totales).forEach(([cat, datos]) => {
        if (y > MAX_Y) { y = nuevaPagina(doc, fechaGeneracion); }
        const esPeligroso = cat.toLowerCase().includes('peligroso') && !cat.toLowerCase().includes('no');
        doc.rect(45, y, 505, 16).fill(filaPar ? '#F5F5F5' : 'white');
        doc.rect(45, y, 4, 16).fill(colorCategoria(cat));
        doc.fillColor(NEGRO).fontSize(8).font('Helvetica')
           .text(cat, 54, y + 4, { width: 200 })
           .text(String(datos.registros), 295, y + 4)
           .text(formatearCantidad(datos.cantidad, datos.unidad), 360, y + 4)
           .fillColor(esPeligroso ? ROJO : VERDE_MD)
           .text(esPeligroso ? 'PELIGROSO' : 'NO PELIGROSO', 470, y + 4);
        filaPar = !filaPar;
        y += 18;
      });

      if (y > MAX_Y) { y = nuevaPagina(doc, fechaGeneracion); }
      doc.rect(45, y, 505, 18).fill(VERDE);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
         .text('TOTAL GENERAL', 50, y + 4)
         .text(String(registros.length), 295, y + 4)
         .text(formatearCantidad(totalGeneral, 'kg'), 360, y + 4);
      y += 26;

      // ══════════════════════════════════════════════════════════════════
      // SECCIÓN 4: REGISTRO DETALLADO DE RESIDUOS
      // ══════════════════════════════════════════════════════════════════
      if (y > MAX_Y) { y = nuevaPagina(doc, fechaGeneracion); }

      doc.rect(45, y, 505, 18).fill(VERDE_MD);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text('IV. REGISTRO DETALLADO DE RESIDUOS GENERADOS', 50, y + 4);
      y += 22;

      const dibujarEncabezadoTabla = (yPos) => {
        doc.rect(45, yPos, 505, 16).fill(GRIS);
        doc.fillColor('white').fontSize(7).font('Helvetica-Bold')
           .text('RESIDUO', 50, yPos + 4, { width: 130 })
           .text('CLAVE', 185, yPos + 4)
           .text('CANTIDAD', 230, yPos + 4)
           .text('DISPOSICIÓN', 290, yPos + 4, { width: 100 })
           .text('TRANSPORTISTA', 390, yPos + 4, { width: 80 })
           .text('F. GENERACIÓN', 475, yPos + 4);
        return yPos + 18;
      };

      y = dibujarEncabezadoTabla(y);

      filaPar = false;
      registros.forEach((r) => {
        if (y > MAX_Y) {
          y = nuevaPagina(doc, fechaGeneracion);
          y = dibujarEncabezadoTabla(y);
        }

        doc.rect(45, y, 505, 20).fill(filaPar ? '#F5F5F5' : 'white');
        doc.rect(45, y, 4, 20).fill(colorCategoria(r.residuos_tipos?.categoria));

        doc.fillColor(NEGRO).fontSize(7).font('Helvetica')
           .text(r.residuos_tipos?.nombre || '—', 54, y + 3, { width: 125 })
           .text(r.residuos_tipos?.clave_semarnat || '—', 185, y + 7)
           .text(formatearCantidad(r.cantidad, r.unidad_medida), 230, y + 7)
           .text(r.metodo_disposicion || '—', 290, y + 7, { width: 95 })
           .text(r.empresa_transportista || '—', 390, y + 7, { width: 80 })
           .text(fechaCorta(r.fecha_generacion), 475, y + 7);

        if (r.num_manifiesto) {
          doc.fillColor(AZUL).fontSize(6)
             .text(`Manifiesto: ${r.num_manifiesto}`, 54, y + 13, { width: 200 });
        }

        filaPar = !filaPar;
        y += 22;
      });

      y += 10;

      // ══════════════════════════════════════════════════════════════════
      // SECCIÓN 5: OBSERVACIONES GENERALES
      // ══════════════════════════════════════════════════════════════════
      if (periodo?.observaciones_gral) {
        if (y > MAX_Y) { y = nuevaPagina(doc, fechaGeneracion); }

        doc.rect(45, y, 505, 18).fill(VERDE_MD);
        doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
           .text('V. OBSERVACIONES GENERALES', 50, y + 4);
        y += 22;

        doc.rect(45, y, 505, 60).fill(GRIS_CL).stroke('#CFD8DC');
        doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
           .text(periodo.observaciones_gral, 52, y + 8, { width: 493 });
        y += 70;
      }

      // ══════════════════════════════════════════════════════════════════
      // SECCIÓN 6: FIRMA Y DECLARACIÓN
      // ══════════════════════════════════════════════════════════════════
      if (y > MAX_Y) { y = nuevaPagina(doc, fechaGeneracion); }

      doc.rect(45, y, 505, 18).fill(VERDE_MD);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text('VI. DECLARACIÓN Y FIRMA DEL RESPONSABLE', 50, y + 4);
      y += 22;

      doc.rect(45, y, 505, 70).fill(GRIS_CL).stroke('#CFD8DC');
      doc.fillColor(NEGRO).fontSize(8).font('Helvetica')
         .text(
           'El suscrito, en mi calidad de responsable ambiental de la empresa arriba señalada, declaro bajo protesta de decir verdad que la información contenida en el presente reporte es verídica y fue generada conforme a los procedimientos establecidos en la Ley General para la Prevención y Gestión Integral de los Residuos (LGPGIR), su Reglamento y demás normatividad aplicable.',
           52, y + 8, { width: 493, align: 'justify' }
         );

      const firmaY = y + 48;
      doc.moveTo(80, firmaY).lineTo(260, firmaY).strokeColor('#9E9E9E').lineWidth(0.5).stroke();
      doc.moveTo(310, firmaY).lineTo(520, firmaY).stroke();

      doc.fillColor(GRIS).fontSize(8).font('Helvetica')
         .text(periodo?.responsable_nombre || '________________________________', 80, firmaY + 4, { width: 180, align: 'center' })
         .text(periodo?.responsable_cargo  || 'Cargo / Puesto', 80, firmaY + 15, { width: 180, align: 'center' })
         .text('Fecha y Firma', 310, firmaY + 4, { width: 210, align: 'center' })
         .text(fechaGeneracion, 310, firmaY + 15, { width: 210, align: 'center' });

      y += 90;

      // ══════════════════════════════════════════════════════════════════
      // PIE DE PÁGINA (posición actual, sin y fijo)
      // ══════════════════════════════════════════════════════════════════
      dibujarPie(doc, reporte, empresa, fechaGeneracion);

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generarPDFResiduos };