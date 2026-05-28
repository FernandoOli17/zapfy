'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type Prisma } from '@zapfy/db';
import { createLogger, phoneE164Schema } from '@zapfy/shared';
import { z } from 'zod';

import { requireWorkspace } from '@/lib/inbox';

const log = createLogger('contacts-actions');

async function requireWorkspaceMember() {
  return requireWorkspace();
}

function requireAdminOrOwner(role: string) {
  if (role !== 'OWNER' && role !== 'ADMIN') {
    return 'Apenas Owner/Admin pode gerenciar contatos manualmente';
  }
  return null;
}

const tagsField = z
  .string()
  .optional()
  .transform((s) =>
    (s ?? '')
      .split(/[,;\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );

const baseContactInput = z.object({
  phone: phoneE164Schema,
  name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  email: z
    .string()
    .trim()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('').transform(() => undefined))
    .transform((v) => (v && v.length > 0 ? v : null)),
  tags: tagsField,
  optedOut: z.boolean().optional().default(false),
});

export type ContactInput = z.input<typeof baseContactInput>;
export type ContactActionResult =
  | { status: 'ok'; contactId: string }
  | { status: 'error'; error: string };

export async function createContact(raw: ContactInput): Promise<ContactActionResult> {
  const ctx = await requireWorkspaceMember();
  const guard = requireAdminOrOwner(ctx.member.role);
  if (guard) return { status: 'error', error: guard };

  const parsed = baseContactInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }

  const existing = await prisma.contact.findFirst({
    where: {
      workspaceId: ctx.workspace.id,
      phoneE164: parsed.data.phone,
    },
  });
  if (existing) {
    if (existing.deletedAt) {
      // restaura soft-deletado em vez de duplicar
      const restored = await prisma.contact.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          hardDeleteAt: null,
          name: parsed.data.name,
          email: parsed.data.email,
          tags: parsed.data.tags,
          optedOut: parsed.data.optedOut ?? false,
        },
      });
      await audit(ctx, 'contact.restored', restored.id, { phone: restored.phoneE164 });
      revalidatePath('/contacts');
      return { status: 'ok', contactId: restored.id };
    }
    return {
      status: 'error',
      error: 'Já existe um contato com esse telefone neste workspace.',
    };
  }

  const data: Prisma.ContactUncheckedCreateInput = {
    workspaceId: ctx.workspace.id,
    phoneE164: parsed.data.phone,
    name: parsed.data.name,
    email: parsed.data.email,
    tags: parsed.data.tags,
    optedOut: parsed.data.optedOut ?? false,
  };
  const created = await prisma.contact.create({ data });

  await audit(ctx, 'contact.created', created.id, {
    phone: created.phoneE164,
    manual: true,
  });
  log.info({ workspaceId: ctx.workspace.id, contactId: created.id }, 'contato criado manualmente');
  revalidatePath('/contacts');
  return { status: 'ok', contactId: created.id };
}

const updateInput = baseContactInput.extend({ id: z.string().cuid() });
export type UpdateContactInput = z.input<typeof updateInput>;

export async function updateContact(raw: UpdateContactInput): Promise<ContactActionResult> {
  const ctx = await requireWorkspaceMember();
  const guard = requireAdminOrOwner(ctx.member.role);
  if (guard) return { status: 'error', error: guard };

  const parsed = updateInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }

  const contact = await prisma.contact.findFirst({
    where: { id: parsed.data.id, workspaceId: ctx.workspace.id },
  });
  if (!contact) return { status: 'error', error: 'Contato não encontrado' };

  // Se mudou telefone, valida unicidade
  if (parsed.data.phone !== contact.phoneE164) {
    const dup = await prisma.contact.findFirst({
      where: {
        workspaceId: ctx.workspace.id,
        phoneE164: parsed.data.phone,
        id: { not: contact.id },
      },
    });
    if (dup) {
      return {
        status: 'error',
        error: 'Outro contato já usa esse telefone neste workspace.',
      };
    }
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      phoneE164: parsed.data.phone,
      name: parsed.data.name,
      email: parsed.data.email,
      tags: parsed.data.tags,
      optedOut: parsed.data.optedOut ?? false,
    },
  });

  await audit(ctx, 'contact.updated', contact.id, { phone: parsed.data.phone });
  revalidatePath('/contacts');
  revalidatePath(`/contacts/${contact.id}/edit`);
  return { status: 'ok', contactId: contact.id };
}

export async function deleteContact(contactId: string): Promise<ContactActionResult> {
  const ctx = await requireWorkspaceMember();
  const guard = requireAdminOrOwner(ctx.member.role);
  if (guard) return { status: 'error', error: guard };

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId: ctx.workspace.id, deletedAt: null },
  });
  if (!contact) return { status: 'error', error: 'Contato não encontrado' };

  // Soft delete; hard delete LGPD é job separado em 30d
  const hardDeleteAt = new Date();
  hardDeleteAt.setDate(hardDeleteAt.getDate() + 30);
  await prisma.contact.update({
    where: { id: contact.id },
    data: { deletedAt: new Date(), hardDeleteAt },
  });

  await audit(ctx, 'contact.deleted', contact.id, { phone: contact.phoneE164, hardDeleteAt });
  log.info({ contactId: contact.id }, 'contato soft-deleted');
  revalidatePath('/contacts');
  return { status: 'ok', contactId: contact.id };
}

async function audit(
  ctx: { workspace: { id: string }; user: { id: string } },
  action: string,
  targetId: string,
  metadata: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action,
      targetType: 'Contact',
      targetId,
      metadata,
    },
  });
}
