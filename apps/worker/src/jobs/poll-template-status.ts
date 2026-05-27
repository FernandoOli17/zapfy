import { prisma } from '@zapai/db';
import { createLogger, decrypt } from '@zapai/shared';
import { createWaClient, WaApiError } from '@zapai/wa';

import { env } from '../env';

const log = createLogger('worker:poll-template');

/**
 * Sweep periódico: pega todos os templates SUBMITTED com metaTemplateId,
 * consulta a Meta, atualiza status local pra APPROVED/REJECTED/PAUSED.
 *
 * Roda no worker a cada 15min. Idempotente.
 */
export async function sweepTemplateStatuses(): Promise<{ checked: number; changed: number }> {
  const pending = await prisma.messageTemplate.findMany({
    where: {
      status: 'SUBMITTED',
      metaTemplateId: { not: null },
    },
    take: 100, // bound: nunca pollamos > 100 por sweep
    include: {
      workspace: {
        include: {
          whatsappAccounts: {
            where: { status: 'CONNECTED' },
            take: 1,
          },
        },
      },
    },
  });

  let changed = 0;
  for (const tpl of pending) {
    const wa = tpl.workspace.whatsappAccounts[0];
    if (!wa || !tpl.metaTemplateId) continue;

    let accessToken: string;
    try {
      accessToken = decrypt(wa.accessTokenEncrypted, env.ENCRYPTION_KEY);
    } catch (err) {
      log.warn({ tplId: tpl.id, err: String(err) }, 'token decrypt falhou — pulo');
      continue;
    }

    const client = createWaClient({ phoneNumberId: wa.phoneNumberId, accessToken });
    try {
      const meta = await client.getTemplate({
        wabaId: wa.businessAccountId,
        metaTemplateId: tpl.metaTemplateId,
      });

      let next: 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'PAUSED' = 'SUBMITTED';
      if (meta.status === 'APPROVED') next = 'APPROVED';
      else if (meta.status === 'REJECTED') next = 'REJECTED';
      else if (meta.status === 'PAUSED' || meta.status === 'DISABLED') next = 'PAUSED';

      if (next !== tpl.status) {
        await prisma.messageTemplate.update({
          where: { id: tpl.id },
          data: {
            status: next,
            approvedAt: next === 'APPROVED' ? new Date() : null,
            rejectionReason:
              next === 'REJECTED' ? meta.rejected_reason ?? 'Rejeitado pela Meta' : null,
          },
        });
        changed += 1;
        log.info(
          { tplId: tpl.id, workspaceId: tpl.workspaceId, from: tpl.status, to: next },
          'template status atualizado',
        );
      }
    } catch (err) {
      const msg = err instanceof WaApiError ? err.message : String(err);
      log.warn({ tplId: tpl.id, err: msg }, 'poll falhou — tenta de novo no próximo sweep');
    }
  }

  return { checked: pending.length, changed };
}
