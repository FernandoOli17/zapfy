import { ForbiddenError } from '@zapfy/shared';

import { prisma } from './index';

/**
 * Cliente Prisma escopado a um workspace. Use em todo lugar que toca entidade
 * de tenant (Contact, Message, Conversation, Agent, etc.).
 *
 * Implementação: extensão $extends do Prisma 6 que injeta `where: { workspaceId }`
 * em todas as queries pra modelos que têm essa coluna.
 *
 * NOTA: cobre find/findUnique/findFirst/findMany/update/delete/count/aggregate/groupBy.
 * Pra create, o caller deve passar `workspaceId` explícito — a extensão valida.
 */
const SCOPED_MODELS = new Set([
  'Workspace',
  'WorkspaceMember',
  'Subscription',
  'UsageRecord',
  'WhatsAppAccount',
  'Contact',
  'Conversation',
  'Message',
  'Agent',
  'AgentVersion',
  'ForgeSession',
  'KnowledgeDocument',
  'Product',
  'Tag',
  'ApiKey',
  'OutgoingWebhook',
  'AuditLog',
  'MessageTemplate',
  'Broadcast',
]);

const OPS_WITH_WHERE = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
]);

type AnyRecord = Record<string, unknown>;

function applyScope(
  rawArgs: unknown,
  operation: string,
  model: string,
  workspaceId: string,
): unknown {
  const scopeKey = model === 'Workspace' ? 'id' : 'workspaceId';
  const args = (rawArgs ?? {}) as AnyRecord;

  if (OPS_WITH_WHERE.has(operation)) {
    const where = (args['where'] ?? {}) as AnyRecord;
    args['where'] = { ...where, [scopeKey]: workspaceId };
    return args;
  }

  if (operation === 'create') {
    const data = (args['data'] ?? {}) as AnyRecord;
    if (data[scopeKey] !== undefined && data[scopeKey] !== workspaceId) {
      throw new ForbiddenError(`Tentativa de criar ${model} em workspace diferente`);
    }
    args['data'] = { ...data, [scopeKey]: workspaceId };
    return args;
  }

  if (operation === 'createMany') {
    const raw = args['data'];
    const list = Array.isArray(raw) ? (raw as AnyRecord[]) : [raw as AnyRecord];
    for (const item of list) {
      if (!item) continue;
      if (item[scopeKey] !== undefined && item[scopeKey] !== workspaceId) {
        throw new ForbiddenError(`Tentativa de criar ${model} em workspace diferente`);
      }
      item[scopeKey] = workspaceId;
    }
    args['data'] = Array.isArray(raw) ? list : list[0];
    return args;
  }

  return args;
}

export function scopedDb(workspaceId: string) {
  if (!workspaceId) {
    throw new ForbiddenError('workspaceId obrigatório');
  }

  return prisma.$extends({
    name: `scoped-${workspaceId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !SCOPED_MODELS.has(model)) {
            return query(args);
          }
          const scoped = applyScope(args, operation, model, workspaceId);
          return query(scoped as typeof args);
        },
      },
    },
  });
}

export type ScopedDb = ReturnType<typeof scopedDb>;
