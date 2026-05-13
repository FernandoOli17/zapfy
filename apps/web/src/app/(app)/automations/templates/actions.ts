'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  prisma,
  TemplateStatus,
  type Prisma,
  type TemplateCategory,
} from '@zapai/db';
import { createLogger } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';

const log = createLogger('templates-actions');

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
    return { error: 'Apenas Owner/Admin podem gerenciar templates' as const };
  }
  return { user: session.user, workspace: member.workspace };
}

const buttonSchema = z.object({
  type: z.enum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER']),
  text: z.string().min(1).max(25),
  url: z.string().url().optional(),
  phone_number: z.string().optional(),
});

const componentsSchema = z.object({
  header: z
    .object({
      type: z.enum(['TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO']),
      text: z.string().max(60).optional(),
    })
    .optional(),
  body: z.object({
    text: z.string().min(1).max(1024),
  }),
  footer: z
    .object({
      text: z.string().max(60),
    })
    .optional(),
  buttons: z.array(buttonSchema).max(3).optional(),
});

const createInput = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e underscore'),
  language: z.enum(['pt_BR', 'en_US', 'es_ES']).default('pt_BR'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  components: componentsSchema,
});

export async function createMessageTemplate(raw: z.infer<typeof createInput>) {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };
  const parsed = createInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error' as const, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }

  const existing = await prisma.messageTemplate.findFirst({
    where: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      language: parsed.data.language,
    },
  });
  if (existing) {
    return {
      status: 'error' as const,
      error: 'Já existe um template com esse nome e idioma neste workspace.',
    };
  }

  await prisma.messageTemplate.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      language: parsed.data.language,
      category: parsed.data.category as TemplateCategory,
      components: parsed.data.components as unknown as Prisma.InputJsonValue,
      status: TemplateStatus.SUBMITTED, // mock; submissão real à Meta entra na Fase 9 completa
      submittedAt: new Date(),
    },
  });

  log.info({ workspaceId: ctx.workspace.id, name: parsed.data.name }, 'template criado');
  revalidatePath('/automations/templates');
  return { status: 'ok' as const };
}

export async function deleteMessageTemplate(templateId: string) {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };

  const tpl = await prisma.messageTemplate.findFirst({
    where: { id: templateId, workspaceId: ctx.workspace.id },
  });
  if (!tpl) return { status: 'error' as const, error: 'Template não encontrado' };

  // Verifica se algum broadcast usa esse template
  const usedBy = await prisma.broadcast.count({ where: { templateId: tpl.id } });
  if (usedBy > 0) {
    return {
      status: 'error' as const,
      error: `Template em uso por ${usedBy} broadcast${usedBy === 1 ? '' : 's'}. Apague-os primeiro.`,
    };
  }

  await prisma.messageTemplate.delete({ where: { id: tpl.id } });
  revalidatePath('/automations/templates');
  return { status: 'ok' as const };
}

/** Mock pra simular aprovação/rejeição pela Meta. Útil pra teste. */
export async function mockApproveTemplate(templateId: string, approved: boolean) {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };

  const tpl = await prisma.messageTemplate.findFirst({
    where: { id: templateId, workspaceId: ctx.workspace.id },
  });
  if (!tpl) return { status: 'error' as const, error: 'Template não encontrado' };

  await prisma.messageTemplate.update({
    where: { id: tpl.id },
    data: {
      status: approved ? TemplateStatus.APPROVED : TemplateStatus.REJECTED,
      approvedAt: approved ? new Date() : null,
      rejectionReason: approved ? null : 'Mock: rejeitado manualmente pra teste',
    },
  });
  revalidatePath('/automations/templates');
  return { status: 'ok' as const };
}
