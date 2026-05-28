import Link from 'next/link';
import { headers } from 'next/headers';
import { AlertCircle, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from '@zapfy/ui';

import { auth } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { verifyInviteToken } from '@/lib/invite-token';

import { AcceptButton } from './accept-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Convite' };

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  let payload: ReturnType<typeof verifyInviteToken> | null = null;
  let parseError: string | null = null;
  try {
    payload = verifyInviteToken(token);
  } catch (err) {
    parseError =
      err instanceof Error && 'userMessage' in err
        ? (err as { userMessage: string }).userMessage
        : 'Convite inválido ou expirado.';
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const loggedEmail = session?.user.email ?? null;
  const emailsMatch =
    loggedEmail && payload && loggedEmail.toLowerCase() === payload.email.toLowerCase();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="bg-dot-grid absolute inset-0 -z-10 opacity-30" aria-hidden />

      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
          Trato
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12 md:py-20">
        {parseError || !payload ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h1 className="mt-4 text-3xl font-medium tracking-tight">
              Convite inválido
            </h1>
            <p className="mt-3 text-muted-foreground">{parseError}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Peça pra quem te chamou enviar um link novo.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/">Voltar pro site</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Convite pra workspace
            </p>
            <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
              <span className="font-serif italic font-normal text-primary">{payload.inviterName}</span>{' '}
              te convidou.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground md:text-xl">
              Pra entrar no workspace <strong className="text-foreground">{payload.workspaceName}</strong> como{' '}
              <strong className="text-foreground">
                {payload.role === 'ADMIN' ? 'Admin' : 'Atendente'}
              </strong>
              .
            </p>

            <section className="mt-10 space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
              <KV
                icon={Mail}
                label="E-mail do convite"
                value={payload.email}
              />
              <KV
                icon={UserPlus}
                label="Papel"
                value={
                  payload.role === 'ADMIN'
                    ? 'Admin — gerencia agente, número, API keys, webhooks'
                    : 'Atendente — atende inbox'
                }
              />
              <KV
                icon={ShieldCheck}
                label="Expira em"
                value={new Date(payload.expiresAt).toLocaleString('pt-BR')}
              />
            </section>

            <section className="mt-8">
              {!loggedEmail ? (
                <div className="rounded-xl border border-border/60 bg-card/40 p-6">
                  <p className="font-medium">Pra aceitar, faça login ou crie conta</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use o e-mail <strong className="text-foreground">{payload.email}</strong> exatamente.
                    Depois de logar, volta nesse link pra concluir.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild>
                      <Link
                        href={`/signup?email=${encodeURIComponent(payload.email)}&next=${encodeURIComponent(`/invite/${token}`)}`}
                      >
                        Criar conta
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link
                        href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                      >
                        Já tenho conta
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : !emailsMatch ? (
                <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-6">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <p className="mt-3 font-medium">E-mail diferente do convite</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Esse convite é pra <strong className="text-foreground">{payload.email}</strong>, mas
                    você está logado como{' '}
                    <strong className="text-foreground">{loggedEmail}</strong>. Saia e entre com o
                    e-mail certo.
                  </p>
                </div>
              ) : (
                <AcceptButton token={token} />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function KV({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm">{value}</p>
      </div>
    </div>
  );
}
