import type { ForgePhaseId } from './types';

export * from './types';
export * from './tools';
export * from './transitions';
export * from './engine';
export * from './generate';
export * from './verticals';
export * from './basics';
export { getPhaseSystemPrompt } from './prompts/phases';
export { META_PROMPT_SYSTEM, buildMetaPromptUserMessage } from './prompts/meta-prompt';

/** Próxima fase canônica no fluxo principal (ignora REFINEMENT que é loop pós-publish). */
export function nextPhaseDefault(current: ForgePhaseId): ForgePhaseId {
  const order: ForgePhaseId[] = [
    'DISCOVERY',
    'VERTICAL_DETECTION',
    'GOALS',
    'TONE',
    'KNOWLEDGE',
    'TOOLS',
    'HANDOFF',
    'REVIEW',
    'PUBLISH',
  ];
  const i = order.indexOf(current);
  if (i === -1 || i === order.length - 1) return current;
  return order[i + 1] ?? current;
}

/**
 * Catálogo declarativo de tools sugeridas por vertical (usado por
 * suggest_tools_for_vertical). LEI: só tool que EXISTE no runtime entra aqui —
 * o nome escolhido vai pro system prompt gerado, e tool fantasma vira promessa
 * falsa do agente ao cliente final. Guard: tests/forge-catalog.test.ts.
 */
export const VERTICAL_TOOL_CATALOG: Record<string, Array<{ name: string; description: string; recommendedActive: boolean }>> = {
  ECOMMERCE: [
    { name: 'list_products', description: 'Busca produtos do catálogo com filtros.', recommendedActive: true },
    { name: 'recommend_product', description: 'Recomenda SKU baseado nas necessidades do cliente.', recommendedActive: true },
    { name: 'track_order', description: 'Consulta status de pedido por número ou e-mail.', recommendedActive: true },
    { name: 'apply_coupon', description: 'Aplica cupom de desconto seguindo regras.', recommendedActive: false },
    { name: 'send_checkout_link', description: 'Gera e envia link direto pro checkout.', recommendedActive: true },
  ],
  CLINIC: [
    { name: 'list_available_slots', description: 'Lista horários livres por especialidade e data.', recommendedActive: true },
    { name: 'book_appointment', description: 'Marca consulta na agenda da clínica.', recommendedActive: true },
    { name: 'confirm_appointment', description: 'Confirma presença ou libera horário.', recommendedActive: true },
    { name: 'cancel_appointment', description: 'Cancela e oferece reagendamento.', recommendedActive: true },
  ],
  RESTAURANT: [
    { name: 'get_menu', description: 'Mostra cardápio completo ou filtrado.', recommendedActive: true },
    { name: 'add_to_cart', description: 'Adiciona item ao pedido com observações.', recommendedActive: true },
    { name: 'submit_order', description: 'Fecha pedido e registra na cozinha.', recommendedActive: true },
    { name: 'check_delivery_eta', description: 'Consulta status do pedido e ETA.', recommendedActive: true },
  ],
  INFOPRODUCT: [
    { name: 'qualify_lead', description: 'Faz perguntas BANT.', recommendedActive: true },
    { name: 'send_sales_page', description: 'Envia URL da página de vendas com UTM.', recommendedActive: true },
    { name: 'schedule_call', description: 'Marca call de vendas no Calendly.', recommendedActive: true },
    { name: 'send_objection_handler', description: 'Responde objeção comum.', recommendedActive: true },
  ],
  SERVICE: [
    { name: 'request_quote', description: 'Coleta detalhes pra orçamento.', recommendedActive: true },
    { name: 'send_proposal', description: 'Envia proposta formatada.', recommendedActive: true },
    { name: 'book_service', description: 'Agenda data e horário.', recommendedActive: true },
  ],
  OTHER: [
    { name: 'search_knowledge', description: 'Busca na base de conhecimento (RAG).', recommendedActive: true },
    { name: 'transfer_to_human', description: 'Passa pra humano.', recommendedActive: true },
    { name: 'set_contact_field', description: 'Atualiza dado do contato.', recommendedActive: false },
  ],
};

/** Tools globais (sempre disponíveis, independente de vertical). */
export const GLOBAL_AGENT_TOOLS = [
  { name: 'search_knowledge', description: 'Busca na base de conhecimento (RAG).' },
  { name: 'transfer_to_human', description: 'Passa pra humano com motivo.' },
  { name: 'set_contact_field', description: 'Atualiza dado do contato.' },
  { name: 'send_template', description: 'Envia template HSM aprovado.' },
];
