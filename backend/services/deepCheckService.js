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
        },
        timeout: 20000
      }
    )

    // Validar que la respuesta exista
    if (
      !response.data ||
      !response.data.choices ||
      !response.data.choices[0] ||
      !response.data.choices[0].message
    ) {
      throw new Error("Respuesta inválida de DeepSeek")
    }

    let texto = response.data.choices[0].message.content

    // Limpiar formato markdown si viene ```json
    texto = texto.replace(/```json/g, '')
    texto = texto.replace(/```/g, '')
    texto = texto.trim()

    try {
      return JSON.parse(texto)
    } catch (parseError) {

      console.log("Error parseando respuesta IA:", texto)

      return {
        valido: false,
        confianza: 0,
        observacion: "Respuesta IA inválida"
      }
    }

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