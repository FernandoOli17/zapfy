'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Beaker, Loader2, Send } from 'lucide-react';
import { Button, useToast } from '@zapai/ui';

import { sendTestInboundMessage } from './actions';

/**
 * Card "Enviar mensagem de teste" — útil em demos com cliente sem Meta real.
 * Simula um webhook Meta sem chamar API externa. O agente responde no inbox
 * exatamente como em produção.
 */
export function TestInboundCard({ workspaceConnected }: { workspaceConnected: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [fromPhone, setFromPhone] = useState('5511987654321');
  const [fromName, setFromName] = useState('Cliente Demo');
  const [text, setText] = useState('Oi! Quanto tá o banho do meu shih tzu?');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await sendTestInboundMessage({ fromPhone, fromName, text });
      if (r.status === 'ok') {
        push({ type: 'success', message: 'Mensagem injetada! Acompanhe no inbox.' });
        router.push(`/inbox/${r.conversationId}`);
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Beaker className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Mensagem de teste (modo demo)</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Simula um webhook Meta sem precisar de número real. Útil pra ver o agente IA
            respondendo numa demo com cliente. O contato fica marcado com tag
            <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">test_mode</code>
            pra não poluir analytics.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor="ti-phone">
              Número do "cliente" (só dígitos)
            </label>
            <input
              id="ti-phone"
              type="text"
              required
              value={fromPhone}
              onChange={(e) => setFromPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="5511987654321"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor="ti-name">
              Nome (pra aparecer no inbox)
            </label>
            <input
              id="ti-name"
              type="text"
              required
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Mariana Silva"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor="ti-text">
            Mensagem
          </label>
          <textarea
            id="ti-text"
            required
            rows={2}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {workspaceConnected ? '✓ Workspace WhatsApp conectado' : '⚠ Workspace sem WA conectado — agente responde mas não envia real'}
          </p>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Injetar mensagem
          </Button>
        </div>
      </form>
    </div>
  );
}
