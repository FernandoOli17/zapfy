import { describe, it, expect } from 'vitest';

import { waWebhookPayloadSchema } from '../src/types';
import { flattenWebhookEvents } from '../src/webhook';

/**
 * Regressão TASK-0029 (F2): uma change com `field: 'messages'` mas `value`
 * malformado casava o ramo permissivo da union no parse e depois crashava o
 * flatten (acesso a `value.metadata` num `unknown`), derrubando o POST inteiro
 * — perdendo as mensagens VÁLIDAS do mesmo POST. O fix usa `safeParse` estrito
 * no flatten: malformada → ignorada, sem crash.
 */
describe('flattenWebhookEvents — tolerância a payload (TASK-0029 F2)', () => {
  it('não crasha com change messages malformada + processa a válida do mesmo POST', () => {
    const raw = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA1',
          changes: [
            { field: 'messages', value: { foo: 'bar' } }, // poison pill (sem metadata)
            { field: 'message_template_status_update', value: { anything: true } }, // outro field
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '+5511999', phone_number_id: 'PNID1' },
                messages: [
                  {
                    from: '5511988887777',
                    id: 'wamid.ABC',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'oi' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const parsed = waWebhookPayloadSchema.parse(raw); // a union permissiva aceita a malformada
    const flat = flattenWebhookEvents(parsed); // NÃO pode crashar
    const bucket = flat.byPhoneNumberId['PNID1'];
    expect(bucket).toBeDefined();
    expect(bucket?.messages.length).toBe(1);
    expect(bucket?.messages[0]?.id).toBe('wamid.ABC');
  });

  it('change messages malformada sozinha não crasha e gera bucket vazio', () => {
    const raw = {
      object: 'whatsapp_business_account',
      entry: [{ id: 'WABA1', changes: [{ field: 'messages', value: { nope: 1 } }] }],
    };
    const parsed = waWebhookPayloadSchema.parse(raw);
    const flat = flattenWebhookEvents(parsed);
    expect(Object.keys(flat.byPhoneNumberId).length).toBe(0);
  });
});
