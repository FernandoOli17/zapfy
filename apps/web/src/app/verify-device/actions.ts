'use server';

import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { consumeDeviceVerification, resendDeviceVerification } from '@/lib/device-verification';
import { env } from '@/env';
import { enforceRateLimit } from '@/lib/rate-limit';

const RL_RESEND = { name: 'verify-device-resend', limit: 3, windowSec: 300 } as const;

export async function resendCodeAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: 'Sessão expirada — faça login de novo.' };

  const rl = await enforceRateLimit(`user:${session.user.id}`, RL_RESEND);
  if (!rl.success) return { ok: false, error: 'Muitos reenvios. Aguarde alguns minutos.' };

  return resendDeviceVerification(session.session.token, env.BETTER_AUTH_URL);
}

export async function verifyDeviceCodeAction(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: 'Sessão expirada. Faça login de novo.' };

  const res = await consumeDeviceVerification({
    userId: session.user.id,
    code,
  });
  if (res.ok) return { ok: true };

  const messages: Record<string, string> = {
    'not-found': 'Não achei nenhuma verificação aberta. Faça login de novo.',
    expired: 'Esse código expirou. Faça login de novo pra receber outro.',
    invalid: 'Código incorreto. Confira os 6 dígitos do email.',
    'already-used': 'Esse código já foi usado.',
  };
  return { ok: false, error: messages[res.reason] ?? 'Não foi possível verificar.' };
}
