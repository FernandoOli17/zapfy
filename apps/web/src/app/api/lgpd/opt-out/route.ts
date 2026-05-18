import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@zapai/db';
import { AppError, createLogger, phoneE164Schema } from '@zapai/shared';
import { z } from 'zod';

import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { clientIp, enforceRateLimit, RL_LGPD_API } from '@/lib/rate-limit';

const log = createLogger('lgpd-opt-out');

const inputSchema = z.object({
  phoneE164: phoneE164Schema,
  optOut: z.boolean().default(true),
});

/**
 * POST /api/lgpd/opt-out
 * Body: { phoneE164: string, optOut?: boolean }  (default true; passa false pra reativar)
 * Auth: Bearer zk_xxx com scope lgpd:opt-out.
 *
 * Marca o contato como "não contatar". Bloqueia broadcasts, templates HSM
 * e qualquer mensagem ativa partida do agente. Contato pode continuar
 * conversando — só não recebe nada por iniciativa nossa.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    const rl = await enforceRateLimit(`lgpd-opt-out:${ip}`, RL_LGPD_API);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'rate limit', retryAfterMs: rl.reset - Date.now() },
        { status: 429, headers: { 'retry-after': String(Math.ceil((rl.reset - Date.now()) / 1000)) } },
      );
    }

    const authResult = await authenticateApiKey(req.headers.get('authorization'));
    requireScope(authResult, 'lgpd:opt-out');

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

    await prisma.contact.update({
      where: { id: contact.id },
      data: { optedOut: parsed.data.optOut },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: authResult.workspaceId,
        action: parsed.data.optOut ? 'lgpd.opt_out' : 'lgpd.opt_in',
        targetType: 'Contact',
        targetId: contact.id,
        metadata: { apiKeyId: authResult.apiKeyId },
      },
    });

    log.info(
      { contactId: contact.id, optedOut: parsed.data.optOut },
      parsed.data.optOut ? 'opt-out registrado' : 'opt-in (revogou opt-out anterior)',
    );

    return NextResponse.json({ status: 'ok', optedOut: parsed.data.optOut });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.httpStatus },
      );
    }
    log.error({ err: String(err) }, 'lgpd opt-out falhou');
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
