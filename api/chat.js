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

        // =========================================================================
        // SISTEMA DE CACHE EM MEMÓRIA (Map)
        // =========================================================================
        // Variável global fora do escopo da requisição para sobreviver em contêineres quentes
        if (!global.responseCache) {
            global.responseCache = new Map();
        }
        
        // Normaliza a pergunta (minúsculas e sem espaços extras) para garantir que "Teste" e "teste " sejam a mesma chave
        const cacheKey = message.toLowerCase().trim();

        if (global.responseCache.has(cacheKey)) {
            console.log("⚡ Resposta servida direto do Cache na Vercel!");
            return res.status(200).json({ response: global.responseCache.get(cacheKey) });
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
                parts: [{ text: "Você é a ErikIA, assistente sênior e super amigável de suporte da Feegow. Sempre inicie com uma saudação acolhedora (ex: 'Olá! Que bom ter você por aqui...'). Estruture a resposta de forma altamente didática, dividindo o passo a passo em tópicos numerados ou pilares (ex: 1. Realizando o Cadastro, 2. Configurações...). Quando pertinente, inclua uma 'Dica da ErikIA' com boas práticas e um bloco 'Importante lembrar' no final. Encerre sempre com uma mensagem calorosa de apoio e um emoji (ex: 🚀). Responda EXCLUSIVAMENTE com base na pesquisa do ajuda.feegow.com. Se não encontrar o passo a passo, diga educadamente que não achou artigos sobre o tema." }]
            },
            generationConfig: {
                maxOutputTokens: 2000, // Aumentado para 2000: Permite passo a passos detalhados sem cortes
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

        const textResponse = candidate.content.parts[0].text;

        // Salva a nova resposta no Cache limitando o tamanho para não estourar a memória (max 200 itens)
        if (global.responseCache.size >= 200) {
            // Remove o primeiro item adicionado se atingir o limite
            const firstKey = global.responseCache.keys().next().value;
            global.responseCache.delete(firstKey);
        }
        global.responseCache.set(cacheKey, textResponse);

        // Retorna o texto formatado para o front-end
        res.status(200).json({ response: textResponse });

    } catch (error) {
        console.error("Erro interno do Servidor:", error);
        res.status(500).json({ 
            error: "Falha de processamento no servidor (Vercel).",
            details: error.message 
        });
    }
};
