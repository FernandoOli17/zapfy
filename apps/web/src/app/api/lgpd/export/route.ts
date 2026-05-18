import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@zapai/db';
import { AppError, createLogger, phoneE164Schema } from '@zapai/shared';
import { z } from 'zod';

import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { clientIp, enforceRateLimit, RL_LGPD_API } from '@/lib/rate-limit';

const log = createLogger('lgpd-export');

const inputSchema = z.object({
  phoneE164: phoneE164Schema.optional(),
  contactId: z.string().optional(),
}).refine((d) => Boolean(d.phoneE164 || d.contactId), {
  message: 'phoneE164 ou contactId obrigatório',
});

/**
 * POST /api/lgpd/export
 * Body: { phoneE164?: string, contactId?: string }
 * Auth: Bearer zk_xxx com scope lgpd:export.
 *
 * Retorna JSON com TODOS os dados pessoais que temos do contato:
 * cadastro, customFields, tags, todas as mensagens trocadas, conversas,
 * usage records. Resposta direta no body (sem job queue no MVP).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    const rl = await enforceRateLimit(`lgpd-export:${ip}`, RL_LGPD_API);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'rate limit', retryAfterMs: rl.reset - Date.now() },
        { status: 429, headers: { 'retry-after': String(Math.ceil((rl.reset - Date.now()) / 1000)) } },
      );
    }

    const authResult = await authenticateApiKey(req.headers.get('authorization'));
    requireScope(authResult, 'lgpd:export');

    const raw = await req.json().catch(() => ({}));
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Inválido' },
        { status: 400 },
      );
    }

    const where = parsed.data.contactId
      ? { id: parsed.data.contactId, workspaceId: authResult.workspaceId }
      : { workspaceId_phoneE164: { workspaceId: authResult.workspaceId, phoneE164: parsed.data.phoneE164! } };

    const contact = parsed.data.contactId
      ? await prisma.contact.findFirst({ where: where as object })
      : await prisma.contact.findUnique({ where: where as { workspaceId_phoneE164: { workspaceId: string; phoneE164: string } } });

    if (!contact) {
      return NextResponse.json({ error: 'contato não encontrado' }, { status: 404 });
    }

    const [conversations, messages] = await Promise.all([
      prisma.conversation.findMany({
        where: { contactId: contact.id, workspaceId: authResult.workspaceId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          lastMessageAt: true,
          internalNotes: true,
        },
      }),
      prisma.message.findMany({
        where: { contactId: contact.id, workspaceId: authResult.workspaceId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          direction: true,
          type: true,
          content: true,
          status: true,
          fromAi: true,
          createdAt: true,
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        workspaceId: authResult.workspaceId,
        action: 'lgpd.export',
        targetType: 'Contact',
        targetId: contact.id,
        metadata: { apiKeyId: authResult.apiKeyId },
      },
    });

    log.info(
      { contactId: contact.id, messagesCount: messages.length },
      'lgpd export emitido',
    );

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      contact: {
        id: contact.id,
        phoneE164: contact.phoneE164,
        name: contact.name,
        email: contact.email,
        tags: contact.tags,
        customFields: contact.customFields,
        optedOut: contact.optedOut,
        createdAt: contact.createdAt,
        deletedAt: contact.deletedAt,
      },
      conversations,
      messages,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.httpStatus },
      );
    }
    log.error({ err: String(err) }, 'lgpd export falhou');
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
