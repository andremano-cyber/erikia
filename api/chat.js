module.exports = async (req, res) => {
    // =========================================================================
    // 1. CONFIGURAÇÃO DE CORS (Segurança e permissão de acesso)
    // =========================================================================
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "A mensagem está vazia." });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "Chave da API não configurada no servidor da Vercel." });
        }

        // =========================================================================
        // 2. CONSTRUÇÃO DO ENDPOINT (Usando o modelo 3.1 flash lite)
        // =========================================================================
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

        // =========================================================================
        // 3. MONTAGEM DA REQUISIÇÃO (Com ferramenta googleSearch e margem de tokens)
        // =========================================================================
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: `Pesquise exclusivamente no site ajuda.feegow.com para resolver a seguinte dúvida: ${message}` }]
            }],
            // REATIVANDO A PESQUISA GOOGLE (GROUNDING)
            tools: [
                { googleSearch: {} }
            ],
            systemInstruction: {
                parts: [{ text: "Você é a ErikIA, assistente de suporte da Feegow. Responda apenas com base nos resultados da pesquisa (ajuda.feegow.com). Seja técnica, use bullet points e seja objetiva. Se não encontrar a resposta na pesquisa, diga que não localizou artigos sobre o tema." }]
            },
            generationConfig: {
                maxOutputTokens: 800, // Aumentado para evitar o corte por "limite de tokens" na saída
                temperature: 0.1
            }
        };

        // =========================================================================
        // 4. CHAMADA DIRETA VIA FETCH NATIVO
        // =========================================================================
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Tratamento de Erros da API do Google (Ex: Quota Exceeded)
        if (!response.ok) {
            const errorMessage = data.error?.message || "Erro desconhecido na API do Google.";
            return res.status(response.status).json({ 
                error: "O Google bloqueou a requisição",
                details: errorMessage
            });
        }

        // =========================================================================
        // 5. EXTRAÇÃO DA RESPOSTA BEM SUCEDIDA
        // =========================================================================
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content?.parts?.[0]?.text) {
            return res.status(500).json({ error: "O Google não retornou nenhum texto válido." });
        }

        // Retorna o texto formatado para o front-end
        res.status(200).json({ response: candidate.content.parts[0].text });

    } catch (error) {
        console.error("Erro interno do Servidor:", error);
        res.status(500).json({ 
            error: "Falha de processamento no servidor (Vercel).",
            details: error.message 
        });
    }
};
