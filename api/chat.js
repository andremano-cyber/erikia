export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    const method = req.method ? req.method.toUpperCase() : '';
    if (method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (method !== 'POST') {
        return res.status(405).json({ error: `Método ${method} não permitido. Use POST.` });
    }

    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'O campo query é obrigatório.' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("ERRO CRÍTICO: GEMINI_API_KEY não configurada na Vercel.");
        return res.status(500).json({ error: 'Chave da API do Gemini ausente no servidor.' });
    }

    // Utilizando o modelo Flash Lite (Leve e rápido) sem a ferramenta de Search Grounding
    const modelName = "gemini-3.1-flash-lite"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const systemInstructions = `Você é a ErikIA, assistente virtual técnica da central de ajuda da Feegow. 
Sua missão é resolver dúvidas técnicas baseando-se no ecossistema Feegow.
Responda em formato Markdown de maneira muito objetiva, traga o passo a passo de cliques claro.
Se a dúvida não estiver relacionada ao sistema Feegow, responda educadamente informando que não localizou o assunto e peça para contatar o suporte.`;

    const promptContent = `Dúvida do usuário: "${query}"`;

    const requestBody = {
        contents: [
            { parts: [{ text: promptContent }] }
        ],
        systemInstruction: {
            parts: [{ text: systemInstructions }]
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Erro retornado pelo Google Gemini:", errorText);
            return res.status(response.status).json({ 
                error: 'Erro na API do Google.', 
                details: errorText
            });
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            let text = candidate.content.parts[0].text;
            return res.status(200).json({ text, citations: [] });
        }

        return res.status(200).json({ error: 'O modelo não retornou um texto válido.' });

    } catch (error) {
        console.error("Erro interno catastrófico no servidor:", error.message);
        return res.status(500).json({ error: 'Falha interna na Função Vercel.' });
    }
}
