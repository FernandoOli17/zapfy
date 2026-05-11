'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

    const res = await signUp.email({
      email,
      password,
      name,
      callbackURL: '/onboarding',
    });

    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? 'Falha ao criar conta');
      return;
    }
    router.push('/onboarding');
  }

  async function handleGoogle() {
    setError(null);
    await signIn.social({ provider: 'google', callbackURL: '/onboarding' });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
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
          />
        </div>
        <div>
          <Label htmlFor="password">Senha (mín. 8 chars)</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Criando…' : 'Criar conta'}
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
    </div>
  );
}
