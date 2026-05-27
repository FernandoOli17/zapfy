'use server';

import { createHash, randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma, type Prisma, type WorkspaceRole } from '@zapai/db';
import { AppError, createLogger, assertSafeUrl, SsrfError } from '@zapai/shared';
import { flowGraphSchema, defaultFlowGraph } from '@zapai/ai/flow/types';
import { z } from 'zod';

import { auth } from '@/lib/auth';

const log = createLogger('developer-actions');

async function requireDev(): Promise<
  | {
      ok: true;
      user: { id: string; email: string };
      workspaceId: string;
      role: WorkspaceRole;
    }
  | { ok: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { select: { id: true, developerModeEnabled: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    return { ok: false, error: 'Apenas OWNER/ADMIN podem acessar o modo desenvolvedor.' };
  }
  if (!member.workspace.developerModeEnabled) {
    return { ok: false, error: 'Modo desenvolvedor desativado. Ative em Configurações.' };
  }
  return {
    ok: true,
    user: { id: session.user.id, email: session.user.email },
    workspaceId: member.workspace.id,
    role: member.role,
  };
}

// ─── Flow graph ──────────────────────────────────────────────────────────────

const saveFlowInput = z.object({
  agentId: z.string().cuid(),
  flowGraph: z.unknown(), // validado por flowGraphSchema abaixo
  changeNotes: z.string().max(500).optional(),
});

export type SaveFlowResult =
  | { status: 'ok'; versionNumber: number }
  | { status: 'error'; error: string };

/** Cria nova AgentVersion com o flowGraph customizado. */
export async function saveFlowGraph(raw: z.infer<typeof saveFlowInput>): Promise<SaveFlowResult> {
  const ctx = await requireDev();
  if (!ctx.ok) return { status: 'error', error: ctx.error };
  const parsed = saveFlowInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }

  // Valida graph
  const graphResult = flowGraphSchema.safeParse(parsed.data.flowGraph);
  if (!graphResult.success) {
    return {
      status: 'error',
      error: graphResult.error.issues[0]?.message ?? 'Flow graph inválido',
    };
  }

  // Confirma que o agent pertence ao workspace + carrega versão atual
  const agent = await prisma.agent.findFirst({
    where: { id: parsed.data.agentId, workspaceId: ctx.workspaceId },
    include: { currentVersion: true },
  });
  if (!agent || !agent.currentVersion) {
    return { status: 'error', error: 'Agente não encontrado nesse workspace' };
  }

  // Cria nova versão preservando os campos atuais + flowGraph novo
  const result = await prisma.$transaction(async (tx) => {
    const last = await tx.agentVersion.findFirst({
      where: { agentId: agent.id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const newVersion = await tx.agentVersion.create({
      data: {
        agentId: agent.id,
        versionNumber,
        systemPrompt: agent.currentVersion!.systemPrompt,
        personality: agent.currentVersion!.personality as Prisma.InputJsonValue,
        toolsEnabled: agent.currentVersion!.toolsEnabled,
        handoffRules: agent.currentVersion!.handoffRules as Prisma.InputJsonValue,
        ...(agent.currentVersion!.businessHours
          ? { businessHours: agent.currentVersion!.businessHours as Prisma.InputJsonValue }
          : {}),
        customToolNames: agent.currentVersion!.customToolNames,
        flowGraph: graphResult.data as Prisma.InputJsonValue,
        changeNotes: parsed.data.changeNotes ?? 'Flow customizado salvo via /developer',
        createdByUserId: ctx.user.id,
      },
    });

    await tx.agent.update({
      where: { id: agent.id },
      data: { currentVersionId: newVersion.id },
    });

    await tx.auditLog.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.user.id,
        action: 'developer.flow_save',
        targetType: 'AgentVersion',
        targetId: newVersion.id,
        metadata: { versionNumber, nodeCount: graphResult.data.nodes.length },
      },
    });

    return { versionNumber };
  });

  revalidatePath('/developer');
  revalidatePath('/agent');
  log.info({ workspaceId: ctx.workspaceId, agentId: agent.id, ...result }, 'flow salvo');
  return { status: 'ok', versionNumber: result.versionNumber };
}

