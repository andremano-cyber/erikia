const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // Configuração de CORS para permitir que seu HTML acesse a API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Extraímos APENAS a mensagem atual do usuário (sem array de histórico)
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "A mensagem está vazia." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Configuração do modelo com Grounding (Pesquisa Google) ativado
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", 
      tools: [{ googleSearch: {} }],
      // System Prompt altamente enxuto para economizar tokens de entrada
      systemInstruction: "Você é ErikIA, suporte da Feegow. Responda de forma direta e técnica baseada estritamente na pesquisa. Máximo de 2 parágrafos. Use bullet points. Sem saudações ou encerramentos informais.",
    });

    // Chamada da API enviando apenas a pergunta atual e com trava de saída
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: {
        maxOutputTokens: 250, // Trava drástica: impede respostas longas e corta consumo
        temperature: 0.1,     // Reduz alucinações, foca em respostas exatas
      }
    });

    const textResponse = result.response.text();
    res.status(200).json({ response: textResponse });

  } catch (error) {
    console.error("Erro na API Gemini:", error);
    res.status(500).json({ 
      error: "Desculpe, ocorreu um erro ao processar sua solicitação.",
      details: error.message 
    });
  }
};
