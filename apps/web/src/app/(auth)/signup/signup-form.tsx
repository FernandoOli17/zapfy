'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapai/ui';

import { signIn, signUp } from '@/lib/auth-client';

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await signUp.email({
        email,
        password,
        name,
        callbackURL: '/onboarding',
      });
      if (res.error) {
        console.error('[signup] error from better-auth', res.error);
        const msg =
          res.error.message ||
          res.error.statusText ||
          (res.error.code ? `Erro ${res.error.code}` : null) ||
          'Falha ao criar conta. Confira se o e-mail já não está em uso.';
        setError(msg);
        setBusy(false);
        return;
      }
      router.push('/onboarding');
    } catch (err) {
      console.error('[signup] unexpected exception', err);
      const msg = err instanceof Error ? err.message : 'Erro inesperado';
      setError(
        `${msg}. Verifique se o banco está rodando ('docker compose up -d') e migrado ('pnpm db:push').`,
      );
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signIn.social({ provider: 'google', callbackURL: '/onboarding' });
    } catch (err) {
      console.error('[signup] google error', err);
      setError('Falha ao iniciar login com Google');
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
            placeholder="Seu nome"
          />
        </div>
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
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
            placeholder="Mínimo 8 caracteres"
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
              Criando…
            </>
          ) : (
            'Criar conta'
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

      <p className="text-xs text-muted-foreground">
        Ao criar conta você concorda com os{' '}
        <a href="/termos" className="underline-offset-4 hover:underline">
          Termos
        </a>{' '}
        e a{' '}
        <a href="/privacidade" className="underline-offset-4 hover:underline">
          Política de Privacidade
        </a>
        .
      </p>
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