/** Remove flowGraph da versão atual (volta pra pipeline default). */
export async function clearFlowGraph(agentId: string): Promise<SaveFlowResult> {
  return saveFlowGraph({
    agentId,
    flowGraph: defaultFlowGraph(),
    changeNotes: 'Flow resetado pra default',
  });
}

// ─── System prompt raw editor ────────────────────────────────────────────────

const savePromptInput = z.object({
  agentId: z.string().cuid(),
  systemPrompt: z.string().min(10).max(50_000),
  changeNotes: z.string().max(500).optional(),
});

export async function saveRawPrompt(raw: z.infer<typeof savePromptInput>): Promise<SaveFlowResult> {
  const ctx = await requireDev();
  if (!ctx.ok) return { status: 'error', error: ctx.error };
  const parsed = savePromptInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }

  const agent = await prisma.agent.findFirst({
    where: { id: parsed.data.agentId, workspaceId: ctx.workspaceId },
    include: { currentVersion: true },
  });
  if (!agent || !agent.currentVersion) {
    return { status: 'error', error: 'Agente não encontrado' };
  }

  const result = await prisma.$transaction(async (tx) => {
    const last = await tx.agentVersion.findFirst({
      where: { agentId: agent.id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const newVersion = await tx.agentVersion.create({
      data: {
        agentId: agent.id,
        versionNumber,
        systemPrompt: parsed.data.systemPrompt,
        personality: agent.currentVersion!.personality as Prisma.InputJsonValue,
        toolsEnabled: agent.currentVersion!.toolsEnabled,
        handoffRules: agent.currentVersion!.handoffRules as Prisma.InputJsonValue,
        ...(agent.currentVersion!.businessHours
          ? { businessHours: agent.currentVersion!.businessHours as Prisma.InputJsonValue }
          : {}),
        customToolNames: agent.currentVersion!.customToolNames,
        ...(agent.currentVersion!.flowGraph
          ? { flowGraph: agent.currentVersion!.flowGraph as Prisma.InputJsonValue }
          : {}),
        changeNotes: parsed.data.changeNotes ?? 'System prompt editado via /developer',
        createdByUserId: ctx.user.id,
      },
    });

    await tx.agent.update({
      where: { id: agent.id },
      data: { currentVersionId: newVersion.id },
    });

    await tx.auditLog.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.user.id,
        action: 'developer.prompt_save',
        targetType: 'AgentVersion',
        targetId: newVersion.id,
        metadata: { versionNumber, length: parsed.data.systemPrompt.length },
      },
    });

    return { versionNumber };
  });

  revalidatePath('/developer');
  revalidatePath('/agent');
  return { status: 'ok', versionNumber: result.versionNumber };
}

// ─── Custom tools ────────────────────────────────────────────────────────────

const toolNameRegex = /^[a-z][a-z0-9_]{1,40}$/;

const createCustomToolInput = z.object({
  name: z.string().regex(toolNameRegex, 'Use só minúsculas, números e _, começa com letra'),
  description: z.string().trim().min(10).max(500),
  inputSchema: z.unknown(), // JSON schema livre
  endpoint: z.string().url(),
  timeoutMs: z.number().int().min(1000).max(60_000).default(10_000),
});

export type CreateToolResult =
  | { status: 'ok'; toolId: string; secret: string; prefix: string }
  | { status: 'error'; error: string };

