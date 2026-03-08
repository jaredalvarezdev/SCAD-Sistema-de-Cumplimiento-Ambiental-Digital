const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

// ─── Extraer texto del buffer según tipo ────────────────────────────────────

const extraerTexto = async (buffer, nombreArchivo) => {
  const ext = nombreArchivo.split('.').pop().toLowerCase();
  try {
    if (ext === 'pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    }
    if (ext === 'docx' || ext === 'doc') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let texto = '';
      workbook.SheetNames.forEach(sheet => {
        texto += `\n--- Hoja: ${sheet} ---\n`;
        texto += XLSX.utils.sheet_to_csv(workbook.Sheets[sheet]);
      });
      return texto;
    }
    return buffer.toString('utf-8');
  } catch (e) {
    console.error('[IA] Error extrayendo texto:', e.message);
    return buffer.toString('utf-8').slice(0, 3000);
  }
};

// ─── Validar evidencia con DeepSeek ─────────────────────────────────────────

const validarEvidenciaIA = async (buffer, nombreArchivo) => {
  try {
    const texto = await extraerTexto(buffer, nombreArchivo);

    console.log('[IA] Texto extraído (primeros 300 chars):', texto.slice(0, 300));
    console.log('[IA] Total caracteres extraídos:', texto.length);

    const textoResumido = texto.slice(0, 4000);
    const hoy = new Date().toISOString().split('T')[0];

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Eres un validador experto en cumplimiento ambiental mexicano (SEMARNAT, PROFEPA, LGEEPA, NOM).
Analiza el documento y determina si es una evidencia ambiental válida y vigente.

Evalúa estrictamente:
1. RELEVANCIA: ¿Es un documento ambiental? (licencias, permisos, reportes de residuos, emisiones, agua, suelo, NOM, certificados ambientales, manifiestos de residuos peligrosos, COA, MIA, etc.)
2. VIGENCIA: ¿Tiene fechas? ¿Están vigentes al día de hoy (${hoy})? ¿No está vencido?
3. NORMATIVA: ¿Cumple o hace referencia a normativa ambiental mexicana? (NOM-xxx, LGEEPA, Ley de Residuos, etc.)
4. INTEGRIDAD: ¿El documento está completo y es legible? ¿No es una imagen en blanco, un archivo de texto aleatorio o un documento sin relación ambiental?

Responde SOLO en JSON válido sin texto extra ni bloques de código markdown. Ejemplo de formato esperado:
{
  "es_ambiental": true,
  "tipo_documento": "Licencia Ambiental",
  "estado_cumplimiento": "CUMPLE",
  "esta_vigente": true,
  "fecha_vencimiento_detectada": "2028-01-15",
  "normativas_referenciadas": ["NOM-052-SEMARNAT-2005"],
  "observacion": "Documento válido que cumple con normativa ambiental vigente.",
  "confianza": 85,
  "nuevo_estado_reporte": 3
}

Reglas para nuevo_estado_reporte:
- 3 (aprobado): es_ambiental=true, esta_vigente=true, estado_cumplimiento=CUMPLE, confianza >= 70
- 2 (en_revision): es_ambiental=true pero tiene dudas, vencimiento incierto, o confianza media (40-69)
- 4 (rechazado): es_ambiental=false, esta_vigente=false (vencido), o estado_cumplimiento=NO_CUMPLE

IMPORTANTE: El campo "confianza" debe ser un número entre 1 y 100 que refleje qué tan seguro estás del análisis. Nunca pongas 0 a menos que no puedas analizar el documento.`
          },
          {
            role: 'user',
            content: `Archivo: ${nombreArchivo}\nFecha actual: ${hoy}\n\nContenido:\n${textoResumido}`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const raw = response.data.choices[0].message.content;
    console.log('[IA] Respuesta raw de DeepSeek:', raw);

    const limpio = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultado = JSON.parse(limpio);

    // Garantizar que confianza nunca sea null/undefined/0
    if (!resultado.confianza || resultado.confianza === 0) {
      resultado.confianza = resultado.es_ambiental ? 50 : 10;
    }

    console.log('[IA] Resultado parseado:', JSON.stringify(resultado));

    return resultado;

  } catch (error) {
    console.error('[IA] Error al validar evidencia:', error.message);
    if (error.response) {
      console.error('[IA] Status HTTP:', error.response.status);
      console.error('[IA] Respuesta DeepSeek:', JSON.stringify(error.response.data));
    }
    if (error.code) {
      console.error('[IA] Código de error:', error.code);
    }
    return {
      es_ambiental: null,
      tipo_documento: 'No determinado',
      estado_cumplimiento: 'REQUIERE_REVISION',
      esta_vigente: null,
      fecha_vencimiento_detectada: null,
      normativas_referenciadas: [],
      observacion: 'No se pudo analizar automáticamente. Requiere revisión manual.',
      confianza: 5,
      nuevo_estado_reporte: 2
    };
  }
};

module.exports = { validarEvidenciaIA };