import { AlertTriangle, Building2 } from 'lucide-react';

import { requireWorkspace } from '@/lib/inbox';

import { DangerZone } from './danger-zone';
import { WorkspaceForm } from './workspace-form';

export const metadata = { title: 'Configurações' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { workspace, member } = await requireWorkspace();
  const isOwner = member.role === 'OWNER';

  return (
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Configurações</p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          O workspace,{' '}
          <span className="font-serif italic font-normal text-primary">por dentro.</span>
        </h1>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Identidade do workspace, horários, e o botão vermelho.
        </p>

        {!isOwner && (
          <div className="mt-8 rounded-md border border-yellow-500/40 bg-yellow-500/5 px-4 py-3 text-sm">
            Apenas o Owner pode editar essas configurações. Você é{' '}
            <strong className="capitalize">{member.role.toLowerCase()}</strong>.
          </div>
        )}

        <section className="mt-12 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium tracking-tight">Identidade</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Nome aparece no dashboard. Slug aparece nas URLs públicas.
          </p>
          <div className="mt-5">
            <WorkspaceForm
              workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
              isOwner={isOwner}
            />
          </div>
        </section>

        {isOwner && (
          <section className="mt-10 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 md:p-8">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-medium tracking-tight text-destructive">Danger zone</h2>
            </div>
            <p className="mt-1 text-xs text-destructive/80">
              Apagar o workspace é permanente. Apaga TODOS os dados:
              conversas, contatos, agentes, integrações, faturamento. Não tem volta.
            </p>
            <div className="mt-5">
              <DangerZone slug={workspace.slug} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
