import type { VerticalId } from './types';

export interface VerticalMeta {
  id: VerticalId;
  label: string;
  emoji: string;
  /** Objetivos sugeridos — viram os botões do passo 4 do wizard. */
  goalSuggestions: string[];
}

export const VERTICAL_META: Record<VerticalId, VerticalMeta> = {
  RESTAURANT: {
    id: 'RESTAURANT',
    label: 'Restaurante',
    emoji: '🍕',
    goalSuggestions: ['Mostrar o cardápio', 'Anotar pedido', 'Status da entrega', 'Reservar mesa'],
  },
  ECOMMERCE: {
    id: 'ECOMMERCE',
    label: 'Loja / e-commerce',
    emoji: '🛍️',
    goalSuggestions: ['Recomendar produto', 'Status do pedido', 'Política de troca', 'Enviar link de pagamento'],
  },
  CLINIC: {
    id: 'CLINIC',
    label: 'Clínica / agendamento',
    emoji: '🩺',
    goalSuggestions: ['Marcar consulta', 'Confirmar presença', 'Responder horários', 'Cancelar ou remarcar'],
  },
  INFOPRODUCT: {
    id: 'INFOPRODUCT',
    label: 'Curso / mentoria',
    emoji: '🎓',
    goalSuggestions: ['Qualificar lead', 'Tirar dúvida', 'Enviar página de vendas', 'Agendar call'],
  },
  SERVICE: {
    id: 'SERVICE',
    label: 'Serviço',
    emoji: '🔧',
    goalSuggestions: ['Coletar dados pra orçamento', 'Agendar visita', 'Enviar proposta', 'Dar retorno'],
  },
  OTHER: {
    id: 'OTHER',
    label: 'Outro',
    emoji: '💬',
    goalSuggestions: ['Responder dúvidas frequentes', 'Coletar dados do cliente', 'Passar pra um atendente'],
  },
};

export const VERTICAL_LIST: VerticalMeta[] = [
  VERTICAL_META.RESTAURANT,
  VERTICAL_META.ECOMMERCE,
  VERTICAL_META.CLINIC,
  VERTICAL_META.INFOPRODUCT,
  VERTICAL_META.SERVICE,
  VERTICAL_META.OTHER,
];
