'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapai/ui';

import { connectWhatsAppAction, type ConnectWhatsAppResult } from './actions';
import { CopyButton } from './copy-button';

export function ConnectForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ConnectWhatsAppResult | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = {
      phoneNumberId: String(data.get('phoneNumberId') ?? ''),
      businessAccountId: String(data.get('businessAccountId') ?? ''),
      accessToken: String(data.get('accessToken') ?? ''),
      appSecret: String(data.get('appSecret') ?? ''),
    };
    setResult(null);
    startTransition(async () => {
      const r = await connectWhatsAppAction(input);
      setResult(r);
      if (r.status === 'ok') {
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  if (result?.status === 'ok') {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">
              Conectado: +{result.displayPhone}
            </p>
            <p className="mt-1 text-muted-foreground">
              Falta um último passo: cola os 2 campos abaixo na configuração do webhook na Meta
              (<em>WhatsApp → Configuration</em>) e inscreve-se no campo <strong>messages</strong>.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Webhook URL
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate font-mono text-xs">{result.webhookUrl}</code>
              <CopyButton value={result.webhookUrl} />
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Verify token
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate font-mono text-xs">{result.verifyToken}</code>
              <CopyButton value={result.verifyToken} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => setResult(null)}>
            Conectar outro número
          </Button>
          <a
            href="/forge"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Ir pro Forge →
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phoneNumberId">phone_number_id</Label>
          <Input
            id="phoneNumberId"
            name="phoneNumberId"
            type="text"
            required
            inputMode="numeric"
            pattern="\d+"
            placeholder="123456789012345"
            className="mt-1.5 h-11 font-mono text-sm"
          />
        </div>
        <div>
          <Label htmlFor="businessAccountId">business_account_id (waba_id)</Label>
          <Input
            id="businessAccountId"
            name="businessAccountId"
            type="text"
            required
            inputMode="numeric"
            pattern="\d+"
            placeholder="987654321098765"
            className="mt-1.5 h-11 font-mono text-sm"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="accessToken">access_token</Label>
        <Input
          id="accessToken"
          name="accessToken"
          type="password"
          required
          minLength={40}
          autoComplete="off"
          placeholder="EAA..."
          className="mt-1.5 h-11 font-mono text-sm"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Em produção, use um System User Token permanente. Tokens temporários (24h) só servem
          pra teste.
        </p>
      </div>
      <div>
        <Label htmlFor="appSecret">app_secret</Label>
        <Input
          id="appSecret"
          name="appSecret"
          type="password"
          required
          minLength={20}
          autoComplete="off"
          placeholder="App Secret do Meta App"
          className="mt-1.5 h-11 font-mono text-sm"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Usado pra validar HMAC dos webhooks. Cifrado at-rest com AES-256-GCM no nosso banco.
        </p>
      </div>

      {result?.status === 'error' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {result.error}
        </div>
      )}

      <Button type="submit" className="w-full h-11" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validando com a Meta…
          </>
        ) : (
          'Conectar número'
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        Ao clicar em "Conectar", o ZapAI testa as credenciais chamando{' '}
        <code className="font-mono">GET /v21.0/{'{phone_number_id}'}</code> na Meta. Se passar, o
        número fica como CONNECTED e os tokens são cifrados antes de persistir.
      </p>
    </form>
  );
}
