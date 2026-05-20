'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapai/ui';

import { authClient } from '@/lib/auth-client';

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const tokenError = params.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (tokenError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <p className="font-medium">Link inválido ou expirado</p>
        <p className="mt-1 text-destructive/80">
          Esse link de redefinição não vale mais. Peça um novo na página de recuperação.
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <p className="font-medium">Token ausente</p>
        <p className="mt-1 text-destructive/80">
          Abra o link completo que você recebeu por e-mail.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Senha precisa de pelo menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não batem');
      return;
    }

    setBusy(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token: token!,
      });
      if (res.error) {
        console.error('[reset-password] error from better-auth', res.error);
        setError(res.error.message ?? 'Falha ao redefinir senha');
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      console.error('[reset-password] exception', err);
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-foreground">Senha redefinida</p>
          <p className="mt-1 text-muted-foreground">
            Redirecionando pro login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5"
          placeholder="••••••••"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      <div>
        <Label htmlFor="confirm">Confirmar nova senha</Label>
        <Input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1.5"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full h-11" disabled={busy || !password || !confirm}>
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando…
          </>
        ) : (
          'Definir nova senha'
        )}
      </Button>
    </form>
  );
}
