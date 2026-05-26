import Link from 'next/link';
import { ArrowUpRight, Check, KeyRound, Shield, Webhook } from 'lucide-react';
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
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">Gestão</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Integrações
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Crie chaves pra automatizar atendimento ao titular LGPD, integrar com seu sistema, ou
          rodar broadcasts via API. Cada chave tem scopes específicos — sem privilégios além do
          necessário.
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Nova API key</h2>
            <p className="text-xs text-muted-foreground">
              Mostramos o segredo UMA vez. Copie e salve em local seguro. Você pode revogar a
              qualquer momento.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <CreateKeyForm />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-tight">Suas chaves</h2>
        {keys.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Nenhuma API key criada ainda.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
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

      <section className="mt-6 rounded-xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Webhook className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Webhooks de saída</h2>
              <p className="text-xs text-muted-foreground">
                {webhooksCount === 0
                  ? 'Nenhum endpoint configurado. Receba eventos do Orbe no seu sistema.'
                  : `${activeWebhooks} ativo${activeWebhooks === 1 ? '' : 's'} de ${webhooksCount} configurado${webhooksCount === 1 ? '' : 's'}.`}
              </p>
            </div>
          </div>
          <Link
            href="/integrations/webhooks"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            Gerenciar <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 md:p-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Shield className="h-4 w-4" />
        </div>
        <h3 className="mt-3 text-base font-semibold tracking-tight">Segurança</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Segredo nunca é armazenado — guardamos só SHA-256 hash + prefix visível.
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Cada chave tem scope explícito. Sem &quot;admin: *&quot; por default.
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Revogação imediata invalida a chave em todas as próximas requests.
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Audit log de criação/revogação/uso em /settings.
          </li>
        </ul>
      </section>
    </div>
  );
}
