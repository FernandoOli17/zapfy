import Link from 'next/link';
import { ArrowUpRight, KeyRound, Shield, Webhook } from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { CreateKeyForm } from './create-key-form';
import { KeyRow } from './key-row';

export const metadata = { title: 'Integrations · API keys' };
export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const { workspace } = await requireWorkspace();
  const [keys, webhooksCount, activeWebhooks] = await Promise.all([
    prisma.apiKey.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.outgoingWebhook.count({ where: { workspaceId: workspace.id } }),
    prisma.outgoingWebhook.count({ where: { workspaceId: workspace.id, active: true } }),
  ]);

  return (
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Integrations</p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          API keys{' '}
          <span className="font-serif italic font-normal text-primary">e webhooks.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          Crie chaves pra automatizar atendimento ao titular LGPD, integrar com seu sistema,
          ou rodar broadcasts via API. Cada chave tem scopes específicos — sem privilégios além
          do necessário.
        </p>

        <section className="mt-12 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4 text-primary" />
            Nova API key
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Mostramos o segredo UMA vez. Copie e salve em local seguro. Você pode revogar a
            qualquer momento.
          </p>
          <div className="mt-5">
            <CreateKeyForm />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Suas chaves</h2>
          {keys.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Nenhuma API key criada ainda.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
              {keys.map((k) => (
                <li key={k.id}>
                  <KeyRow
                    apiKey={{
                      id: k.id,
                      name: k.name,
                      prefix: k.prefix,
                      scopes: k.scopes,
                      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
                      expiresAt: k.expiresAt?.toISOString() ?? null,
                      revokedAt: k.revokedAt?.toISOString() ?? null,
                      createdAt: k.createdAt.toISOString(),
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Webhook className="h-4 w-4 text-primary" />
                Webhooks de saída
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {webhooksCount === 0
                  ? 'Nenhum endpoint configurado. Receba eventos do ZapAI no seu sistema.'
                  : `${activeWebhooks} ativo${activeWebhooks === 1 ? '' : 's'} de ${webhooksCount} configurado${webhooksCount === 1 ? '' : 's'}.`}
              </p>
            </div>
            <Link
              href="/integrations/webhooks"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Gerenciar <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="mt-3 text-xl font-medium tracking-tight">Segurança</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· Segredo nunca é armazenado — guardamos só SHA-256 hash + prefix visível.</li>
            <li>· Cada chave tem scope explícito. Sem &quot;admin: *&quot; por default.</li>
            <li>· Revogação imediata invalida a chave em todas as próximas requests.</li>
            <li>· Audit log de criação/revogação/uso em /settings (em breve).</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
