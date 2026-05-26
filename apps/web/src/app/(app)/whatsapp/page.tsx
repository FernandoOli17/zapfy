import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ExternalLink,
  Phone,
  Sparkles,
} from 'lucide-react';
import { prisma, type WhatsAppStatus } from '@zapai/db';
import { cn } from '@zapai/ui';

import { auth } from '@/lib/auth';
import { env } from '@/env';

import { ConnectForm } from './connect-form';
import { AccountActions } from './account-actions';
import { CopyButton } from './copy-button';

export const metadata = { title: 'WhatsApp — Conectar número' };

export default async function WhatsAppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
  });
  if (!member) redirect('/onboarding');

  const accounts = await prisma.whatsAppAccount.findMany({
    where: { workspaceId: member.workspace.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">Integrações</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          WhatsApp Cloud API
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cole as credenciais do seu Meta App. Tokens são cifrados at-rest com AES-256-GCM e
          nunca aparecem em log. O passo a passo na Meta tá logo abaixo.
        </p>
      </div>

      {accounts.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold tracking-tight">Conectado</h2>
          <div className="mt-3 space-y-3">
            {accounts.map((a) => (
              <AccountCard
                key={a.id}
                account={{
                  id: a.id,
                  phoneNumberId: a.phoneNumberId,
                  businessAccountId: a.businessAccountId,
                  displayPhone: a.displayPhone,
                  status: a.status,
                  webhookVerifyToken: a.webhookVerifyToken,
                  lastErrorMessage: a.lastErrorMessage,
                  connectedAt: a.connectedAt?.toISOString() ?? null,
                }}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight">
          {accounts.length > 0 ? 'Adicionar outro número' : 'Conectar primeiro número'}
        </h2>
        <div className="mt-3 rounded-xl border border-border bg-card p-6 md:p-8">
          <ConnectForm />
        </div>
      </section>

      <Instructions appUrl={env.NEXT_PUBLIC_APP_URL} />
    </div>
  );
}

interface AccountSummary {
  id: string;
  phoneNumberId: string;
  businessAccountId: string;
  displayPhone: string;
  status: WhatsAppStatus;
  webhookVerifyToken: string;
  lastErrorMessage: string | null;
  connectedAt: string | null;
}

function AccountCard({ account }: { account: AccountSummary }) {
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/webhooks/whatsapp/${account.phoneNumberId}`;
  const isConnected = account.status === 'CONNECTED';
  const statusIcon =
    account.status === 'CONNECTED' ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    ) : account.status === 'ERROR' ? (
      <AlertCircle className="h-4 w-4 text-destructive" />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 md:p-6 shadow-sm',
        isConnected ? 'border-emerald-500/30' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {statusIcon}
            <span>{account.status.toLowerCase()}</span>
            {account.connectedAt && (
              <>
                <span aria-hidden>·</span>
                <span>desde {new Date(account.connectedAt).toLocaleDateString('pt-BR')}</span>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <span className="text-xl font-semibold tracking-tight">+{account.displayPhone}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            phone_number_id: <code className="font-mono">{account.phoneNumberId}</code> · waba_id:{' '}
            <code className="font-mono">{account.businessAccountId}</code>
          </p>
        </div>
        <AccountActions accountId={account.id} status={account.status} />
      </div>

      {account.lastErrorMessage && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {account.lastErrorMessage}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CopyField label="URL do webhook (cole na Meta)" value={webhookUrl} />
        <CopyField label="Verify token (cole na Meta)" value={account.webhookVerifyToken} mask />
      </div>
    </div>
  );
}

function CopyField({ label, value, mask }: { label: string; value: string; mask?: boolean }) {
  const display = mask
    ? `${value.slice(0, 6)}${'•'.repeat(Math.max(0, value.length - 10))}${value.slice(-4)}`
    : value;
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate font-mono text-xs">{display}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function Instructions({ appUrl }: { appUrl: string }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold tracking-tight">
        Como pegar essas credenciais na Meta
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Step
          n="01"
          title="Crie um Meta App"
          body={
            <>
              Vai em <ExternalLinkA href="https://developers.facebook.com/apps" /> e cria um App
              do tipo <strong>Business</strong>. Em <em>Add a product</em>, ativa{' '}
              <strong>WhatsApp Business</strong>.
            </>
          }
        />
        <Step
          n="02"
          title="Pegue phone_number_id e access token"
          body={
            <>
              Na sidebar do App: <em>WhatsApp → API Setup</em>. Lá aparece o{' '}
              <strong>phone_number_id</strong> e um <strong>temporary access token</strong> de
              24h. Pra produção, gere um <strong>System User Token permanente</strong> em{' '}
              <em>Business Settings → Users → System Users</em>.
            </>
          }
        />
        <Step
          n="03"
          title="Pegue o business_account_id"
          body={
            <>
              Mesma tela <em>WhatsApp → API Setup</em>, no topo aparece o{' '}
              <strong>WhatsApp Business Account ID</strong> (waba_id).
            </>
          }
        />
        <Step
          n="04"
          title="Pegue o app_secret"
          body={
            <>
              Sidebar: <em>App settings → Basic</em>. Em <strong>App Secret</strong>, clica{' '}
              "Show" e confirma com senha. Esse é o segredo que assina os webhooks com HMAC.
            </>
          }
        />
        <Step
          n="05"
          title="Configure o webhook na Meta"
          body={
            <>
              Depois de conectar aqui no Orbe, copia os campos <em>Webhook URL</em> e{' '}
              <em>Verify Token</em> que aparecem no card acima e cola em{' '}
              <em>WhatsApp → Configuration → Webhook</em> no Meta App. Inscreva-se no campo{' '}
              <strong>messages</strong>. URL base: <code>{appUrl}</code>.
            </>
          }
        />
        <Step
          n="06"
          title="Conecte um número de teste"
          body={
            <>
              Em <em>WhatsApp → API Setup → To</em>, adiciona um número de teste (até 5
              gratuitos). Pra usar número próprio em produção, faz a verificação completa em{' '}
              <em>Business Settings → WhatsApp Accounts</em>.
            </>
          }
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 md:p-8">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <h3 className="mt-3 text-lg font-semibold tracking-tight">Já conectou um número?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Agora vai pro{' '}
          <Link href="/forge" className="font-medium text-primary hover:text-primary/80">
            Forge
          </Link>{' '}
          e monta o agente. Quando publicar a primeira versão, o agente vai começar a atender
          mensagens que chegarem nesse número.
        </p>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline gap-2.5">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
          {n}
        </span>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ExternalLinkA({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
    >
      developers.facebook.com/apps <ExternalLink className="h-3 w-3" />
    </a>
  );
}
