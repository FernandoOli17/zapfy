import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { consumeDeviceVerification, pendingVerificationForSession } from '@/lib/device-verification';
import { VerifyDeviceForm } from './verify-form';
import { ResendButton } from './resend-button';

export const metadata = { title: 'Verificar acesso' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function VerifyDevicePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) redirect('/login');

  // Se chegou com ?token=... do link mágico do email, consome direto.
  if (params.token) {
    const result = await consumeDeviceVerification({
      userId: session.user.id,
      token: params.token,
    });
    if (result.ok) {
      redirect('/dashboard');
    }
    // Falhou: mostra a tela com o erro abaixo.
    redirect(`/verify-device?error=${result.reason}`);
  }

  // Confirma que há mesmo uma verificação pendente
  const pending = await pendingVerificationForSession({
    userId: session.user.id,
    sessionToken: session.session.token,
  });

  // Sem verificação pendente, o user não deveria estar aqui — manda pro app.
  if (!pending) redirect('/dashboard');

  const expiresInMin = Math.max(0, Math.ceil((pending.expiresAt.getTime() - Date.now()) / 60_000));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              🔐
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Segurança
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Confirme seu acesso
              </h1>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Detectamos que você está entrando de um{' '}
            <strong className="text-foreground">dispositivo ou rede novo</strong>. Mandamos um
            email pra <strong className="text-foreground">{session.user.email}</strong> com um
            código de 6 dígitos.
          </p>

          <p className="mt-3 text-xs text-muted-foreground">
            Digite o código abaixo, ou clique no botão{' '}
            <span className="text-primary">&quot;Sim, fui eu&quot;</span> que está dentro do email.
          </p>

          {params.error && <ErrorBanner reason={params.error} />}

          <div className="mt-6">
            <VerifyDeviceForm />
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Código expira em ~{expiresInMin} min. Não recebeu? Cheque a caixa de spam ou
              reenvie abaixo.
            </p>
            <div className="mt-2 flex justify-center">
              <ResendButton />
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4 text-center">
            <p className="text-[11px] text-muted-foreground">
              Não foi você?{' '}
              <span className="text-red-400">
                Use o link de revogação no email pra bloquear esse acesso.
              </span>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          Por que estou vendo isso? Zapfy detecta acessos de IP/dispositivo novo
          e pede confirmação. Acontece quando você troca de rede, viaja ou usa
          outro computador.
        </p>
      </div>
    </div>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-found': 'Código ou link não encontrado. Talvez já tenha sido usado.',
  expired: 'Esse código expirou. Faça login novamente pra receber um novo.',
  invalid: 'Código inválido. Confira os 6 dígitos do email.',
  'already-used': 'Esse link já foi usado. Você já está autenticado.',
};

function ErrorBanner({ reason }: { reason: string }) {
  const msg = ERROR_MESSAGES[reason] ?? 'Não foi possível verificar. Tente de novo.';
  return (
    <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
      {msg}
    </div>
  );
}
