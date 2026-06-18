import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { prisma, QuoteStatus, type Prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';
import type { VerticalRuntimeDeps } from './runtime/types';
import { createWithRetry, quoteNumberDelegate } from './public-number';

const log = createLogger('tools:service');

/**
 * Tools do vertical SERVICE (eletricista, faxineira, advogado, consultor).
 * Foco: coletar dados pra orçar, montar proposta, agendar execução.
 */

const quoteItemSchema = z.object({
  name: z.string().min(2).max(100),
  quantity: z.number().int().min(1).default(1),
  unitPriceCents: z.number().int().nonnegative(),
  notes: z.string().max(200).optional(),
});

export function buildServiceTools(deps: VerticalRuntimeDeps): Record<string, Tool> {
  return {
    request_quote: tool({
      description:
        'Cria registro de pedido de orçamento (Quote em status DRAFT) com os dados coletados. NÃO envia ainda — fica pra time humano revisar/aprovar valor antes de send_proposal.',
      inputSchema: z.object({
        serviceDescription: z.string().min(10).max(1000).describe('Em 2-3 frases: o que o cliente quer.'),
        serviceAddress: z.object({
          street: z.string().min(2),
          number: z.string().min(1).max(10),
          neighborhood: z.string().min(2),
          city: z.string().min(2),
          state: z.string().length(2),
          zip: z.string().regex(/^\d{5}-?\d{3}$/),
        }).optional(),
        urgency: z.enum(['flexible', 'this_week', 'this_month', 'emergency']).default('flexible'),
        notes: z.string().max(500).optional(),
      }),
      execute: async ({ serviceDescription, serviceAddress, urgency, notes }) => {
        const quote = await createWithRetry(
          'ORC',
          deps.workspaceId,
          (publicNumber) =>
            prisma.quote.create({
              data: {
                workspaceId: deps.workspaceId,
                contactId: deps.contactId === 'test-contact' ? null : deps.contactId,
                conversationId: deps.conversationId === 'test-conversation' ? null : deps.conversationId,
                publicNumber,
                status: QuoteStatus.DRAFT,
                serviceDescription,
                ...(serviceAddress ? { serviceAddress: serviceAddress as unknown as Prisma.InputJsonValue } : {}),
                items: [] as unknown as Prisma.InputJsonValue, // time humano preenche depois
                notes: notes ? `[urgência: ${urgency}] ${notes}` : `[urgência: ${urgency}]`,
              },
              select: { publicNumber: true },
            }),
          quoteNumberDelegate,
        );
        log.info(
          { workspaceId: deps.workspaceId, quoteNumber: quote.publicNumber, urgency },
          'pedido de orçamento criado (DRAFT)',
        );
        return {
          ok: true as const,
          publicNumber: quote.publicNumber,
          message: `Anotei aqui (orçamento ${quote.publicNumber}). Vou passar pro time, retorno em até 24h com valor.`,
        };
      },
    }),

    send_proposal: tool({
      description:
        'Atualiza Quote com itens + total e marca como SENT. Usar quando o time humano (ou agente avançado) já tem valor decidido. Devolve URL pra cliente visualizar a proposta.',
      inputSchema: z.object({
        publicNumber: z.string().min(3),
        items: z.array(quoteItemSchema).min(1).max(20),
        validForDays: z.number().int().min(1).max(60).default(15),
      }),
      execute: async ({ publicNumber, items, validForDays }) => {
        const candidates = [publicNumber, publicNumber.replace(/^#?(ORC-?)?/i, 'ORC-')];
        const quote = await prisma.quote.findFirst({
          where: { workspaceId: deps.workspaceId, publicNumber: { in: candidates } },
        });
        if (!quote) return { ok: false as const, error: 'orçamento não encontrado' };
        if (quote.status !== QuoteStatus.DRAFT) {
          return { ok: false as const, error: `orçamento ${quote.publicNumber} já está em status ${quote.status}` };
        }
        const totalCents = items.reduce((acc, i) => acc + i.unitPriceCents * i.quantity, 0);
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + validForDays);

        await prisma.quote.update({
          where: { id: quote.id },
          data: {
            status: QuoteStatus.SENT,
            items: items as unknown as Prisma.InputJsonValue,
            totalCents,
            validUntil,
          },
        });

        // TODO(credentials): gerar PDF via UploadThing/Vercel Blob quando creds chegarem
        // const pdfUrl = await renderPdf(quote, items, totalCents)
        const baseUrl = process.env['NEXT_PUBLIC_APP_URL']?.replace(/\/$/, '') ?? 'https://trato.dev';
        const previewUrl = `${baseUrl}/q/${quote.publicNumber}`;

        return {
          ok: true as const,
          publicNumber: quote.publicNumber,
          totalFormatted: formatBrl(totalCents),
          validUntil: validUntil.toLocaleDateString('pt-BR'),
          previewUrl,
          message: `Proposta ${quote.publicNumber}: ${formatBrl(totalCents)} (válida até ${validUntil.toLocaleDateString('pt-BR')}). Link: ${previewUrl}`,
        };
      },
    }),

    book_service: tool({
      description:
        'Agenda execução do serviço depois que cliente aceitou a proposta. Cria registro em Appointment (reutiliza modelo clínico). Confirma data, hora e endereço.',
      inputSchema: z.object({
        quotePublicNumber: z.string().min(3),
        startsAtIso: z.string().datetime(),
        durationMinutes: z.number().int().min(30).max(720).default(120),
      }),
      execute: async ({ quotePublicNumber, startsAtIso, durationMinutes }) => {
        const candidates = [quotePublicNumber, quotePublicNumber.replace(/^#?(ORC-?)?/i, 'ORC-')];
        const quote = await prisma.quote.findFirst({
          where: { workspaceId: deps.workspaceId, publicNumber: { in: candidates } },
        });
        if (!quote) return { ok: false as const, error: 'orçamento não encontrado' };
        if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.ACCEPTED) {
          return { ok: false as const, error: 'orçamento ainda não foi enviado/aceito' };
        }

        // Marca como aceito + cria appointment com profissional "Equipe" do
        // PRÓPRIO workspace. NUNCA upsert por id global ('__default_team__'):
        // Professional.id é @id global, então o upsert achava o registro de
        // OUTRO tenant e vinculava appointments cross-workspace.
        const existing = await prisma.professional.findFirst({
          where: { workspaceId: deps.workspaceId, name: 'Equipe' },
        });
        const defaultProf = existing ?? await prisma.professional.create({
          data: { workspaceId: deps.workspaceId, name: 'Equipe', active: true },
        });

        const appointment = await prisma.appointment.create({
          data: {
            workspaceId: deps.workspaceId,
            professionalId: defaultProf.id,
            contactId: quote.contactId,
            conversationId: quote.conversationId,
            startsAt: new Date(startsAtIso),
            durationMinutes,
            type: `service:${quote.publicNumber}`,
            notes: `Serviço: ${quote.serviceDescription.slice(0, 200)}`,
          },
          select: { id: true, startsAt: true },
        });

        await prisma.quote.update({
          where: { id: quote.id },
          data: { status: QuoteStatus.ACCEPTED },
        });

        return {
          ok: true as const,
          appointmentId: appointment.id,
          when: appointment.startsAt.toLocaleString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          }),
          message: `Agendado pra ${appointment.startsAt.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}. Te aviso 1 dia antes pra confirmar.`,
        };
      },
    }),
  };
}

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
