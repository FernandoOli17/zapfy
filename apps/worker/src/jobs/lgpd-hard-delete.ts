import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

const log = createLogger('worker:lgpd-hard-delete');

export interface LgpdHardDeleteJob {
  workspaceId: string;
  contactId: string;
}

/**
 * Job: apaga permanentemente um contato + cascateia mensagens/conversas
 * /broadcasts. Só executa se o contato tem hardDeleteAt setado E vencido
 * (verificação dupla pra segurança).
 */
export async function processLgpdHardDelete(data: LgpdHardDeleteJob): Promise<void> {
  const contact = await prisma.contact.findUnique({
    where: { id: data.contactId },
  });
  if (!contact) {
    log.info({ contactId: data.contactId }, 'contato já não existe (idempotente)');
    return;
  }
  if (contact.workspaceId !== data.workspaceId) {
    log.error(
      { contactId: data.contactId, expected: data.workspaceId, actual: contact.workspaceId },
      'workspaceId mismatch — recusa',
    );
    return;
  }
  if (!contact.hardDeleteAt || contact.hardDeleteAt > new Date()) {
    log.warn(
      { contactId: data.contactId, hardDeleteAt: contact.hardDeleteAt },
      'hardDeleteAt não atingido — pulando',
    );
    return;
  }

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { contactId: contact.id } }),
    prisma.broadcastRecipient.deleteMany({ where: { contactId: contact.id } }),
    prisma.conversation.deleteMany({ where: { contactId: contact.id } }),
    prisma.contact.delete({ where: { id: contact.id } }),
    prisma.auditLog.create({
      data: {
        workspaceId: contact.workspaceId,
        action: 'lgpd.hard_delete.executed',
        targetType: 'Contact',
        targetId: contact.id,
        metadata: {
          phoneE164: contact.phoneE164,
          scheduledAt: contact.deletedAt?.toISOString(),
          executedAt: new Date().toISOString(),
        },
      },
    }),
  ]);

  log.info({ contactId: contact.id }, 'hard delete executado');
}

/**
 * Sweep periódico: encontra contatos vencidos e enfileira hard delete pra cada.
 * Roda como repeatable job no worker.
 */
export async function sweepExpiredHardDeletes(): Promise<number> {
  const expired = await prisma.contact.findMany({
    where: {
      hardDeleteAt: { lte: new Date() },
      deletedAt: { not: null },
    },
    select: { id: true, workspaceId: true },
    take: 100,
  });

  for (const c of expired) {
    await processLgpdHardDelete({ workspaceId: c.workspaceId, contactId: c.id });
  }

  return expired.length;
}
