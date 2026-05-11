export type VerticalSlug = 'ecommerce' | 'clinica' | 'restaurante' | 'infoproduto' | 'servico';

export interface VerticalContent {
  slug: VerticalSlug;
  label: string;
  /** título principal sem o destaque italic */
  titleLead: string;
  /** trecho destacado em Instrument Serif italic */
  titleAccent: string;
  /** subtítulo curto pro hero */
  subtitle: string;
  /** dores comuns que o agente resolve */
  pains: Array<{ title: string; body: string }>;
  /** tools que o playbook ativa */
  tools: Array<{ name: string; description: string }>;
  /** exemplos de conversa */
  conversation: Array<{ from: 'cliente' | 'agente'; text: string }>;
  /** indicadores de retorno */
  roi: Array<{ metric: string; label: string }>;
  /** FAQ específico */
  faq: Array<{ q: string; a: string }>;
}

export const VERTICALS: Record<VerticalSlug, VerticalContent> = {
  ecommerce: {
    slug: 'ecommerce',
    label: 'E-commerce',
    titleLead: 'WhatsApp que',
    titleAccent: 'vende sozinho.',
    subtitle:
      'Recomenda produto, recupera carrinho, tira dúvida de frete e responde objeção. Sem perder o tom da sua loja.',
    pains: [
      {
        title: 'Carrinho abandonado some no SAC',
        body: 'Cliente sai do checkout, te manda dúvida no Zap e ninguém responde a tempo. O Agente identifica intenção, oferece desconto se fizer sentido e fecha venda.',
      },
      {
        title: 'Time gasta dia inteiro respondendo "quanto custa o frete"',
        body: 'O agente consulta CEP, calcula prazo, oferece alternativas e ainda manda o link de checkout pronto. Atendente humano só entra quando vale.',
      },
      {
        title: 'Não dá pra recomendar produto sem treinar atendente',
        body: 'O Forge mapeia seu catálogo via CSV ou link da loja. O Agente pergunta o que o cliente busca e sugere SKU com link de checkout. Sem treinamento.',
      },
    ],
    tools: [
      { name: 'list_products', description: 'Busca produtos no catálogo com filtros (categoria, preço, tag).' },
      { name: 'recommend_product', description: 'Recomenda SKU com base nas necessidades extraídas da conversa.' },
      { name: 'track_order', description: 'Consulta status de pedido por número ou e-mail.' },
      { name: 'apply_coupon', description: 'Aplica cupom de desconto seguindo regras (mín. valor, validade).' },
      { name: 'send_checkout_link', description: 'Gera e envia link direto pro checkout do produto.' },
    ],
    conversation: [
      { from: 'cliente', text: 'oi, quero um tênis pra corrida de rua' },
      {
        from: 'agente',
        text: 'Show! Pra corrida de rua a gente tem duas linhas top: leves (foco velocidade) e amortecidos (foco distância). Você corre mais 5K ou maratona?',
      },
      { from: 'cliente', text: '10K e meia, fazendo 3x por semana' },
      {
        from: 'agente',
        text: 'Recomendo o Aero Lite v3 — leve, amortecimento médio, ideal pra essa frequência. R$ 549 ou 6x sem juros. Quer ver na sua numeração?',
      },
    ],
    roi: [
      { metric: '+18%', label: 'taxa de conversão em carrinho recuperado' },
      { metric: '4×', label: 'mais dúvidas resolvidas sem humano' },
      { metric: '< 60s', label: 'tempo médio de primeira resposta' },
    ],
    faq: [
      {
        q: 'Funciona com Shopify, VTEX, Nuvemshop?',
        a: 'No MVP, a forma mais simples é exportar produtos em CSV e subir na base. Integrações nativas com VTEX e Shopify entram no roadmap do plano Pro.',
      },
      {
        q: 'O agente vai oferecer desconto sem eu autorizar?',
        a: 'Não. Você define no Forge as regras — "só dá 10% se carrinho > R$ 200", "nunca dá desconto em lançamento", etc. O agente segue à risca.',
      },
      {
        q: 'E se faltar produto no estoque?',
        a: 'O agente consulta estoque em tempo real (quando você integra) e sugere alternativa. Sem integração, ele admite e pede pra confirmar com o time.',
      },
    ],
  },
  clinica: {
    slug: 'clinica',
    label: 'Clínica / Consultório',
    titleLead: 'WhatsApp que',
    titleAccent: 'agenda e confirma.',
    subtitle:
      'Marca consulta, confirma na véspera, libera horário cancelado e faz triagem leve. Sem secretária queimando no telefone.',
    pains: [
      {
        title: 'Recepcionista presa no telefone',
        body: 'Metade dos pacientes ligam pra remarcar ou tirar dúvida. O agente atende em paralelo, agenda, confirma, libera horário se for o caso.',
      },
      {
        title: 'No-show alto',
        body: 'O agente envia lembrete 24h antes, pede confirmação. Quem não confirma libera a vaga automaticamente pra fila de espera.',
      },
      {
        title: 'Triagem só humanos podem fazer',
        body: 'O agente faz triagem leve (sintoma, urgência, tipo de consulta), separa o que pode esperar do que precisa de encaixe, sem dar diagnóstico.',
      },
    ],
    tools: [
      { name: 'list_available_slots', description: 'Lista horários livres por especialidade e data.' },
      { name: 'book_appointment', description: 'Marca consulta no Google Calendar com confirmação automática.' },
      { name: 'confirm_appointment', description: 'Confirma presença ou libera horário se o paciente cancelar.' },
      { name: 'cancel_appointment', description: 'Cancela e oferece reagendamento.' },
      { name: 'send_intake_form', description: 'Envia ficha pré-consulta pra preencher antes.' },
    ],
    conversation: [
      { from: 'cliente', text: 'oi, queria marcar com a Dra. Letícia' },
      {
        from: 'agente',
        text: 'Oi! Posso te ajudar. A Dra. Letícia tem 3 horários disponíveis essa semana: terça 14h, quarta 9h30 ou sexta 16h. Qual fica melhor?',
      },
      { from: 'cliente', text: 'quarta 9h30' },
      {
        from: 'agente',
        text: 'Anotado: quarta-feira, 13/05, 9h30 com a Dra. Letícia. Te envio lembrete 1 dia antes. Algum sintoma específico que ela já pode revisar?',
      },
    ],
    roi: [
      { metric: '−40%', label: 'no-show com lembrete automático' },
      { metric: '+70%', label: 'consultas agendadas fora do horário comercial' },
      { metric: '3 h/dia', label: 'da recepção devolvidos pra outras tarefas' },
    ],
    faq: [
      {
        q: 'O agente vai dar diagnóstico ou prescrever?',
        a: 'Nunca. Política de não-invenção é guardrail de código. O agente faz triagem (sintoma, urgência) e direciona — diagnóstico só com o profissional.',
      },
      {
        q: 'Integra com Google Calendar?',
        a: 'Sim, no plano Pro. OAuth do workspace, e o agente cria/edita eventos diretamente. Outras integrações (Doctoralia, Conecta+) no roadmap.',
      },
      {
        q: 'E se o paciente quiser falar com alguém?',
        a: 'O agente detecta sinais ("preciso falar com alguém", urgência, frustração) e pausa, passa pro time com contexto do que já foi conversado.',
      },
    ],
  },
  restaurante: {
    slug: 'restaurante',
    label: 'Restaurante / Delivery',
    titleLead: 'WhatsApp que',
    titleAccent: 'anota pedido.',
    subtitle:
      'Mostra cardápio, monta pedido, calcula entrega, confirma endereço. Sem iFood comendo 25% e sem garçom anotando errado.',
    pains: [
      {
        title: 'iFood / Rappi cobram caro',
        body: 'Marketplace come 20–30% do ticket. Cliente que já pediu antes pode pedir direto no Zap — você fica com a margem inteira.',
      },
      {
        title: 'Anotação errada gera retrabalho',
        body: 'Agente confirma item, quantidade, observação e endereço antes de fechar. Pedido entra no sistema certo da primeira vez.',
      },
      {
        title: 'Cardápio mudou e cliente não sabe',
        body: 'Forge mantém o cardápio atualizado por upload. Mudou preço de prato? Atualiza num lugar só e o agente já fala certo.',
      },
    ],
    tools: [
      { name: 'get_menu', description: 'Mostra cardápio completo ou filtrado por categoria.' },
      { name: 'add_to_cart', description: 'Adiciona item ao pedido com observações.' },
      { name: 'submit_order', description: 'Fecha pedido e envia pro sistema da cozinha.' },
      { name: 'check_delivery_eta', description: 'Consulta status do pedido e previsão de entrega.' },
      { name: 'apply_loyalty_discount', description: 'Aplica desconto de cliente recorrente.' },
    ],
    conversation: [
      { from: 'cliente', text: 'tem aquele wrap de frango sem cebola?' },
      {
        from: 'agente',
        text: 'Tem sim! Wrap de frango grelhado (R$ 28), posso pedir sem cebola na cozinha. Adiciono ao pedido? Vai querer batata ou refri junto?',
      },
      { from: 'cliente', text: 'batata pequena e uma coca zero' },
      {
        from: 'agente',
        text: 'Anotado: 1× Wrap de frango (sem cebola), 1× Batata P, 1× Coca Zero. Total R$ 42. Entrega na Rua das Flores 123? Confirma que eu mando pra cozinha.',
      },
    ],
    roi: [
      { metric: '−25%', label: 'comissão de marketplace' },
      { metric: '+30%', label: 'pedidos diretos via Zap' },
      { metric: '2 min', label: 'tempo médio pra fechar pedido' },
    ],
    faq: [
      {
        q: 'Integra com sistema de PDV (Anota AI, Linx, etc.)?',
        a: 'No MVP, manual via webhook de saída no plano Pro. Integrações nativas com PDVs populares são prioridade do roadmap Q3.',
      },
      {
        q: 'O agente entende horário de funcionamento?',
        a: 'Sim. No Forge você configura horários por dia da semana. Fora do horário, ele avisa quando volta e (opcional) deixa o cliente pré-agendar.',
      },
      {
        q: 'E quando tem fila grande?',
        a: 'O agente avisa o tempo estimado real (você atualiza no dashboard). Cliente decide se quer esperar, escolher outro dia ou pedir pra retirar.',
      },
    ],
  },
  infoproduto: {
    slug: 'infoproduto',
    label: 'Infoproduto',
    titleLead: 'WhatsApp que',
    titleAccent: 'qualifica e fecha.',
    subtitle:
      'Lead chega quente do anúncio, agente faz qualificação, manda página de venda, tira objeção e aciona vendedor humano só quando vale.',
    pains: [
      {
        title: 'Vendedor humano queima com lead frio',
        body: 'Você paga R$ 5–20 por lead no anúncio. Mandar tudo pro time perde tempo. Agente qualifica primeiro (orçamento, objetivo, urgência) e passa só os quentes.',
      },
      {
        title: 'Objeção comum some no DM',
        body: 'Lead pergunta "tem garantia?", "funciona pra iniciante?", "qual o pagamento?". Agente tem essas respostas treinadas pelo Forge e converte na hora.',
      },
      {
        title: 'Sala de espera de live virou caos',
        body: 'Agente coleta dados, manda link pra live, envia lembrete, qualifica intenção de compra. Vendedor recebe lista pronta no fim.',
      },
    ],
    tools: [
      { name: 'qualify_lead', description: 'Faz perguntas BANT (orçamento, autoridade, necessidade, prazo).' },
      { name: 'send_sales_page', description: 'Envia URL do pitch/oferta com tracking UTM.' },
      { name: 'schedule_call', description: 'Marca call de vendas no Calendly.' },
      { name: 'apply_discount', description: 'Aplica cupom seguindo regras (urgência, valor).' },
      { name: 'send_objection_handler', description: 'Responde objeção comum com material pré-aprovado.' },
    ],
    conversation: [
      { from: 'cliente', text: 'vi o anúncio, quero saber mais do curso' },
      {
        from: 'agente',
        text: 'Massa! O curso de Tráfego é pra quem quer rodar Meta Ads de verdade — do zero ao primeiro R$ 10k de faturamento. Você já roda anúncio hoje ou tá começando?',
      },
      { from: 'cliente', text: 'tô começando, nunca rodei' },
      {
        from: 'agente',
        text: 'Show, é exatamente o nosso público. Tem 12 módulos, comunidade no Telegram e mentoria mensal. Investimento R$ 1.997 ou 12x R$ 197. Te mando a página com detalhes e bônus?',
      },
    ],
    roi: [
      { metric: '+45%', label: 'conversão de DM em call agendada' },
      { metric: '−60%', label: 'tempo do vendedor com lead não qualificado' },
      { metric: '24/7', label: 'sem perder lead às 23h do anúncio' },
    ],
    faq: [
      {
        q: 'Integra com Hotmart, Kiwify, Eduzz?',
        a: 'Webhook de saída no plano Pro pra notificar a plataforma quando lead fecha. Integração nativa com Hotmart no roadmap.',
      },
      {
        q: 'Vai parecer que sou eu falando?',
        a: 'Você define no Forge a personalidade — informal, formal, com ou sem emoji. O agente usa esse tom em todas as respostas. Refina conversando.',
      },
      {
        q: 'E se o lead pedir desconto fora da política?',
        a: 'Agente nunca dá desconto não autorizado. Quando pedem, ele oferece outro benefício (bônus, parcelamento) ou passa pro vendedor com contexto.',
      },
    ],
  },
  servico: {
    slug: 'servico',
    label: 'Prestador de serviço',
    titleLead: 'WhatsApp que',
    titleAccent: 'cota e agenda.',
    subtitle:
      'Faxina, manutenção, pintura, encanador, eletricista. Agente coleta info, manda orçamento, agenda visita e dá follow-up.',
    pains: [
      {
        title: 'Cotação leva o dia inteiro',
        body: 'Cliente pede orçamento, você precisa perguntar metragem, tipo de serviço, urgência. Agente coleta tudo em conversa e gera proposta padrão.',
      },
      {
        title: 'Esquece de dar retorno',
        body: 'Lead manda mensagem, você ocupado, esquece. Agente nunca esquece — responde em segundos, anota, faz follow-up no dia seguinte se preciso.',
      },
      {
        title: 'Agenda bagunçada',
        body: 'Agente integra com Google Calendar, vê disponibilidade real e marca direto. Sem ping-pong de "que dia você pode?".',
      },
    ],
    tools: [
      { name: 'request_quote', description: 'Coleta detalhes do serviço e gera orçamento.' },
      { name: 'send_proposal', description: 'Envia proposta formatada com itens, prazo e valor.' },
      { name: 'book_service', description: 'Agenda data e horário no Google Calendar.' },
      { name: 'follow_up', description: 'Dá retorno em 24/48h pra leads que não responderam.' },
      { name: 'request_payment_pix', description: 'Gera Pix de sinal com QR Code.' },
    ],
    conversation: [
      { from: 'cliente', text: 'precisava de uma faxina pesada, mudança pro fim do mês' },
      {
        from: 'agente',
        text: 'Tranquilo! Pra te passar orçamento certo, me conta: quantos cômodos, metragem aproximada (se souber), e o imóvel tá vazio ou com móveis?',
      },
      { from: 'cliente', text: '2 dorm, 70m², ainda com móveis até quinta' },
      {
        from: 'agente',
        text: 'Show. Pra 70m² com móveis, faxina pesada fica R$ 480 (1 diarista, 8h). Tenho disponibilidade na sexta 26/05 às 8h. Te mando proposta detalhada?',
      },
    ],
    roi: [
      { metric: '< 5min', label: 'pra fechar orçamento simples' },
      { metric: '+50%', label: 'leads convertidos em proposta' },
      { metric: '0', label: 'leads perdidos por esquecimento' },
    ],
    faq: [
      {
        q: 'O agente fecha sozinho ou só passa pra mim?',
        a: 'Você escolhe. No Forge dá pra dizer "fecha orçamentos até R$ 800 sozinho, acima disso me chama". Personalizável por valor, complexidade, urgência.',
      },
      {
        q: 'Como funciona o follow-up?',
        a: 'Configurável: 24h após enviar orçamento, 48h depois, 7 dias. Agente respeita opt-out e nunca insiste se cliente pediu pra parar.',
      },
      {
        q: 'Aceita pagamento por Pix direto?',
        a: 'Sim (no plano Pro), gerando QR Code de cobrança via integração com Asaas/Pagar.me. Stripe Pix no roadmap.',
      },
    ],
  },
};

export const VERTICAL_SLUGS = Object.keys(VERTICALS) as VerticalSlug[];

export function isVerticalSlug(slug: string): slug is VerticalSlug {
  return VERTICAL_SLUGS.includes(slug as VerticalSlug);
}
