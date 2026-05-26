'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';
import { prisma, type Prisma } from '@zapai/db';
import { createLogger, phoneE164Schema } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';

const log = createLogger('contacts-import');

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

const csvRowSchema = z.object({
  phone: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.string().optional(),
});

export interface ImportResult {
  status: 'ok' | 'error';
  error?: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: Array<{ row: number; phone?: string; reason: string }>;
}

const MAX_ROWS = 5_000;

export async function importContactsCsv(formData: FormData): Promise<ImportResult> {
  const ctx = await requireWorkspace();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return blank('error', 'Arquivo CSV obrigatório');
  }
  if (file.size > 5 * 1024 * 1024) {
    return blank('error', 'Arquivo muito grande (máx 5 MB).');
  }
  const text = await file.text();

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return blank('error', `CSV inválido: ${parsed.errors[0]?.message ?? 'erro de parse'}`);
  }

  if (parsed.data.length > MAX_ROWS) {
    return blank('error', `Máximo ${MAX_ROWS} linhas por import. Esse arquivo tem ${parsed.data.length}.`);
  }

  const result: ImportResult = {
    status: 'ok',
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i] ?? {};
    const rowNumber = i + 2; // header é linha 1

    const validated = csvRowSchema.safeParse({
      phone: row['phone'] ?? row['telefone'] ?? row['numero'] ?? row['number'] ?? '',
      name: row['name'] ?? row['nome'] ?? undefined,
      email: row['email'] ?? row['e-mail'] ?? undefined,
      tags: row['tags'] ?? row['tag'] ?? undefined,
    });
    if (!validated.success) {
      result.failed++;
      result.failures.push({
        row: rowNumber,
        reason: validated.error.issues[0]?.message ?? 'inválido',
      });
      continue;
    }

    const phoneResult = phoneE164Schema.safeParse(validated.data.phone);
    if (!phoneResult.success) {
      result.failed++;
      result.failures.push({
        row: rowNumber,
        phone: validated.data.phone,
        reason: 'telefone inválido (use formato internacional)',
      });
      continue;
    }
    const phoneE164 = phoneResult.data;

    const tags = (validated.data.tags ?? '')
      .split(/[,;|]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);

    try {
      const updateData: Prisma.ContactUpdateInput = {};
      const createData: Prisma.ContactCreateInput = {
        workspace: { connect: { id: ctx.workspace.id } },
        phoneE164,
        ...(validated.data.name ? { name: validated.data.name } : {}),
        ...(validated.data.email ? { email: validated.data.email } : {}),
        tags,
      };
      if (validated.data.name) updateData.name = validated.data.name;
      if (validated.data.email) updateData.email = validated.data.email;
      if (tags.length > 0) updateData.tags = tags;

      const existing = await prisma.contact.findUnique({
        where: {
          workspaceId_phoneE164: { workspaceId: ctx.workspace.id, phoneE164 },
        },
      });

      if (existing) {
        if (Object.keys(updateData).length === 0) {
          result.skipped++;
        } else {
          await prisma.contact.update({
            where: { id: existing.id },
            data: updateData,
          });
          result.updated++;
        }
      } else {
        await prisma.contact.create({ data: createData });
        result.created++;
      }
    } catch (err) {
      result.failed++;
      result.failures.push({
        row: rowNumber,
        phone: phoneE164,
        reason: err instanceof Error ? err.message.slice(0, 200) : 'erro inesperado',
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'contacts.import_csv',
      targetType: 'Contact',
      metadata: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
      },
    },
  });

  log.info(
    {
      workspaceId: ctx.workspace.id,
      ...result,
      failures: result.failures.length,
    },
    'contacts import csv',
  );

  revalidatePath('/contacts');
  return result;
}

function blank(status: 'error' | 'ok', error?: string): ImportResult {
  return {
    status,
    ...(error ? { error } : {}),
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };
}
