import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Assinatura HMAC enviada com cada invocação de CustomTool.
 * Formato: `sha256=<hex>` calculado com HMAC-SHA256 (chave = secret).
 *
 * IMPORTANTE: usar `createHmac` em vez de `createHash(secret + body)` —
 * concatenação de string com SHA-256 é vulnerável a length-extension attack
 * (atacante que conhece H(secret+body) consegue forjar H(secret+body+payload)
 * sem conhecer o secret). HMAC é a primitiva certa.
 *
 * O cliente verifica do lado dele com seu próprio secret guardado.
 */
export function buildCustomToolSignature(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

/**
 * Comparação timing-safe entre assinatura esperada e a recebida.
 * Compara via Buffer.length em bytes (não chars) pra cobrir corretamente
 * inputs com bytes multibyte UTF-8.
 */
export function verifyCustomToolSignature(
  body: string,
  secret: string,
  receivedSignature: string,
): boolean {
  const expected = buildCustomToolSignature(body, secret);
  const expBuf = Buffer.from(expected, 'utf8');
  const recBuf = Buffer.from(receivedSignature, 'utf8');
  if (expBuf.length !== recBuf.length) return false;
  try {
    return timingSafeEqual(expBuf, recBuf);
  } catch {
    return false;
  }
}
