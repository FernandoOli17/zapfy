import { z } from 'zod';

/**
 * Tipos do payload de webhook da Meta Cloud API v21.
 * https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */

export const waMessageTypeSchema = z.enum([
  'text',
  'image',
  'audio',
  'document',
  'video',
  'sticker',
  'location',
  'contacts',
  'interactive',
  'button',
  'reaction',
  'order',
  'system',
  'unknown',
]);
export type WaMessageType = z.infer<typeof waMessageTypeSchema>;

export const waMessageStatusSchema = z.enum(['sent', 'delivered', 'read', 'failed']);
export type WaMessageStatus = z.infer<typeof waMessageStatusSchema>;

const waMediaRefSchema = z.object({
  id: z.string(),
  mime_type: z.string().optional(),
  sha256: z.string().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
  voice: z.boolean().optional(),
});

const waContactRefSchema = z.object({
  profile: z.object({ name: z.string().optional() }).optional(),
  wa_id: z.string(),
});

const waButtonReplySchema = z.object({
  button_reply: z
    .object({
      id: z.string(),
      title: z.string(),
    })
    .optional(),
  list_reply: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })
    .optional(),
});

export const waIncomingMessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  type: waMessageTypeSchema,
  text: z.object({ body: z.string() }).optional(),
  image: waMediaRefSchema.optional(),
  audio: waMediaRefSchema.optional(),
  document: waMediaRefSchema.optional(),
  video: waMediaRefSchema.optional(),
  sticker: waMediaRefSchema.optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      name: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  interactive: waButtonReplySchema.optional(),
  button: z
    .object({
      text: z.string(),
      payload: z.string(),
    })
    .optional(),
  context: z
    .object({
      from: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  errors: z
    .array(
      z.object({
        code: z.number(),
        title: z.string().optional(),
        message: z.string().optional(),
      }),
    )
    .optional(),
});
export type WaIncomingMessage = z.infer<typeof waIncomingMessageSchema>;

export const waStatusUpdateSchema = z.object({
  id: z.string(),
  status: waMessageStatusSchema,
  timestamp: z.string(),
  recipient_id: z.string(),
  conversation: z
    .object({
      id: z.string(),
      origin: z.object({ type: z.string() }).optional(),
    })
    .optional(),
  pricing: z
    .object({
      billable: z.boolean(),
      pricing_model: z.string(),
      category: z.string().optional(),
    })
    .optional(),
  errors: z
    .array(
      z.object({
        code: z.number(),
        title: z.string().optional(),
        message: z.string().optional(),
        href: z.string().optional(),
      }),
    )
    .optional(),
});
export type WaStatusUpdate = z.infer<typeof waStatusUpdateSchema>;

export const waWebhookChangeValueSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string(),
  }),
  contacts: z.array(waContactRefSchema).optional(),
  messages: z.array(waIncomingMessageSchema).optional(),
  statuses: z.array(waStatusUpdateSchema).optional(),
  errors: z
    .array(
      z.object({
        code: z.number(),
        title: z.string().optional(),
        message: z.string().optional(),
      }),
    )
    .optional(),
});

export const waWebhookPayloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          field: z.literal('messages'),
          value: waWebhookChangeValueSchema,
        }),
      ),
    }),
  ),
});
export type WaWebhookPayload = z.infer<typeof waWebhookPayloadSchema>;

// =========================================
// Outbound: payloads de envio
// =========================================

export interface WaSendResult {
  messaging_product: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string; message_status?: string }>;
}

export interface WaInteractiveButton {
  id: string;
  title: string;
}

export interface WaInteractiveListSection {
  title?: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

export interface WaTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  parameters?: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: { link: string } }
    | { type: 'document'; document: { link: string; filename?: string } }
    | { type: 'video'; video: { link: string } }
  >;
  sub_type?: 'quick_reply' | 'url' | 'catalog';
  index?: number;
}