export async function createCustomTool(
  raw: z.infer<typeof createCustomToolInput>,
): Promise<CreateToolResult> {
  const ctx = await requireDev();
  if (!ctx.ok) return { status: 'error', error: ctx.error };
  const parsed = createCustomToolInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }

  // SSRF check no endpoint
  try {
    await assertSafeUrl(parsed.data.endpoint);
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof SsrfError ? `Endpoint inseguro: ${err.message}` : 'Endpoint inválido',
    };
  }

  // Valida JSON Schema básico (precisa ser objeto com type:object)
  const schemaObj = parsed.data.inputSchema as Record<string, unknown> | null;
  if (
    !schemaObj ||
    typeof schemaObj !== 'object' ||
    Array.isArray(schemaObj) ||
    schemaObj['type'] !== 'object'
  ) {
    return {
      status: 'error',
      error: 'inputSchema deve ser um JSON Schema com type: "object"',
    };
  }

  // Defesa contra schema com referência circular / profundidade absurda —
  // o agente IA poderia ser feito de DoS se o SDK depois resolvesse `$ref`
  // recursivamente. Não precisamos de $ref em tool args; bloqueia tudo.
  try {
    assertNoCircularOrDeep(schemaObj);
  } catch (err) {
    return {
      status: 'error',
      error: `inputSchema rejeitado: ${err instanceof Error ? err.message : 'inválido'}`,
    };
  }

  // Já existe com mesmo nome?
  const existing = await prisma.customTool.findUnique({
    where: { workspaceId_name: { workspaceId: ctx.workspaceId, name: parsed.data.name } },
  });
  if (existing) {
    return { status: 'error', error: `Já existe tool chamada "${parsed.data.name}"` };
  }

  // Gera secret + hash
  const secret = `cs_${randomBytes(24).toString('base64url')}`;
  const secretHash = createHash('sha256').update(secret).digest('hex');
  const secretPrefix = secret.slice(0, 11); // cs_ + 8 chars

  const tool = await prisma.customTool.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      inputSchema: schemaObj as Prisma.InputJsonValue,
      endpoint: parsed.data.endpoint,
      secretHash,
      secretPrefix,
      timeoutMs: parsed.data.timeoutMs,
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspaceId,
      userId: ctx.user.id,
      action: 'developer.tool_create',
      targetType: 'CustomTool',
      targetId: tool.id,
      metadata: { name: tool.name },
    },
  });

  revalidatePath('/developer');
  return { status: 'ok', toolId: tool.id, secret, prefix: secretPrefix };
}

export async function toggleCustomTool(
  toolId: string,
  active: boolean,
): Promise<{ status: 'ok' } | { status: 'error'; error: string }> {
  const ctx = await requireDev();
  if (!ctx.ok) return { status: 'error', error: ctx.error };

  const tool = await prisma.customTool.findFirst({
    where: { id: toolId, workspaceId: ctx.workspaceId },
  });
  if (!tool) return { status: 'error', error: 'Tool não encontrada' };

  await prisma.customTool.update({
    where: { id: tool.id },
    data: { active },
  });
  revalidatePath('/developer');
  return { status: 'ok' };
}

export async function deleteCustomTool(
  toolId: string,
): Promise<{ status: 'ok' } | { status: 'error'; error: string }> {
  const ctx = await requireDev();
  if (!ctx.ok) return { status: 'error', error: ctx.error };

  const tool = await prisma.customTool.findFirst({
    where: { id: toolId, workspaceId: ctx.workspaceId },
  });
  if (!tool) return { status: 'error', error: 'Tool não encontrada' };

  await prisma.customTool.delete({ where: { id: tool.id } });
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspaceId,
      userId: ctx.user.id,
      action: 'developer.tool_delete',
      targetType: 'CustomTool',
      targetId: tool.id,
      metadata: { name: tool.name },
    },
  });
  revalidatePath('/developer');
  return { status: 'ok' };
}

/**
 * Recursão bounded por depth + tracking de objetos já vistos (WeakSet).
 * Lança em referência circular OU profundidade > 30 OU presença de `$ref`.
 * Mantém o schema simples e seguro de processar/serializar.
 */
function assertNoCircularOrDeep(
  node: unknown,
  seen: WeakSet<object> = new WeakSet(),
  depth = 0,
): void {
  if (depth > 30) throw new Error('schema profundo demais (max 30 níveis)');
  if (!node || typeof node !== 'object') return;
  const obj = node as object;
  if (seen.has(obj)) throw new Error('referência circular detectada');
  seen.add(obj);
  if (Array.isArray(node)) {
    for (const it of node) assertNoCircularOrDeep(it, seen, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === '$ref') {
      throw new Error('`$ref` não é permitido em inputSchema de custom tool');
    }
    assertNoCircularOrDeep(v, seen, depth + 1);
  }
}

// Used only to keep AppError import alive (defensive — used elsewhere indirectly).
void AppError;
