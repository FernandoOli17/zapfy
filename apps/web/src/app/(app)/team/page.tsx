import { Crown, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { prisma, type WorkspaceRole } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

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
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Time</p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          Quem atende{' '}
          <span className="font-serif italic font-normal text-primary">com você.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          {members.length === 1
            ? 'Você é o único membro do workspace. Convide o time pra dividir o atendimento.'
            : `${members.length} pessoas no workspace.`}
        </p>

        <section className="mt-12">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Membros</h2>
          <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {initials(m.user.name ?? m.user.email)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.user.name ?? m.user.email}</p>
                      {m.userId === user.id && (
                        <span className="rounded-full border border-border/60 bg-secondary/40 px-1.5 text-[10px] text-muted-foreground">
                          você
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="inline-flex items-center gap-1 text-sm">
                    {m.role === 'OWNER' && <Crown className="h-3.5 w-3.5 text-primary" />}
                    {m.role === 'ADMIN' && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                    {ROLE_LABEL[m.role]}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    desde {m.joinedAt.toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="mt-3 text-xl font-medium tracking-tight">Convidar novo membro</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Convites por e-mail vêm logo. Por enquanto, peça pra pessoa criar conta com o mesmo
            e-mail e te avise que a gente associa manualmente.
          </p>
          {me?.role !== 'OWNER' && me?.role !== 'ADMIN' && (
            <p className="mt-4 text-xs text-muted-foreground">
              Só Owner ou Admin podem convidar.
            </p>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Papéis</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(['OWNER', 'ADMIN', 'AGENT'] as const).map((role) => (
              <div
                key={role}
                className="rounded-xl border border-border/60 bg-card/40 p-5"
              >
                <div className="flex items-center gap-2">
                  {role === 'OWNER' && <Crown className="h-4 w-4 text-primary" />}
                  {role === 'ADMIN' && <ShieldCheck className="h-4 w-4 text-primary" />}
                  {role === 'AGENT' && <Users className="h-4 w-4 text-primary" />}
                  <p className="font-medium">{ROLE_LABEL[role]}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{ROLE_DESC[role]}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
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
