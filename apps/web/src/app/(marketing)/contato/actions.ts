'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { createLogger } from '@zapai/shared';

import { clientIp, enforceRateLimit, RL_CONTACT } from '@/lib/rate-limit';

const log = createLogger('contato');

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(80),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  subject: z.string().trim().min(2, 'Assunto obrigatório').max(120),
  message: z.string().trim().min(10, 'Mensagem muito curta').max(2000),
});

export type ContactState =
  | { status: 'idle' }
  | { status: 'error'; error: string }
  | { status: 'success' };

export async function sendContactAction(
  _prev: ContactState | undefined,
  formData: FormData,
): Promise<ContactState> {
  const reqHeaders = await headers();
  const ip = clientIp(reqHeaders);
  const rl = await enforceRateLimit(`contact:${ip}`, RL_CONTACT);
  if (!rl.success) {
    return {
      status: 'error',
      error: `Calma! Tenta de novo em ${Math.ceil((rl.reset - Date.now()) / 1000)}s.`,
    };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  });
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  // TODO Fase B: enviar via Resend pra oi@zapai.dev quando RESEND_API_KEY estiver configurado.
  // Por enquanto, só registra no log estruturado pra MVP.
  log.info(
    {
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      messageLength: parsed.data.message.length,
      ip,
    },
    'contato recebido',
  );

  return { status: 'success' };
}
