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
import { requireWorkspace } from '@/lib/inbox';
import { decrypt } from '@zapai/shared';
import { createWaClient, WaApiError } from '@zapai/wa';
import { env } from '@/env';

const log = createLogger('templates-actions');

async function requireAdmin() {
  const ctx = await requireWorkspace();
  if (ctx.member.role !== 'OWNER' && ctx.member.role !== 'ADMIN') {
    return { error: 'Apenas Owner/Admin podem gerenciar templates' as const };
  }
  return { user: ctx.user, workspace: ctx.workspace };
}

/**
 * Converte components do nosso formato interno (Zod) pro formato Meta esperado
 * em /message_templates. Meta exige array `[{type:'HEADER'},{type:'BODY'},...]`.
 */
function toMetaComponents(components: z.infer<typeof componentsSchema>): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  if (components.header) {
    out.push({
      type: 'HEADER',
      format: components.header.type,
      ...(components.header.text && { text: components.header.text }),
    });
  }
  out.push({ type: 'BODY', text: components.body.text });
  if (components.footer) {
    out.push({ type: 'FOOTER', text: components.footer.text });
  }
  if (components.buttons && components.buttons.length > 0) {
    out.push({
      type: 'BUTTONS',
      buttons: components.buttons.map((b) => ({
        type: b.type,
        text: b.text,
        ...(b.url && { url: b.url }),
        ...(b.phone_number && { phone_number: b.phone_number }),
      })),
    });
  }
  return out;
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

/**
 * Submete template pra aprovação na Meta WhatsApp Cloud API.
 * Atualiza `status=SUBMITTED` e `metaTemplateId` em sucesso. Em falha, marca
 * `status=REJECTED` com `rejectionReason`.
 *
 * Precondições:
 *  - workspace tem WhatsAppAccount CONNECTED (com wabaId + accessToken cifrado)
 *  - template ainda não tem `metaTemplateId` (não foi submetido)
 */
export async function submitTemplateToMeta(templateId: string): Promise<
  { status: 'ok'; metaTemplateId: string } | { status: 'error'; error: string }
> {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };

  const tpl = await prisma.messageTemplate.findFirst({
    where: { id: templateId, workspaceId: ctx.workspace.id },
  });
  if (!tpl) return { status: 'error', error: 'Template não encontrado' };
  if (tpl.metaTemplateId) {
    return { status: 'error', error: 'Template já foi submetido' };
  }

  const wa = await prisma.whatsAppAccount.findFirst({
    where: { workspaceId: ctx.workspace.id, status: 'CONNECTED' },
  });
  if (!wa) {
    return { status: 'error', error: 'Conecte um número WhatsApp primeiro em /whatsapp' };
  }

  let accessToken: string;
  try {
    accessToken = decrypt(wa.accessTokenEncrypted, env.ENCRYPTION_KEY);
  } catch {
    return { status: 'error', error: 'Token WhatsApp corrompido — reconecte em /whatsapp' };
  }

  const client = createWaClient({ phoneNumberId: wa.phoneNumberId, accessToken });

  // Reusa parser pra obter components normalizados
  const componentsParsed = componentsSchema.safeParse(tpl.components);
  if (!componentsParsed.success) {
    return { status: 'error', error: 'Components inválidos no template' };
  }

  try {
    const res = await client.submitTemplate({
      wabaId: wa.businessAccountId,
      name: tpl.name,
      language: tpl.language,
      category: tpl.category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
      components: toMetaComponents(componentsParsed.data),
    });

    await prisma.messageTemplate.update({
      where: { id: tpl.id },
      data: {
        metaTemplateId: res.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    log.info({ workspaceId: ctx.workspace.id, templateId: tpl.id, metaId: res.id }, 'template submetido pra Meta');
    revalidatePath('/automations/templates');
    return { status: 'ok', metaTemplateId: res.id };
  } catch (err) {
    const msg = err instanceof WaApiError ? err.message : err instanceof Error ? err.message : String(err);
    log.error({ workspaceId: ctx.workspace.id, templateId: tpl.id, err: msg }, 'submit template falhou');

    await prisma.messageTemplate.update({
      where: { id: tpl.id },
      data: {
        status: 'REJECTED',
        rejectionReason: `Erro Meta: ${msg.slice(0, 200)}`,
      },
    });
    return { status: 'error', error: msg };
  }
}

/**
 * Refresca status do template direto da Meta. Usado pelo polling do worker
 * e pelo botão "atualizar" na UI.
 */
export async function refreshTemplateStatus(templateId: string): Promise<
  { status: 'ok'; templateStatus: string } | { status: 'error'; error: string }
> {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };

  const tpl = await prisma.messageTemplate.findFirst({
    where: { id: templateId, workspaceId: ctx.workspace.id },
  });
  if (!tpl || !tpl.metaTemplateId) {
    return { status: 'error', error: 'Template não submetido ainda' };
  }

  const wa = await prisma.whatsAppAccount.findFirst({
    where: { workspaceId: ctx.workspace.id, status: 'CONNECTED' },
  });
  if (!wa) return { status: 'error', error: 'WhatsApp não conectado' };

  let accessToken: string;
  try {
    accessToken = decrypt(wa.accessTokenEncrypted, env.ENCRYPTION_KEY);
  } catch {
    return { status: 'error', error: 'Token corrompido' };
  }

  const client = createWaClient({ phoneNumberId: wa.phoneNumberId, accessToken });
  try {
    const meta = await client.getTemplate({
      wabaId: wa.businessAccountId,
      metaTemplateId: tpl.metaTemplateId,
    });
    // Status Meta: APPROVED | REJECTED | PENDING | PAUSED | DISABLED
    let next: 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'PAUSED';
    if (meta.status === 'APPROVED') next = 'APPROVED';
    else if (meta.status === 'REJECTED') next = 'REJECTED';
    else if (meta.status === 'PAUSED' || meta.status === 'DISABLED') next = 'PAUSED';
    else next = 'SUBMITTED';

    await prisma.messageTemplate.update({
      where: { id: tpl.id },
      data: {
        status: next,
        approvedAt: next === 'APPROVED' ? new Date() : null,
        rejectionReason: next === 'REJECTED' ? meta.rejected_reason ?? 'Rejeitado pela Meta' : null,
      },
    });

    revalidatePath('/automations/templates');
    return { status: 'ok', templateStatus: next };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', error: msg };
  }
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
