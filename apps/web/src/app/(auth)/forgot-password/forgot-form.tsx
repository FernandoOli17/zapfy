'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapfy/ui';

import { authClient } from '@/lib/auth-client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      });
      if (res.error) {
        console.error('[forgot-password] error from better-auth', res.error);
        setError(res.error.message ?? 'Falha ao solicitar redefinição');
        setBusy(false);
        return;
      }
      setSent(true);
    } catch (err) {
      console.error('[forgot-password] exception', err);
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">Verifique seu e-mail</p>
            <p className="mt-1 text-muted-foreground">
              Se existe uma conta com <strong className="text-foreground">{email}</strong>,
              enviamos um link pra você definir uma nova senha. O link expira em 1 hora.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              (Em dev sem RESEND_API_KEY: o link aparece no console do servidor.)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
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
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full h-11" disabled={busy || !email}>
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando…
          </>
        ) : (
          'Enviar link de redefinição'
        )}
      </Button>
    </form>
  );
}
