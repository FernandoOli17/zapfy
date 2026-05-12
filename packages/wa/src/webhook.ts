import { createHmac, timingSafeEqual } from 'node:crypto';

import { WaWebhookSignatureError } from './errors';
import { waWebhookPayloadSchema, type WaWebhookPayload } from './types';

const SIGNATURE_PREFIX = 'sha256=';

/**
 * Valida o header `x-hub-signature-256` enviado pela Meta.
 * Body precisa ser o RAW (string ou Buffer), antes de qualquer parse JSON.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  appSecret: string,
): void {
  if (!signatureHeader) {
    throw new WaWebhookSignatureError('header x-hub-signature-256 ausente');
  }
  if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    throw new WaWebhookSignatureError('formato de assinatura inválido');
  }
  if (!appSecret) {
    throw new WaWebhookSignatureError('appSecret não configurado pro workspace');
  }

  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const provided = signatureHeader.slice(SIGNATURE_PREFIX.length);

  if (expected.length !== provided.length) {
    throw new WaWebhookSignatureError('tamanho de assinatura divergente');
  }

  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(provided, 'hex');
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    throw new WaWebhookSignatureError('assinatura não bate');
  }
}

/** Faz parse + validação Zod do payload. */
export function parseWebhookPayload(body: unknown): WaWebhookPayload {
  return waWebhookPayloadSchema.parse(body);
}

/** Handler do GET /webhook usado na verificação inicial pela Meta. */
export function handleWebhookVerification(input: {
  mode: string | null | undefined;
  token: string | null | undefined;
  challenge: string | null | undefined;
  expectedVerifyToken: string;
}): { ok: true; challenge: string } | { ok: false; reason: string } {
  if (input.mode !== 'subscribe') {
    return { ok: false, reason: 'hub.mode inválido' };
  }
  if (!input.token || input.token !== input.expectedVerifyToken) {
    return { ok: false, reason: 'verify_token não bate' };
  }
  if (!input.challenge) {
    return { ok: false, reason: 'hub.challenge ausente' };
  }
  return { ok: true, challenge: input.challenge };
}

/**
 * Itera todas as mensagens + status updates do payload em um array plano,
 * agrupando por phone_number_id pra identificar qual workspace.
 */
export function flattenWebhookEvents(payload: WaWebhookPayload): {
  byPhoneNumberId: Record<
    string,
    {
      displayPhoneNumber: string;
      messages: WaWebhookPayload['entry'][number]['changes'][number]['value']['messages'];
      statuses: WaWebhookPayload['entry'][number]['changes'][number]['value']['statuses'];
      contacts: WaWebhookPayload['entry'][number]['changes'][number]['value']['contacts'];
    }
  >;
} {
  const byPhoneNumberId: Record<
    string,
    {
      displayPhoneNumber: string;
      messages: WaWebhookPayload['entry'][number]['changes'][number]['value']['messages'];
      statuses: WaWebhookPayload['entry'][number]['changes'][number]['value']['statuses'];
      contacts: WaWebhookPayload['entry'][number]['changes'][number]['value']['contacts'];
    }
  > = {};

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const v = change.value;
      const key = v.metadata.phone_number_id;
      const bucket = byPhoneNumberId[key] ?? {
        displayPhoneNumber: v.metadata.display_phone_number,
        messages: [],
        statuses: [],
        contacts: [],
      };
      if (v.messages) bucket.messages = [...(bucket.messages ?? []), ...v.messages];
      if (v.statuses) bucket.statuses = [...(bucket.statuses ?? []), ...v.statuses];
      if (v.contacts) bucket.contacts = [...(bucket.contacts ?? []), ...v.contacts];
      byPhoneNumberId[key] = bucket;
    }
  }

  return { byPhoneNumberId };
}
