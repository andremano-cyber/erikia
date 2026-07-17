// Este arquivo rodará do lado do servidor de forma 100% segura na Vercel.
// Ele age como um proxy invisível: recebe a pergunta do front-end, anexa a chave secreta e chama o Google Gemini.

export default async function handler(req, res) {
    // 1. Configuração de Cabeçalhos de Segurança (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Trata requisições de pre-flight (CORS handshake automático)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
    }

    const { query } = req.body;

    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'O parâmetro "query" é obrigatório.' });
    }

    // 2. Recuperação da Chave de API Secreta e Configurações
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error("ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não está configurada no painel da Vercel!");
        return res.status(500).json({ 
            error: 'Serviço temporariamente indisponível por falta de credenciais do servidor.' 
        });
    }

    const modelName = "gemini-3-flash-preview"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    // 3. Prompt de Engenharia do Sistema para Forçar Grounding no ajuda.feegow.com
    const systemInstructions = `Você é a ErikIA, a assistente virtual sênior e altamente técnica da central de ajuda da Feegow (Doctoralia / Docplanner Group).
Sua missão crítica é resolver dúvidas técnicas baseando-se unicamente nas documentações oficiais do domínio (https://ajuda.feegow.com).
Responda em formato Markdown de maneira extremamente clara, estruturada e amigável.
REQUISITO IMPERATIVO: Você DEVE usar a ferramenta de busca do Google fornecida para encontrar o artigo exato na central ajuda.feegow.com. Nunca responda com base apenas na sua memória estática para caminhos técnicos do Feegow. 
Sempre traga os links de referência dos artigos encontrados na busca no final de suas respostas.
Se a busca no site ajuda.feegow.com não retornar nenhum resultado útil ou se a dúvida for completamente fora de contexto (não relacionada ao Feegow), responda de forma prestativa informando que não localizou artigos oficiais e sugira que o usuário fale com o time de suporte.`;

    const structuredPrompt = `Efetue uma pesquisa profunda no site ajuda.feegow.com e resolva a seguinte dúvida do usuário. Traga o passo a passo de cliques detalhado e o link do artigo oficial: "${query}"`;

    const payload = {
        contents: [{
            parts: [{ text: structuredPrompt }]
        }],
        tools: [{ "google_search": {} }],
        systemInstruction: {
            parts: [{ text: systemInstructions }]
        }
    };

    // 4. Executando a requisição para a API do Google Gemini
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Google API retornou status ${response.status}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const textResponse = candidate.content.parts[0].text;
            let citations = [];

            // Extração das atribuições/fontes reais do Google Search Grounding
            const metadata = candidate.groundingMetadata;
            if (metadata && metadata.groundingAttributions) {
                citations = metadata.groundingAttributions
                    .map(attr => ({ uri: attr.web?.uri, title: attr.web?.title }))
                    .filter(cite => cite.uri && cite.title);
            }

            return res.status(200).json({ 
                text: textResponse, 
                citations: citations 
            });
        }

        return res.status(502).json({ error: 'Resposta vazia ou inválida recebida do motor de IA.' });

    } catch (err) {
        console.error("Erro interno ao chamar a API do Gemini:", err);
        return res.status(500).json({ error: 'Erro de processamento no servidor de IA.' });
    }
}