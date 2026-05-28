'use server';

import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { consumeDeviceVerification } from '@/lib/device-verification';

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
