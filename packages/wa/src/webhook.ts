import { createHmac, timingSafeEqual } from 'node:crypto';

import { WaWebhookSignatureError } from './errors';
import {
  waMessagesChangeSchema,
  waWebhookPayloadSchema,
  type WaMessagesChange,
  type WaWebhookPayload,
} from './types';

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

type WaMessagesChangeValue = WaMessagesChange['value'];

interface PhoneNumberBucket {
  displayPhoneNumber: string;
  messages: NonNullable<WaMessagesChangeValue['messages']>;
  statuses: NonNullable<WaMessagesChangeValue['statuses']>;
  contacts: NonNullable<WaMessagesChangeValue['contacts']>;
}

/**
 * Reconhece uma change de `messages` BEM-FORMADA. Faz `safeParse` contra o
 * schema estrito (não só `field === 'messages'`): uma change com `field:
 * 'messages'` mas `value` malformado casa o ramo permissivo da union no parse
 * do payload, e o type-guard antigo (só checava o field) mentia o tipo —
 * acessar `value.metadata` num `unknown` real crashava e derrubava o POST
 * inteiro (com as mensagens válidas junto). Aqui, malformada → null → ignorada,
 * sem crash e sem perder as outras mensagens do mesmo POST.
 */
function asMessagesChange(
  change: WaWebhookPayload['entry'][number]['changes'][number],
): WaMessagesChange | null {
  const parsed = waMessagesChangeSchema.safeParse(change);
  return parsed.success ? parsed.data : null;
}

/**
 * Itera todas as mensagens + status updates do payload em um array plano,
 * agrupando por phone_number_id pra identificar qual workspace. Apenas changes
 * do field `messages` são consideradas — outros fields são descartados sem
 * derrubar as mensagens válidas do mesmo POST.
 */
export function flattenWebhookEvents(payload: WaWebhookPayload): {
  byPhoneNumberId: Record<string, PhoneNumberBucket>;
} {
  const byPhoneNumberId: Record<string, PhoneNumberBucket> = {};

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const mc = asMessagesChange(change);
      if (!mc) continue;
      const v = mc.value;
      const key = v.metadata.phone_number_id;
      const bucket: PhoneNumberBucket = byPhoneNumberId[key] ?? {
        displayPhoneNumber: v.metadata.display_phone_number,
        messages: [],
        statuses: [],
        contacts: [],
      };
      if (v.messages) bucket.messages = [...bucket.messages, ...v.messages];
      if (v.statuses) bucket.statuses = [...bucket.statuses, ...v.statuses];
      if (v.contacts) bucket.contacts = [...bucket.contacts, ...v.contacts];
      byPhoneNumberId[key] = bucket;
    }
  }

  return { byPhoneNumberId };
}
