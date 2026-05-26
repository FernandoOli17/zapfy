import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@zapai/db';
import { AppError, createLogger, phoneE164Schema } from '@zapai/shared';
import { z } from 'zod';

import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { enqueue, QUEUE_NAMES, type LgpdHardDeleteJob } from '@/lib/queues';
import { clientIp, enforceRateLimit, RL_LGPD_API } from '@/lib/rate-limit';
import { captureException } from '@/lib/sentry';

const log = createLogger('lgpd-delete');

const inputSchema = z.object({
  phoneE164: phoneE164Schema,
  hardDeleteIn: z.enum(['immediate', '30d']).default('30d'),
});

const HARD_DELETE_DAYS = 30;

/**
 * POST /api/lgpd/delete
 * Body: { phoneE164: string, hardDeleteIn?: 'immediate' | '30d' }
 * Auth: Bearer zk_xxx com scope lgpd:delete.
 *
 * Soft delete imediato (contato fica invisível no UI). Hard delete agendado
 * em 30 dias por padrão (período de reversão por engano). 'immediate' apaga
 * tudo na hora.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    const rl = await enforceRateLimit(`lgpd-delete:${ip}`, RL_LGPD_API);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'rate limit', retryAfterMs: rl.reset - Date.now() },
        { status: 429, headers: { 'retry-after': String(Math.ceil((rl.reset - Date.now()) / 1000)) } },
      );
    }

    const authResult = await authenticateApiKey(req.headers.get('authorization'));
    requireScope(authResult, 'lgpd:delete');

    const raw = await req.json().catch(() => ({}));
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Inválido' },
        { status: 400 },
      );
    }

    const contact = await prisma.contact.findUnique({
      where: {
        workspaceId_phoneE164: {
          workspaceId: authResult.workspaceId,
          phoneE164: parsed.data.phoneE164,
        },
      },
    });
    if (!contact) {
      return NextResponse.json({ error: 'contato não encontrado' }, { status: 404 });
    }

    if (parsed.data.hardDeleteIn === 'immediate') {
      // Apaga em cascata: messages, conversations, contato.
      await prisma.$transaction([
        prisma.message.deleteMany({ where: { contactId: contact.id } }),
        prisma.broadcastRecipient.deleteMany({ where: { contactId: contact.id } }),
        prisma.conversation.deleteMany({ where: { contactId: contact.id } }),
        prisma.contact.delete({ where: { id: contact.id } }),
        prisma.auditLog.create({
          data: {
            workspaceId: authResult.workspaceId,
            action: 'lgpd.delete.hard',
            targetType: 'Contact',
            targetId: contact.id,
            metadata: { apiKeyId: authResult.apiKeyId, phoneE164: parsed.data.phoneE164 },
          },
        }),
      ]);
      log.info({ contactId: contact.id }, 'hard delete executado imediato');
      return NextResponse.json({ status: 'deleted', mode: 'immediate' });
    }

    const hardDeleteAt = new Date(Date.now() + HARD_DELETE_DAYS * 24 * 60 * 60 * 1000);
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        deletedAt: new Date(),
        hardDeleteAt,
        optedOut: true,
      },
    });
    await prisma.auditLog.create({
      data: {
        workspaceId: authResult.workspaceId,
        action: 'lgpd.delete.soft',
        targetType: 'Contact',
        targetId: contact.id,
        metadata: {
          apiKeyId: authResult.apiKeyId,
          hardDeleteAt: hardDeleteAt.toISOString(),
        },
      },
    });

    // Enqueue hard delete com delay até a data agendada. O worker sweep
    // periódico é fallback caso o Redis caia ou o job seja descartado.
    const job: LgpdHardDeleteJob = {
      workspaceId: authResult.workspaceId,
      contactId: contact.id,
    };
    const enq = await enqueue(QUEUE_NAMES.lgpdHardDelete, job, {
      delay: hardDeleteAt.getTime() - Date.now(),
      jobId: `hard-delete:${contact.id}`,
    });
    if (!enq.ok) {
      log.warn(
        { contactId: contact.id, err: enq.error },
        'enqueue hard delete falhou — worker sweep vai cobrir',
      );
    }

    log.info(
      { contactId: contact.id, hardDeleteAt: hardDeleteAt.toISOString(), enqueued: enq.ok },
      'soft delete + agendamento hard',
    );
    return NextResponse.json({
      status: 'scheduled',
      mode: '30d',
      hardDeleteAt: hardDeleteAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.httpStatus },
      );
    }
    log.error({ err: String(err) }, 'lgpd delete falhou');
    captureException(err, { context: 'lgpd.delete' });
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
