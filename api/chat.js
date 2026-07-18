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
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { query, action, context } = req.body;

    if (!query && !context) {
        return res.status(400).json({ error: 'O campo query ou context é obrigatório.' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("ERRO CRÍTICO: GEMINI_API_KEY não está configurada no painel da Vercel.");
        return res.status(500).json({ error: 'Chave da API do Gemini não configurada no servidor.' });
    }

    // Você pode usar o "gemini-1.5-pro" ou "gemini-2.5-flash". 
    // Ambos possuem excelente motor de pesquisa (Search Grounding).
    const modelName = "gemini-3.1-flash-lite"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    let systemInstructions = '';
    let promptContent = '';
    let tools = [];

    const currentAction = action || 'chat';

    if (currentAction === 'chat') {
        systemInstructions = `Você é a ErikIA, a assistente virtual sênior e altamente técnica da central de ajuda da Feegow (Doctoralia / Docplanner Group).
Sua missão crítica é resolver dúvidas técnicas baseando-se unicamente nas documentações oficiais do domínio (https://ajuda.feegow.com).
Responda em formato Markdown de maneira extremamente clara, estruturada e amigável.
REQUISITO IMPERATIVO: Você DEVE usar a ferramenta de busca do Google fornecida para encontrar o artigo exato na central ajuda.feegow.com. Nunca responda com base apenas na sua memória estática para caminhos técnicos do Feegow. 
Sempre traga os links de referência dos artigos encontrados na busca no final de suas respostas.
Se a busca no site ajuda.feegow.com não retornar nenhum resultado útil ou se a dúvida for completamente fora de contexto (não relacionada ao Feegow), responda de forma prestativa informando que não localizou artigos oficiais e sugira que o usuário fale com o time de suporte.`;

        // MODIFICAÇÃO CHAVE 1: Forçar o parâmetro 'site:' no prompt interno
        promptContent = `Efetue uma pesquisa profunda usando OBRIGATORIAMENTE o filtro de site e resolva a seguinte dúvida do usuário: "site:ajuda.feegow.com ${query}" \nTraga o passo a passo de cliques detalhado e o link do artigo oficial.`;
        
        // MODIFICAÇÃO CHAVE 2: Atualização do nome correto da ferramenta do Google Search Retrieval (camelCase)
        tools = [{ googleSearch: {} }];
        
    } else if (currentAction === 'draft_email') {
        systemInstructions = "Você é um especialista em Customer Care redigindo um e-mail para o cliente. Use um tom empático e profissional.";
        promptContent = `Dúvida do Cliente: ${query}\nResolução Técnica (Base): ${context}\n\nCom base nessas informações, redija um e-mail pronto para ser enviado ao cliente, validando o sentimento dele, oferecendo a solução em formato de passo a passo e encerrando de forma cordial.`;
    } else if (currentAction === 'summarize') {
        systemInstructions = "Você é um agente sênior preenchendo o fechamento de um ticket no Zendesk/Freshdesk.";
        promptContent = `Crie um resumo interno para este atendimento.\nDúvida: ${query}\nResposta dada: ${context}\n\nEstruture em: 1) Resumo do Problema, 2) Investigação, 3) Solução Aplicada.`;
    } else if (currentAction === 'polish') {
        systemInstructions = "Você é um revisor de qualidade de atendimento ao cliente.";
        promptContent = `Reescreva o seguinte rascunho de mensagem para o cliente usando um tom ${context}:\n\nRascunho: ${query}`;
    }

    const requestBody = {
        contents: [
            {
                parts: [{ text: promptContent }]
            }
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
            const errorData = await response.text();
            console.error("Erro da API Gemini:", errorData);
            return res.status(response.status).json({ error: 'Erro ao processar a resposta na API do Google.', details: errorData });
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            let text = candidate.content.parts[0].text;
            let citations = [];
            
            // Tratamento das Citações (Grounding) dependendo da versão da resposta da API
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

        return res.status(200).json({ error: 'O modelo não retornou uma resposta válida.' });

    } catch (error) {
        console.error("Erro interno no servidor Vercel:", error);
        return res.status(500).json({ error: 'Falha interna na Função Serverless.' });
    }
}
