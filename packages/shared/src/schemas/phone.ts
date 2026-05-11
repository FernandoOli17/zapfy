import { z } from 'zod';

/**
 * Normaliza pra formato E.164 (sem +): apenas dígitos, código do país obrigatório.
 * Aceita entradas como "+55 11 99999-8888", "5511999998888".
 */
export const phoneE164Schema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .min(8, 'Telefone muito curto')
      .max(15, 'Telefone muito longo')
      .regex(/^[1-9]\d{7,14}$/, 'Telefone inválido (use formato internacional)'),
  );
export type PhoneE164 = z.infer<typeof phoneE164Schema>;
