'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  KnowledgeDocStatus,
  KnowledgeSource,
  prisma,
} from '@zapai/db';
import { createLogger, PlanLimitError } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { scrapeUrlForForge } from '@/lib/forge/io';
import { assertPlanLimit } from '@/lib/plans';

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
  await prisma.knowledgeDocument.create({
    data: {
      workspaceId: ctx.workspace.id,
      title: parsed.data.title,
      source: KnowledgeSource.MANUAL,
      status: KnowledgeDocStatus.READY,
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
  // cria PROCESSING, scrape, marca READY ou ERROR
  const doc = await prisma.knowledgeDocument.create({
    data: {
      workspaceId: ctx.workspace.id,
      title: parsed.data.customTitle ?? parsed.data.url,
      source: KnowledgeSource.URL,
      sourceUrl: parsed.data.url,
      status: KnowledgeDocStatus.PROCESSING,
    },
  });
  try {
    const { title, excerpt } = await scrapeUrlForForge(parsed.data.url);
    await prisma.$transaction([
      prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: {
          title: parsed.data.customTitle ?? title,
          status: KnowledgeDocStatus.READY,
        },
      }),
      prisma.knowledgeChunk.create({
        data: {
          documentId: doc.id,
          content: excerpt,
          tokens: Math.ceil(excerpt.length / 4),
        },
      }),
    ]);
    revalidatePath('/knowledge');
    return { status: 'ok' as const };
  } catch (err) {
    log.warn({ docId: doc.id, err: String(err) }, 'scrape falhou');
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        status: KnowledgeDocStatus.ERROR,
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : 'falha desconhecida',
      },
    });
    revalidatePath('/knowledge');
    return { status: 'error' as const, error: 'Falha ao baixar a URL. Confira se está pública.' };
  }
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
