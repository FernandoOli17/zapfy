'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';
import { runAgent, searchKnowledge, executeFlow } from '@zapfy/ai';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

const log = createLogger('agent-actions');

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    return { error: 'Apenas Owner/Admin podem alterar agente' as const };
  }
  return { user: session.user, workspace: member.workspace };
}

export async function rollbackToVersion(input: {
  agentId: string;
  versionId: string;
}) {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };

  const agent = await prisma.agent.findFirst({
    where: { id: input.agentId, workspaceId: ctx.workspace.id },
  });
  if (!agent) return { status: 'error' as const, error: 'Agente não encontrado' };

  const target = await prisma.agentVersion.findFirst({
    where: { id: input.versionId, agentId: agent.id },
  });
  if (!target) return { status: 'error' as const, error: 'Versão não encontrada' };

  if (agent.currentVersionId === target.id) {
    return { status: 'error' as const, error: 'Essa já é a versão atual' };
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: { currentVersionId: target.id },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'agent.rollback',
      targetType: 'Agent',
      targetId: agent.id,
      metadata: {
        fromVersionId: agent.currentVersionId,
        toVersionId: target.id,
        toVersionNumber: target.versionNumber,
      },
    },
  });
  log.info(
    { agentId: agent.id, toVersionNumber: target.versionNumber },
    'agent rollback aplicado',
  );
  revalidatePath('/agent');
  return { status: 'ok' as const };
}

// ─── Test action: simula mensagem inbound contra o agente publicado ─────────

const historyItem = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(2000),
});

const testInput = z.object({
  agentId: z.string().cuid(),
  inboundText: z.string().trim().min(1).max(1000),
  history: z.array(historyItem).max(20).default([]),
});

export type TestAgentResult =
  | {
      status: 'ok';
      replyText: string;
      toolsUsed: string[];
      tokensIn: number;
      tokensOut: number;
      handedOff: boolean;
      ragChunksUsed: number;
      tookMs: number;
      mode: 'default' | 'flow';
    }
  | { status: 'error'; error: string };

const RL_AGENT_TEST = { name: 'agent-test', limit: 20, windowSec: 60 } as const;

/**
 * Roda o agente publicado contra uma mensagem fake. Não envia WhatsApp,
 * não persiste Message nem UsageRecord. Só pra validar antes de conectar.
 *
 * RBAC: qualquer membro do workspace pode testar (read-only do agent).
 * Rate limit: 20/min/user pra não queimar API.
 */
export async function testAgent(
  raw: z.infer<typeof testInput>,
): Promise<TestAgentResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const parsed = testInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }

  const rl = await enforceRateLimit(`user:${session.user.id}`, RL_AGENT_TEST);
  if (!rl.success) {
    return { status: 'error', error: 'Muitos testes em pouco tempo. Aguarde 1 min.' };
  }

  // Encontra agent + version + workspace
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });
  if (!member) {
    return { status: 'error', error: 'Sem workspace' };
  }

  const agent = await prisma.agent.findFirst({
    where: { id: parsed.data.agentId, workspaceId: member.workspaceId },
    include: { currentVersion: true },
  });
  if (!agent || !agent.currentVersion) {
    return { status: 'error', error: 'Agente não publicado' };
  }

  const t0 = Date.now();
  try {
    // Stub deps — testes não invocam tools de verdade (sem WA, sem DB writes).
    const stubDeps = {
      workspaceId: member.workspaceId,
      contactId: 'test-contact',
      conversationId: 'test-conversation',
      searchKnowledge: (q: string) => searchKnowledge(member.workspaceId, q, 4),
      setContactField: async () => {
        /* no-op em test */
      },
      transferToHuman: async () => {
        /* no-op em test */
      },
      sendTemplate: async () => {
        /* no-op em test */
      },
    };
    const verticalDeps = {
      workspaceId: member.workspaceId,
      contactId: 'test-contact',
      conversationId: 'test-conversation',
    };

    const ragChunks = await searchKnowledge(
      member.workspaceId,
      parsed.data.inboundText,
      4,
    ).catch(() => []);

    const handoffRules =
      (agent.currentVersion.handoffRules as Record<string, unknown>) ?? {};
    const topicBlacklist = Array.isArray(handoffRules['keywords'])
      ? (handoffRules['keywords'] as string[]).filter(
          (s): s is string => typeof s === 'string',
        )
      : [];

    const flowGraph = agent.currentVersion.flowGraph;
    const useFlow = flowGraph !== null && flowGraph !== undefined;

    const result = useFlow
      ? await executeFlow({
          systemPrompt: agent.currentVersion.systemPrompt,
          vertical: agent.vertical,
          messageHistory: parsed.data.history,
          inboundText: parsed.data.inboundText,
          ragChunks,
          globalDeps: stubDeps,
          verticalDeps,
          maxSteps: 5,
          timeoutMs: 30_000,
          topicBlacklist,
          flowGraph,
          messageType: 'text',
        })
      : await runAgent({
          systemPrompt: agent.currentVersion.systemPrompt,
          vertical: agent.vertical,
          messageHistory: parsed.data.history,
          inboundText: parsed.data.inboundText,
          ragChunks,
          globalDeps: stubDeps,
          verticalDeps,
          maxSteps: 5,
          timeoutMs: 30_000,
          topicBlacklist,
        });

    log.info(
      {
        agentId: agent.id,
        userId: session.user.id,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        mode: useFlow ? 'flow' : 'default',
      },
      'test agent run',
    );

    // Marca o passo 2 do onboarding (estado derivado — ver lib/onboarding.ts).
    // Grava só uma vez por workspace; falha aqui não derruba o teste.
    try {
      const already = await prisma.auditLog.findFirst({
        where: { workspaceId: member.workspaceId, action: 'agent.test' },
        select: { id: true },
      });
      if (!already) {
        await prisma.auditLog.create({
          data: {
            workspaceId: member.workspaceId,
            userId: session.user.id,
            action: 'agent.test',
            targetType: 'Agent',
            targetId: agent.id,
          },
        });
      }
    } catch (err) {
      log.warn({ err: String(err) }, 'auditLog agent.test falhou — passo não marcado');
    }

    return {
      status: 'ok',
      replyText: result.text,
      toolsUsed: result.toolsUsed,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      handedOff: result.handedOff,
      ragChunksUsed: ragChunks.length,
      tookMs: Date.now() - t0,
      mode: useFlow ? 'flow' : 'default',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ agentId: agent.id, err: msg }, 'test agent falhou');
    return { status: 'error', error: msg };
  }
}
