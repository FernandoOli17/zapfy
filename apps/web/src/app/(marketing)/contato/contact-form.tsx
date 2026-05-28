'use client';

import { useActionState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapfy/ui';

import { sendContactAction, type ContactState } from './actions';

const initialState: ContactState = { status: 'idle' };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactAction, initialState);

  if (state.status === 'success') {
    return (
      <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="font-medium">Recebido!</p>
          <p className="mt-1 text-muted-foreground">
            A gente te responde em até 24h úteis. Em emergência, manda direto pra{' '}
            <a href="mailto:oi@Zapfy.dev" className="underline-offset-4 hover:underline">
              oi@Zapfy.dev
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            className="mt-1.5 h-11"
            placeholder="Seu nome"
          />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1.5 h-11"
            placeholder="voce@empresa.com.br"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="subject">Assunto</Label>
        <Input
          id="subject"
          name="subject"
          type="text"
          required
          minLength={2}
          className="mt-1.5 h-11"
          placeholder="Sobre o que você quer falar?"
        />
      </div>
      <div>
        <Label htmlFor="message">Mensagem</Label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Conta um pouco mais. Quanto mais contexto, melhor a resposta."
        />
      </div>
      {state.status === 'error' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Button type="submit" className="w-full h-11" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando…
          </>
        ) : (
          'Enviar mensagem'
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        Ao enviar, você concorda com nossa{' '}
        <a href="/privacidade" className="underline-offset-4 hover:underline">
          política de privacidade
        </a>
        . Não vamos te spammar.
      </p>
    </form>
  );
}
