import 'server-only';

import { prisma, ConversationStatus } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

import { countAiConversationsThisCycle, dailyAiConversationsLastDays, getWorkspacePlan } from './plans';

const log = createLogger('dashboard-stats');

export interface HandoffItem {
  conversationId: string;
  contactLabel: string; // contact.name ?? "Contato ••1234"
  preview: string;      // última mensagem, truncada
  waitingSince: string | null; // ISO de lastMessageAt
}

export interface DashboardStats {
  conversasHoje: number;
  resolvidasIaCount: number;
  resolvidasIaPct: number; // 0–100
  aguardando: HandoffItem[]; // top 5, mais antigo primeiro
  aguardandoTotal: number;
  atividade14d: Array<{ label: string; value: number }>;
  planoUso: { usado: number; limite: number | null }; // null = ilimitado
  contatos: number;
  whatsappConnected: boolean;
}

export interface DashboardStatsInputs {
  conversasHoje: number;
  handoffHojeCount: number;
  aguandandoRaw: Array<{
    conversationId: string;
    contactName: string | null;
    contactPhone: string;
    preview: string;
    waitingSince: Date | null;
  }>;
  aguardandoTotal: number;
  atividade14d: Array<{ label: string; value: number }>;
  aiUsado: number;
  aiLimite: number | 'unlimited';
  contatos: number;
  whatsappConnected: boolean;
}

function maskPhone(phone: string): string {
  const tail = phone.slice(-4);
  return `Contato ••${tail}`;
}

/** Derivação PURA (sem DB): testável a partir de inputs simples. */
export function deriveDashboardStats(input: DashboardStatsInputs): DashboardStats {
  const resolvidasIaCount = Math.max(0, input.conversasHoje - input.handoffHojeCount);
  const resolvidasIaPct =
    input.conversasHoje > 0 ? Math.round((resolvidasIaCount / input.conversasHoje) * 100) : 0;
  const aguardando: HandoffItem[] = input.aguandandoRaw.map((r) => ({
    conversationId: r.conversationId,
    contactLabel: r.contactName?.trim() ? r.contactName.trim() : maskPhone(r.contactPhone),
    preview: r.preview.length > 70 ? `${r.preview.slice(0, 70)}…` : r.preview,
    waitingSince: r.waitingSince ? r.waitingSince.toISOString() : null,
  }));
  return {
    conversasHoje: input.conversasHoje,
    resolvidasIaCount,
    resolvidasIaPct,
    aguardando,
    aguardandoTotal: input.aguardandoTotal,
    atividade14d: input.atividade14d,
    planoUso: {
      usado: input.aiUsado,
      limite: input.aiLimite === 'unlimited' ? null : input.aiLimite,
    },
    contatos: input.contatos,
    whatsappConnected: input.whatsappConnected,
  };
}

/** Início do dia no fuso de Brasília (-03:00 fixo, sem DST desde 2019). */
function brtDayStart(): Date {
  const BRT_OFFSET_MS = 3 * 3_600_000;
  const key = new Date(Date.now() - BRT_OFFSET_MS).toISOString().slice(0, 10);
  return new Date(`${key}T00:00:00.000-03:00`);
}

function previewOf(content: unknown): string {
  if (content && typeof content === 'object') {
    const t = (content as Record<string, unknown>)['text'];
    if (typeof t === 'string' && t.trim()) return t.trim();
  }
  return '[mídia]';
}

/**
 * Junta as queries do pulso operacional e deriva. Falha → null + log: o
 * dashboard renderiza sem os blocos operacionais e NUNCA quebra.
 */
export async function getDashboardStats(workspaceId: string): Promise<DashboardStats | null> {
  try {
    const dayStart = brtDayStart();
    const [
      conversasHoje,
      handoffHojeCount,
      aguardandoRows,
      aguardandoTotal,
      atividade14d,
      aiUsado,
      planInfo,
      contatos,
      waConnected,
    ] = await Promise.all([
      prisma.conversation.count({ where: { workspaceId, createdAt: { gte: dayStart } } }),
      prisma.conversation.count({
        where: { workspaceId, createdAt: { gte: dayStart }, status: ConversationStatus.HUMAN_HANDLING },
      }),
      prisma.conversation.findMany({
        where: { workspaceId, status: ConversationStatus.HUMAN_HANDLING },
        orderBy: { lastMessageAt: 'asc' },
        take: 5,
        select: {
          id: true,
          lastMessageAt: true,
          contact: { select: { name: true, phoneE164: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } },
        },
      }),
      prisma.conversation.count({
        where: { workspaceId, status: ConversationStatus.HUMAN_HANDLING },
      }),
      dailyAiConversationsLastDays(workspaceId, 14),
      countAiConversationsThisCycle(workspaceId),
      getWorkspacePlan(workspaceId),
      prisma.contact.count({ where: { workspaceId, deletedAt: null } }),
      prisma.whatsAppAccount.findFirst({ where: { workspaceId, status: 'CONNECTED' }, select: { id: true } }),
    ]);

    return deriveDashboardStats({
      conversasHoje,
      handoffHojeCount,
      aguandandoRaw: aguardandoRows.map((c) => ({
        conversationId: c.id,
        contactName: c.contact.name,
        contactPhone: c.contact.phoneE164,
        preview: previewOf(c.messages[0]?.content),
        waitingSince: c.lastMessageAt,
      })),
      aguardandoTotal,
      atividade14d,
      aiUsado,
      aiLimite: planInfo.features.aiConversations,
      contatos,
      whatsappConnected: Boolean(waConnected),
    });
  } catch (err) {
    log.error({ workspaceId, err: String(err) }, 'getDashboardStats falhou — pulso omitido');
    return null;
  }
}
