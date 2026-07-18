export default async function handler(req, res) {
    // Configurações de CORS para aceitar conexões do seu front-end (index.html)
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
        console.error("ERRO CRÍTICO: GEMINI_API_KEY ausente no servidor Vercel.");
        return res.status(500).json({ error: 'Chave da API não configurada.' });
    }

    // Usando o modelo super rápido e leve autorizado na sua chave
    const modelName = "gemini-3.1-flash-lite"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    let systemInstructions = '';
    let promptContent = '';

    const currentAction = action || 'chat';

    if (currentAction === 'chat') {
        systemInstructions = `Você é a ErikIA, assistente virtual altamente técnica da central de ajuda da Feegow. 
Sua missão é resolver dúvidas técnicas do software.
Responda em formato Markdown, traga o passo a passo claro.
Se a dúvida não for relacionada a rotinas de clínica ou sistema médico, responda educadamente informando que você é exclusiva para suporte do Feegow.`;

        promptContent = `Dúvida do usuário: "${query}"\nPor favor, forneça o passo a passo de cliques detalhado.`;
        
        // CULPADO REMOVIDO: Nenhuma ferramenta de busca injetada aqui. Zero custos ocultos.
        
    } else if (currentAction === 'polish') {
        systemInstructions = "Você é um revisor de qualidade de atendimento.";
        promptContent = `Reescreva o rascunho usando tom ${context}:\n\nRascunho: ${query}`;
    } else if (currentAction === 'draft_email') {
        systemInstructions = "Redija um e-mail de resposta formal e cordial para o cliente baseado na resolução técnica.";
        promptContent = `Dúvida: ${query}\nResolução Técnica: ${context}`;
    } else if (currentAction === 'summarize') {
        systemInstructions = "Resuma o atendimento técnico em tópicos para fechamento de ticket.";
        promptContent = `Dúvida: ${query}\nResposta: ${context}`;
    }

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
            // Citações dinâmicas de busca removidas pois o Search foi desativado.
            return res.status(200).json({ text, citations: [] });
        }

        return res.status(200).json({ error: 'O modelo não retornou um texto válido.' });

    } catch (error) {
        console.error("Erro interno no Node.js:", error.message);
        return res.status(500).json({ error: 'Falha interna na Função Vercel.' });
    }
}
