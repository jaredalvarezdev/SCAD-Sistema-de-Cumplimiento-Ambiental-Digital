const axios = require('axios')

const validarReporteIA = async (descripcion) => {
  try {

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `
Eres un sistema que valida reportes ambientales.

Responde SOLO en JSON:

{
 "valido": true,
 "confianza": 0-100,
 "observacion": "texto corto"
}
`
          },
          {
            role: "user",
            content: descripcion
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const texto = response.data.choices[0].message.content

    return JSON.parse(texto)

  } catch (error) {

    console.log("Error IA:", error.message)

    return {
      valido: false,
      confianza: 0,
      observacion: "No se pudo validar con IA"
    }
  }
}

module.exports = {
  validarReporteIA
}