// Banco de Dados Local da ErikIA (RAG Offline)
// ----------------------------------------------------------------------
// Regras para edição:
// 1. Todo artigo deve estar dentro de chaves {}
// 2. Os artigos devem ser separados por vírgula ,
// 3. Não coloque vírgula após o último artigo
// 4. O texto da resposta (content) pode usar Markdown (ex: **negrito**)
// ----------------------------------------------------------------------

const localKnowledgeBase = [
    {
        keywords: ["senha", "esqueci", "reset", "resetar senha", "acesso bloqueado", "desbloquear", "login"],
        topic: "Reset de Senha do Usuário",
        title: "Como redefinir a senha do usuário Feegow?",
        url: "https://ajuda.feegow.com/",
        content: "Para ajudar um usuário que esqueceu a senha ou está bloqueado:\n\n1. Peça para o usuário acessar a tela de login inicial do Feegow.\n2. Ele deve clicar em **'Esqueci minha senha'**.\n3. Inserir o e-mail cadastrado e clicar em Enviar.\n4. Ele receberá um link temporário no e-mail para cadastrar uma nova senha.\n\n💡 *Dica da ErikIA:* Se o e-mail não chegar, verifique em **Cadastros > Funcionários** se o e-mail no sistema está correto e sem espaços no final."
    },
    {
        keywords: ["cadastrar", "novo funcionário", "recepcionista", "colaborador", "acesso as agendas", "permissões"],
        topic: "Cadastro de Novo Funcionário",
        title: "Como cadastrar um novo funcionário?",
        url: "https://ajuda.feegow.com/",
        content: "Para cadastrar um novo colaborador (ex: Recepção):\n\n1. Acesse **Cadastros > Funcionários** e clique em **+Inserir**.\n2. Preencha os dados obrigatórios.\n3. Em 'Acesso às Agendas', selecione quais ele poderá ver (deixe em branco para todas).\n4. Clique em Salvar.\n5. Na aba **Dados de Acesso**, crie o Login e Senha.\n6. Clique no ícone de Cadeado na lista para configurar as **Permissões** de tela."
    },
    {
        keywords: ["tiss", "regime", "atendimento", "guia", "sadt", "adequações", "ans"],
        topic: "Regime de Atendimento TISS",
        title: "Adequações ao Padrão TISS - Regime de Atendimento",
        url: "https://ajuda.feegow.com/",
        content: "Para evitar glosas, é obrigatório preencher o Regime de Atendimento:\n\n1. Ao gerar uma Guia de SP/SADT, localize o campo **'Regime de Atendimento'**.\n2. Informe uma opção válida pela ANS: Ambulatorial, Domiciliar, Internação, Pronto-Socorro ou Telessaúde.\n3. Salve a guia. Isso garante o XML correto."
    },
    {
        keywords: ["glosa", "recurso", "recurso de glosa", "faturamento", "demonstrativo", "retorno"],
        topic: "Recurso de Glosa",
        title: "Como realizar um Recurso de Glosa?",
        url: "https://ajuda.feegow.com/",
        content: "Quando um procedimento é negado pela operadora:\n\n1. Acesse **Faturamento > Retorno TISS** (ou Recursos de Glosa).\n2. Localize o lote ou a guia.\n3. Preencha o código do motivo da glosa.\n4. Justifique o recurso e anexe documentos.\n5. Gere o novo lote de recurso para reenvio."
    },
    {
        keywords: ["bloqueio", "agenda", "afastamento", "férias", "congresso", "indisponível"],
        topic: "Bloqueio de Agenda por Afastamento",
        title: "Como bloquear a agenda de um profissional?",
        url: "https://ajuda.feegow.com/",
        content: "Para bloquear a agenda para férias ou congressos:\n\n1. Acesse **Agenda > Afastamentos**.\n2. Clique em **+Novo Afastamento**.\n3. Selecione o Profissional e o Período.\n4. Insira o motivo.\n\n💡 *Dica da ErikIA:* O sistema perguntará se você deseja manter os agendados ou transferi-los para remarcação."
    },
    {
        keywords: ["sms", "mensagem", "final de semana", "72h", "não enviado", "evento", "status"],
        topic: "Disparo Automático de SMS",
        title: "Por que os SMS não chegam no fim de semana?",
        url: "https://ajuda.feegow.com/",
        content: "Isso ocorre por causa da antecedência configurada:\n\n1. Vá em **Configurações > Agenda > Status/Eventos**.\n2. Edite o evento de e-mail/SMS correspondente.\n3. Verifique se o envio está para **72h de antecedência**.\n4. Se sim, consultas de segunda-feira terão os avisos enviados na sexta-feira."
    },
    {
        keywords: ["noa", "notes", "anotador", "ia", "prontuário", "resumo", "assento"],
        topic: "Ativação do NOA Notes",
        title: "Como configurar o assistente de IA NOA Notes?",
        url: "https://ajuda.feegow.com/",
        content: "Para habilitar a IA no prontuário:\n\n1. Acesse **Configuração > Outras configurações** e vá em Gerenciar Assentos para o NOA.\n2. O profissional precisa da permissão *'Visualizar Resumos de IA'* ativada.\n3. No cadastro do Profissional, aba 'Compartilhamento', defina se os resumos serão Públicos, Privados ou Restritos."
    },
    {
        keywords: ["estoque", "lote", "validade", "dar baixa", "inventário", "produto"],
        topic: "Baixa de Estoque Automática",
        title: "Como configurar a baixa de estoque?",
        url: "https://ajuda.feegow.com/",
        content: "Para registrar saída de um produto:\n\n**Manual:** No atendimento, vá em 'Produtos Utilizados' (ícone maleta roxa) e registre o uso.\n**Pelo Cadastro:** Em **Estoque > Listar**, localize o produto e clique em 'Saída' (requer permissão ativada no produto)."
    },
    {
        keywords: ["conta do paciente", "extrato", "faturados", "receber", "pendências", "gerar a partir do agendamento"],
        topic: "Conta do Paciente",
        title: "Como lançar uma Conta a partir do agendamento?",
        url: "https://ajuda.feegow.com/",
        content: "1. Localize a conta do paciente no **Prontuário**.\n2. Acesse a aba **Não Faturados**.\n3. Clique em **'Gerar a partir do agendamento'**.\n4. Marque o procedimento, selecione 'Particular' e salve.\n5. O atendimento constará agora na aba **Faturados** e no financeiro."
    },
    {
        keywords: ["certificado digital", "a1", "assinar", "receita digital", "memed", "prescrição"],
        topic: "Configurar Certificado Digital A1",
        title: "Como inserir o Certificado Digital?",
        url: "https://ajuda.feegow.com/",
        content: "Para o médico assinar digitalmente:\n\n1. Acesse **Cadastros > Profissionais** e edite o médico.\n2. Na aba **Documentos**, localize Certificado Digital.\n3. Faça o upload do arquivo tipo **A1** (.pfx).\n4. Insira a senha e clique em Salvar."
    },
    {
        keywords: ["telemedicina", "consulta online", "link", "termo", "videochamada"],
        topic: "Configurar Telemedicina",
        title: "Como configurar a Telemedicina?",
        url: "https://ajuda.feegow.com/",
        content: "Para habilitar consultas online:\n\n1. Em **Cadastros > Procedimentos**, edite a consulta.\n2. Habilite **'Procedimento Telemedicina'** para gerar links.\n3. Configure Modelos de Eventos de Email/SMS usando o link da sala.\n4. Habilite o Termo de Consentimento Padrão em Outras Configurações se necessário."
    },
    {
        keywords: ["xml", "nota fiscal", "entrada", "compra", "fornecedor"],
        topic: "Entrada via XML de Nota Fiscal",
        title: "Como lançar produtos pelo XML?",
        url: "https://ajuda.feegow.com/",
        content: "Para automatizar entrada de estoque:\n\n1. Vá em Conta a Pagar e anexe o **XML da NF-e**.\n2. O sistema listará os produtos da nota.\n3. Para cada item, faça o vínculo (de/para) apontando para qual produto do seu Estoque Feegow ele deve somar.\n4. Confirme para injetar os itens automaticamente."
    }
];
