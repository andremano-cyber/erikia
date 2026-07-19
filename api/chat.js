export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Use POST.' });
    }

    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "A mensagem está vazia." });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Chave da API ausente no servidor.' });
        }

        const modelName = "gemini-3.1-flash-lite"; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

        // Corpo da requisição com a pergunta atual e a Ferramenta de Busca Ativa
        const requestBody = {
            contents: [{ role: "user", parts: [{ text: message }] }],
            systemInstruction: {
                parts: [{ text: "Você é ErikIA, suporte da Feegow. Responda de forma direta e técnica baseada estritamente na pesquisa. Máximo de 2 parágrafos. Use bullet points. Sem saudações ou encerramentos informais." }]
            },
            tools: [{ googleSearch: {} }],
            generationConfig: {
                maxOutputTokens: 250, // Trava drástica de economia de tokens de saída
                temperature: 0.1
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        // Se o Google rejeitar (Ex: limite de cota da busca), repassamos o erro exato
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erro da API do Google:", errorData);
            return res.status(response.status).json({ 
                error: "O Google bloqueou a requisição", 
                details: errorData.error?.message || "Cota ou permissão negada na Busca." 
            });
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Resposta vazia do modelo.";
        
        res.status(200).json({ response: textResponse });

    } catch (error) {
        console.error("Erro interno no servidor:", error);
        res.status(500).json({ error: "Erro na Vercel", details: error.message });
    }
}
