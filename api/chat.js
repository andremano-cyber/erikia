export default async function handler(req, res) {
    // Configuração de CORS para garantir a comunicação com o Frontend
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

    const { query, action, context } = req.body;

    if (!query && !context) {
        return res.status(400).json({ error: 'O campo query ou context é obrigatório.' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("ERRO CRÍTICO: GEMINI_API_KEY não configurada na Vercel.");
        return res.status(500).json({ error: 'Chave da API do Gemini ausente no servidor.' });
    }

    // AQUI ESTÁ A CORREÇÃO: Usando o modelo exato da sua lista autorizada!
    const modelName = "gemini-3.5-flash"; 
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    let systemInstructions = '';
    let promptContent = '';
    let tools = [];

    const currentAction = action || 'chat';

    if (currentAction === 'chat') {
        systemInstructions = `Você é a ErikIA, assistente virtual técnica da central de ajuda da Feegow. 
Sua missão é resolver dúvidas técnicas baseando-se OBRIGATORIAMENTE E UNICAMENTE nas documentações oficiais do domínio ajuda.feegow.com.
Responda em formato Markdown, traga o passo a passo claro e sempre adicione os links de referência encontrados.
Se a dúvida não estiver no ajuda.feegow.com, responda informando que não localizou o artigo e peça para contatar o suporte.`;

        promptContent = `Pesquise no ajuda.feegow.com e resolva a dúvida: "${query}"`;
        tools = [{ googleSearch: {} }];
    } else if (currentAction === 'polish') {
        systemInstructions = "Você é um revisor de qualidade de atendimento.";
        promptContent = `Reescreva o rascunho usando tom ${context}:\n\nRascunho: ${query}`;
    }

    const requestBody = {
        contents: [
            { parts: [{ text: promptContent }] }
        ],
        systemInstruction: {
            parts: [{ text: systemInstructions }]
        }
    };

    if (tools.length > 0) {
        requestBody.tools = tools;
    }

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
            let citations = [];
            
            const metadata = candidate.groundingMetadata;
            if (metadata && metadata.groundingAttributions) {
                citations = metadata.groundingAttributions
                    .map(att => ({ uri: att.web?.uri, title: att.web?.title }))
                    .filter(src => src.uri && src.title);
            } else if (metadata && metadata.groundingChunks) {
                 citations = metadata.groundingChunks
                    .filter(chunk => chunk.web?.uri && chunk.web?.title)
                    .map(chunk => ({ uri: chunk.web.uri, title: chunk.web.title }));
            }

            return res.status(200).json({ text, citations });
        }

        return res.status(200).json({ error: 'O modelo não retornou um texto válido.' });

    } catch (error) {
        console.error("Erro interno catastrófico no servidor:", error.message);
        return res.status(500).json({ error: 'Falha interna na Função Vercel.' });
    }
}
