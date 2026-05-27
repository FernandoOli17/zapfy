'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  KnowledgeDocStatus,
  KnowledgeSource,
  prisma,
} from '@zapai/db';
import { processKnowledgeDocument } from '@zapai/ai';
import { createLogger, PlanLimitError } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { assertPlanLimit } from '@/lib/plans';
import { enqueue, QUEUE_NAMES, type ProcessKnowledgeJob } from '@/lib/queues';

const log = createLogger('knowledge-actions');

async function checkKnowledgeLimit(workspaceId: string): Promise<string | null> {
  const count = await prisma.knowledgeDocument.count({ where: { workspaceId } });
  try {
    await assertPlanLimit(workspaceId, 'knowledgeDocs', count);
    return null;
  } catch (err) {
    if (err instanceof PlanLimitError) return err.userMessage;
    throw err;
  }
}

async function requireWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  return { user: session.user, workspace: member.workspace };
}

/**
 * Enfileira processamento (chunk + embed). Se Redis indisponível (dev sem
 * worker), faz processamento inline em background — não bloqueia o request
 * mas roda imediatamente.
 */
async function dispatchProcessing(workspaceId: string, documentId: string): Promise<void> {
  const job: ProcessKnowledgeJob = { workspaceId, documentId };
  const result = await enqueue(QUEUE_NAMES.processKnowledge, job, {
    jobId: `knowledge-${documentId}`,
    attempts: 3,
  });
  if (!result.ok) {
    log.warn({ documentId }, 'fila indisponível — processando inline em background');
    // não-await: deixa a request retornar; promise corre em paralelo.
    void processKnowledgeDocument(documentId).catch((err) => {
      log.error({ documentId, err: String(err) }, 'inline process falhou');
    });
  }
}

const manualInput = z.object({
  title: z.string().trim().min(2).max(200),
  text: z.string().trim().min(10).max(50_000),
});

export async function addManualKnowledge(raw: z.infer<typeof manualInput>) {
  const ctx = await requireWorkspace();
  const parsed = manualInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error' as const, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const limit = await checkKnowledgeLimit(ctx.workspace.id);
  if (limit) return { status: 'error' as const, error: limit };

  // Cria PROCESSING com 1 chunk "raw" — o worker vai re-chunkar e embedar.
  const doc = await prisma.knowledgeDocument.create({
    data: {
      workspaceId: ctx.workspace.id,
      title: parsed.data.title,
      source: KnowledgeSource.MANUAL,
      status: KnowledgeDocStatus.PROCESSING,
      chunks: {
        create: [
          {
            content: parsed.data.text,
            tokens: Math.ceil(parsed.data.text.length / 4),
          },
        ],
      },
    },
  });

  await dispatchProcessing(ctx.workspace.id, doc.id);
  revalidatePath('/knowledge');
  return { status: 'ok' as const };
}

const urlInput = z.object({
  url: z.string().url(),
  customTitle: z.string().trim().max(200).optional(),
});

export async function addUrlKnowledge(raw: z.infer<typeof urlInput>) {
  const ctx = await requireWorkspace();
  const parsed = urlInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error' as const, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const limit = await checkKnowledgeLimit(ctx.workspace.id);
  if (limit) return { status: 'error' as const, error: limit };

  // Cria PROCESSING vazio — o worker faz scrape + chunk + embed.
  const doc = await prisma.knowledgeDocument.create({
    data: {
      workspaceId: ctx.workspace.id,
      title: parsed.data.customTitle ?? parsed.data.url,
      source: KnowledgeSource.URL,
      sourceUrl: parsed.data.url,
      status: KnowledgeDocStatus.PROCESSING,
    },
  });

  await dispatchProcessing(ctx.workspace.id, doc.id);
  revalidatePath('/knowledge');
  return { status: 'ok' as const };
}

export async function deleteKnowledgeDocument(docId: string) {
  const ctx = await requireWorkspace();
  const doc = await prisma.knowledgeDocument.findFirst({
    where: { id: docId, workspaceId: ctx.workspace.id },
  });
  if (!doc) {
    return { status: 'error' as const, error: 'Documento não encontrado' };
  }
  await prisma.$transaction([
    prisma.knowledgeChunk.deleteMany({ where: { documentId: doc.id } }),
    prisma.knowledgeDocument.delete({ where: { id: doc.id } }),
  ]);
  revalidatePath('/knowledge');
  return { status: 'ok' as const };
}

/** Re-processa um doc que ficou em ERROR ou PROCESSING travado. */
export async function reprocessKnowledgeDocument(docId: string) {
  const ctx = await requireWorkspace();
  const doc = await prisma.knowledgeDocument.findFirst({
    where: { id: docId, workspaceId: ctx.workspace.id },
  });
  if (!doc) {
    return { status: 'error' as const, error: 'Documento não encontrado' };
  }
  await prisma.knowledgeDocument.update({
    where: { id: doc.id },
    data: { status: KnowledgeDocStatus.PROCESSING, errorMessage: null },
  });
  await dispatchProcessing(ctx.workspace.id, doc.id);
  revalidatePath('/knowledge');
  return { status: 'ok' as const };
}
