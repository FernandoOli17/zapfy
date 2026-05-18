import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldCheck, Webhook } from 'lucide-react';
import { prisma } from '@zapai/db';

import { OUTGOING_EVENT_DESCRIPTIONS } from '@/lib/webhooks-outgoing';
import { requireWorkspace } from '@/lib/inbox';

import { CreateWebhookForm } from './create-webhook-form';
import { WebhookRow } from './webhook-row';

export const metadata = { title: 'Webhooks de saída' };
export const dynamic = 'force-dynamic';

export default async function WebhooksPage() {
  const { workspace } = await requireWorkspace();
  const webhooks = await prisma.outgoingWebhook.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Integrações
        </Link>

        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
          Webhooks de saída
        </p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          Eventos pro{' '}
          <span className="font-serif italic font-normal text-primary">seu sistema.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          Inscreva URLs do seu backend pra receber eventos em tempo real. Cada disparo vem com
          assinatura HMAC-SHA256 no header <code>x-zapai-signature</code> pra você validar.
        </p>

        <section className="mt-10 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Webhook className="h-4 w-4 text-primary" />
            Novo webhook
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            URL HTTPS pública. Salvamos o secret cifrado. Mostramos só uma vez.
          </p>
          <div className="mt-5">
            <CreateWebhookForm />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Webhooks ativos</h2>
          {webhooks.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border/60 p-10 text-center">
              <Webhook className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-4 font-medium">Nenhum webhook ainda.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie acima pra começar a receber eventos.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
              {webhooks.map((w) => (
                <li key={w.id}>
                  <WebhookRow
                    webhook={{
                      id: w.id,
                      url: w.url,
                      events: w.events,
                      active: w.active,
                      createdAt: w.createdAt.toISOString(),
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="mt-3 text-xl font-medium tracking-tight">Como validar a assinatura</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No seu endpoint, compute HMAC-SHA256 do <code>request.body</code> usando seu secret:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] leading-relaxed text-foreground/90">{`const crypto = require('node:crypto');
const expected = 'sha256=' + crypto.createHmac('sha256', SECRET)
  .update(rawBody)
  .digest('hex');
const provided = req.headers['x-zapai-signature'];
// timingSafeEqual ou comparison constant-time
if (expected !== provided) return res.status(401).end();`}</pre>
        </section>

        <section className="mt-12">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
            Eventos disponíveis
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(OUTGOING_EVENT_DESCRIPTIONS).map(([name, desc]) => (
              <li
                key={name}
                className="rounded-lg border border-border/60 bg-card/40 p-3 text-sm"
              >
                <code className="font-mono text-foreground">{name}</code>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 text-center">
          <Link
            href="/integrations"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Voltar pra Integrações <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
