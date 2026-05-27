'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';

const log = createLogger('professionals-actions');

async function requireWorkspaceAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { select: { id: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    return { error: 'Apenas OWNER/ADMIN podem gerenciar profissionais' as const };
  }
  return { user: session.user, workspaceId: member.workspace.id };
}

const professionalInput = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(2).max(120),
  specialty: z.string().trim().max(80).optional(),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  active: z.boolean().default(true),
});

export type SaveProfessionalResult =
  | { status: 'ok'; id: string }
  | { status: 'error'; error: string };

export async function saveProfessional(
  raw: z.infer<typeof professionalInput>,
): Promise<SaveProfessionalResult> {
  const ctx = await requireWorkspaceAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };
  const parsed = professionalInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const { id, ...data } = parsed.data;

  try {
    let pro;
    if (id) {
      const existing = await prisma.professional.findFirst({
        where: { id, workspaceId: ctx.workspaceId },
        select: { id: true },
      });
      if (!existing) return { status: 'error', error: 'Profissional não encontrado' };
      pro = await prisma.professional.update({
        where: { id },
        data: {
          name: data.name,
          ...(data.specialty ? { specialty: data.specialty } : { specialty: null }),
          ...(data.email ? { email: data.email } : { email: null }),
          active: data.active,
        },
      });
    } else {
      pro = await prisma.professional.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: data.name,
          ...(data.specialty ? { specialty: data.specialty } : {}),
          ...(data.email ? { email: data.email } : {}),
          active: data.active,
        },
      });
    }
    revalidatePath('/professionals');
    return { status: 'ok', id: pro.id };
  } catch (err) {
    log.error({ err: String(err) }, 'saveProfessional falhou');
    return { status: 'error', error: err instanceof Error ? err.message : 'Falha' };
  }
}

export async function deleteProfessional(
  id: string,
): Promise<{ status: 'ok' } | { status: 'error'; error: string }> {
  const ctx = await requireWorkspaceAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };

  const pro = await prisma.professional.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      _count: { select: { appointments: true } },
    },
  });
  if (!pro) return { status: 'error', error: 'Profissional não encontrado' };
  if (pro._count.appointments > 0) {
    return {
      status: 'error',
      error: `Esse profissional tem ${pro._count.appointments} agendamento(s). Desative em vez de apagar.`,
    };
  }
  try {
    await prisma.professional.delete({ where: { id: pro.id } });
    revalidatePath('/professionals');
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : 'Falha ao apagar' };
  }
}
