import 'server-only';

import { Resend } from 'resend';
import { createLogger } from '@zapai/shared';

import { env } from '@/env';

const log = createLogger('email');

let cached: Resend | null = null;
let warned = false;

export function getResend(): Resend | null {
  if (cached) return cached;
  if (!env.RESEND_API_KEY) {
    if (!warned) {
      log.warn('RESEND_API_KEY não configurada — emails em modo console (dev)');
      warned = true;
    }
    return null;
  }
  cached = new Resend(env.RESEND_API_KEY);
  return cached;
}

export function defaultFrom(): string {
  return env.RESEND_FROM_EMAIL ?? 'ZapAI <noreply@zapai.dev>';
}

export function isEmailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY);
}

interface SendInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = getResend();
  if (!client) {
    log.info(
      { to: input.to, subject: input.subject },
      `[email-dev] enviaria: ${input.subject}`,
    );
    log.debug({ html: input.html.slice(0, 400) }, '[email-dev] preview html');
    return { ok: true, id: 'dev-no-op' };
  }
  try {
    const res = await client.emails.send({
      from: input.from ?? defaultFrom(),
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    if (res.error) {
      log.warn({ err: res.error }, 'resend retornou error');
      return { ok: false, error: res.error.message };
    }
    return { ok: true, id: res.data?.id };
  } catch (err) {
    log.error({ err: String(err) }, 'sendEmail falhou');
    return { ok: false, error: err instanceof Error ? err.message : 'falha ao enviar' };
  }
}
