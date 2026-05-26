import { Crown, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { prisma, type WorkspaceRole } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { InviteForm } from './invite-form';

export const metadata = { title: 'Time' };
export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  AGENT: 'Atendente',
};

const ROLE_DESC: Record<WorkspaceRole, string> = {
  OWNER: 'Acesso total. Pode tudo, incluindo billing.',
  ADMIN: 'Gerencia agente, número, conhecimento e API keys.',
  AGENT: 'Atende conversas no inbox. Sem acesso a billing ou config.',
};

export default async function TeamPage() {
  const { workspace, user } = await requireWorkspace();

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });

  const me = members.find((m) => m.userId === user.id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Gestão</p>
          <h1 className="mt-1 flex items-baseline gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Time
            <span className="text-base font-normal text-muted-foreground">
              {members.length}
            </span>
          </h1>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {members.length === 1
          ? 'Você é o único membro do workspace. Convide o time pra dividir o atendimento.'
          : `${members.length} pessoas no workspace.`}
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-tight">Membros</h2>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {initials(m.user.name ?? m.user.email)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{m.user.name ?? m.user.email}</p>
                    {m.userId === user.id && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        você
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <RoleBadge role={m.role} />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  desde {m.joinedAt.toLocaleDateString('pt-BR')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold tracking-tight">Convidar novo membro</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Mande um link de convite por e-mail. Quem aceitar entra no workspace com o papel que
          você escolher. Link expira em 7 dias.
        </p>
        {me?.role !== 'OWNER' && me?.role !== 'ADMIN' ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Só Owner ou Admin podem convidar.
          </p>
        ) : (
          <div className="mt-5">
            <InviteForm />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight">Papéis</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {(['OWNER', 'ADMIN', 'AGENT'] as const).map((role) => (
            <div key={role} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                {role === 'OWNER' && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Crown className="h-3.5 w-3.5" />
                  </div>
                )}
                {role === 'ADMIN' && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                )}
                {role === 'AGENT' && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                )}
                <p className="text-sm font-semibold">{ROLE_LABEL[role]}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{ROLE_DESC[role]}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: WorkspaceRole }) {
  if (role === 'OWNER') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
        <Crown className="h-3 w-3" />
        Owner
      </span>
    );
  }
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
      <Users className="h-3 w-3" />
      Atendente
    </span>
  );
}

function initials(s: string): string {
  return s
    .split(/[@\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}
