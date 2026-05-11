'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Label } from '@zapai/ui';

import { signIn } from '@/lib/auth-client';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get('next') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signIn.email({ email, password, callbackURL: nextPath });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? 'Falha no login');
      return;
    }
    router.push(nextPath);
  }

  async function handleGoogle() {
    setError(null);
    await signIn.social({ provider: 'google', callbackURL: nextPath });
  }

  async function handleMagic() {
    setError(null);
    if (!email) {
      setError('Informe seu e-mail antes');
      return;
    }
    setBusy(true);
    const res = await signIn.magicLink({ email, callbackURL: nextPath });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? 'Falha ao enviar link');
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <div className="rounded-md border bg-card p-4 text-sm">
        Enviamos um link mágico pra <strong>{email}</strong>. Abra seu e-mail e clique pra
        entrar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
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
          />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex-1 border-t" />
        ou
        <span className="flex-1 border-t" />
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
        Continuar com Google
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={handleMagic} disabled={busy}>
        Receber link mágico por e-mail
      </Button>
    </div>
  );
}
