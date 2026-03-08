const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

// ─── EXTRAER TEXTO SEGÚN TIPO DE ARCHIVO ───────────────────────────────────

const extraerTextoDeBuffer = async (buffer, nombreArchivo) => {
  const ext = nombreArchivo.split('.').pop().toLowerCase();

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
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      texto += `\n--- Hoja: ${sheetName} ---\n`;
      texto += XLSX.utils.sheet_to_csv(sheet);
    });
    return texto;
  }

  // Si es txt u otro
  return buffer.toString('utf-8');
};

// ─── BUSCAR FECHAS CON REGEX ────────────────────────────────────────────────

const buscarFechas = (texto) => {
  const patrones = [
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g,
    /\b(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\b/gi,
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})\b/gi,
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,
  ];

  const fechasEncontradas = new Set();
  patrones.forEach(patron => {
    const matches = texto.match(patron);
    if (matches) matches.forEach(f => fechasEncontradas.add(f.trim()));
  });

  return Array.from(fechasEncontradas).slice(0, 20);
};

// ─── BUSCAR VIGENCIAS ───────────────────────────────────────────────────────

const buscarVigencias = (texto) => {
  const patrones = [
    /vigencia[:\s]+([^\n]{0,80})/gi,
    /v[aá]lido\s+(hasta|por)[:\s]+([^\n]{0,80})/gi,
    /vigente\s+hasta[:\s]+([^\n]{0,80})/gi,
    /fecha\s+de\s+vencimiento[:\s]+([^\n]{0,80})/gi,
    /expira[:\s]+([^\n]{0,80})/gi,
    /periodo[:\s]+([^\n]{0,80})/gi,
    /plazo[:\s]+([^\n]{0,80})/gi,
    /renovaci[oó]n[:\s]+([^\n]{0,80})/gi,
  ];

  const vigencias = [];
  patrones.forEach(patron => {
    const matches = [...texto.matchAll(patron)];
    matches.forEach(m => {
      const textoVigencia = m[0].trim();
      if (textoVigencia.length > 5) vigencias.push(textoVigencia);
    });
  });

  return [...new Set(vigencias)].slice(0, 10);
};

// ─── ANALIZAR CON DEEPSEEK ──────────────────────────────────────────────────

const analizarConDeepSeek = async (texto, nombreArchivo) => {
  try {
    const textoResumido = texto.slice(0, 4000);

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `Eres un experto en cumplimiento ambiental y normativa mexicana (SEMARNAT, PROFEPA).
Analiza documentos de cumplimiento ambiental y responde SOLO en JSON válido, sin texto extra ni bloques markdown. Ejemplo de formato:

{
  "tipo_documento": "Licencia Ambiental",
  "resumen": "Documento que acredita el cumplimiento ambiental de la empresa para el periodo 2025-2026.",
  "estado_cumplimiento": "CUMPLE",
  "nivel_riesgo": "BAJO",
  "puntos_clave": ["Licencia vigente hasta diciembre 2026", "Cumple NOM-052"],
  "recomendaciones": ["Renovar antes de octubre 2026"],
  "confianza": 88
}

IMPORTANTE: El campo "confianza" debe ser un número entre 1 y 100 que refleje tu certeza en el análisis. Nunca uses 0 a menos que el archivo esté completamente vacío o ilegible.`
          },
          {
            role: "user",
            content: `Archivo: ${nombreArchivo}\n\nContenido:\n${textoResumido}`
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

    const textoRespuesta = response.data.choices[0].message.content;
    const limpio = textoRespuesta.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultado = JSON.parse(limpio);

    // Garantizar que confianza tenga valor real
    if (!resultado.confianza || resultado.confianza === 0) {
      resultado.confianza = 50;
    }

    return resultado;

  } catch (error) {
    console.error('Error DeepSeek:', error.message);
    return {
      tipo_documento: 'No determinado',
      resumen: 'No se pudo analizar con IA',
      estado_cumplimiento: 'REQUIERE_REVISION',
      nivel_riesgo: 'MEDIO',
      puntos_clave: ['Error al conectar con el servicio de IA'],
      recomendaciones: ['Revisar manualmente el documento'],
      confianza: 5
    };
  }
};

// ─── FUNCIÓN PRINCIPAL ──────────────────────────────────────────────────────

const extraerDelArchivo = async (buffer, nombreArchivo) => {
  const texto = await extraerTextoDeBuffer(buffer, nombreArchivo);
  const fechas = buscarFechas(texto);
  const vigencias = buscarVigencias(texto);
  const analisisIA = await analizarConDeepSeek(texto, nombreArchivo);

  return {
    texto_extraido: texto.slice(0, 5000),
    total_caracteres: texto.length,
    fechas_encontradas: fechas,
    vigencias_encontradas: vigencias,
    analisis_ia: analisisIA
  };
};

module.exports = { extraerDelArchivo };