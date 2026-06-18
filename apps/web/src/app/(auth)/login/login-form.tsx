'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapfy/ui';

import { signIn } from '@/lib/auth-client';

/**
 * Sanitiza o `next` param contra open-redirect.
 * Aceita SOMENTE paths relativos começando com `/` e que NÃO sejam protocol-relative
 * (`//evil.com` é interpretado como URL absoluta pelo browser).
 */
function sanitizeNext(raw: string | null): string {
  if (!raw) return '/dashboard';
  // Bloqueia: URLs absolutas (http://, https://), protocol-relative (//evil),
  // schemes maliciosos (javascript:, data:), e paths sem `/` inicial.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return '/dashboard';
  }
  // Bloqueia caracteres de controle / NUL injection (CRLF header injection etc.)
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) < 32) return '/dashboard';
  }
  return raw;
}

// Mensagens pros erros que /api/auth/revoke-device redireciona pra cá —
// sem isto a vítima clicava "bloquear esse acesso" e caía num login mudo.
function bannerFromErrorParam(error: string | null): string | null {
  if (!error) return null;
  if (error === 'missing-token') return 'Link de bloqueio inválido (sem token). Tenta abrir de novo a partir do e-mail.';
  if (error === 'revoke-expired') {
    return 'O link de bloqueio expirou. Se não foi você, troque sua senha agora em "Esqueci minha senha".';
  }
  if (error.startsWith('revoke-')) {
    return 'Não foi possível bloquear o acesso por este link. Se não foi você, troque sua senha agora.';
  }
  return null;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = sanitizeNext(params.get('next'));
  const banner = bannerFromErrorParam(params.get('error'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [error, setError] = useState<string | null>(banner);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn.email({ email, password, callbackURL: nextPath });
      if (res.error) {
        console.error('[login] error from better-auth', res.error);
        setError(res.error.message ?? 'Falha no login. Verifique e-mail e senha.');
        setBusy(false);
        return;
      }
      router.push(nextPath);
    } catch (err) {
      console.error('[login] unexpected exception', err);
      const msg = err instanceof Error ? err.message : 'Erro inesperado';
      setError(`${msg}. Verifique se o banco está rodando.`);
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signIn.social({ provider: 'google', callbackURL: nextPath });
    } catch (err) {
      console.error('[login] google error', err);
      setError('Falha ao iniciar login com Google');
    }
  }

  async function handleMagic() {
    setError(null);
    if (!email) {
      setError('Informe seu e-mail antes');
      return;
    }
    setMagicBusy(true);
    try {
      const res = await signIn.magicLink({ email, callbackURL: nextPath });
      if (res.error) {
        console.error('[login] magic link error', res.error);
        setError(res.error.message ?? 'Falha ao enviar link');
        setMagicBusy(false);
        return;
      }
      setMagicSent(true);
    } catch (err) {
      console.error('[login] magic link exception', err);
      setError(err instanceof Error ? err.message : 'Falha ao enviar link');
    } finally {
      setMagicBusy(false);
    }
  }

  if (magicSent) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">Link enviado!</p>
            <p className="mt-1 text-muted-foreground">
              Abra <strong className="text-foreground">{email}</strong> e clique no link mágico
              pra entrar.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              (Em dev: o link aparece no console do servidor.)
            </p>
          </div>
        </div>
        <Button variant="ghost" className="w-full" onClick={() => setMagicSent(false)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
            placeholder="voce@empresa.com.br"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
            placeholder="••••••••"
          />
        </div>
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full h-11" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando…
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="flex-1 border-t border-border/60" />
        ou
        <span className="flex-1 border-t border-border/60" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-11"
        onClick={handleGoogle}
        disabled={busy}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        Continuar com Google
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full h-11"
        onClick={handleMagic}
        disabled={magicBusy}
      >
        {magicBusy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando…
          </>
        ) : (
          'Receber link mágico por e-mail'
        )}
      </Button>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.92h5.45c-.24 1.28-1.55 3.75-5.45 3.75-3.28 0-5.95-2.71-5.95-6.05S8.72 5.77 12 5.77c1.86 0 3.11.79 3.83 1.47l2.62-2.52C16.84 3.18 14.62 2.18 12 2.18 6.49 2.18 2 6.67 2 12.18s4.49 10 10 10c5.78 0 9.6-4.06 9.6-9.77 0-.66-.07-1.16-.16-1.66H12z"
      />
    </svg>
  );
}
