import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

import { AppError } from './errors';

/**
 * AES-256-GCM pra cifrar tokens da Meta e outros segredos por workspace.
 * Chave em ENCRYPTION_KEY (32 bytes = 64 hex chars).
 * Formato cifrado: `${ivHex}:${authTagHex}:${ciphertextHex}` (versão 1).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM padrão: 96 bits
const KEY_LENGTH = 32; // 256 bits
const VERSION = 'v1';

function getKey(rawKey: string): Buffer {
  if (!rawKey) {
    throw new AppError('CRYPTO_MISSING_KEY', 500, 'ENCRYPTION_KEY não configurada');
  }
  if (rawKey.length !== KEY_LENGTH * 2) {
    throw new AppError(
      'CRYPTO_INVALID_KEY',
      500,
      `ENCRYPTION_KEY deve ter ${KEY_LENGTH * 2} chars hex (${KEY_LENGTH} bytes)`,
    );
  }
  return Buffer.from(rawKey, 'hex');
}

export function encrypt(plaintext: string, encryptionKey: string): string {
  const key = getKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [VERSION, iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join(
    ':',
  );
}

export function decrypt(payload: string, encryptionKey: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4) {
    throw new AppError('CRYPTO_INVALID_PAYLOAD', 500, 'Payload cifrado mal formado');
  }
  const [version, ivHex, authTagHex, ciphertextHex] = parts as [string, string, string, string];
  if (version !== VERSION) {
    throw new AppError(
      'CRYPTO_UNSUPPORTED_VERSION',
      500,
      `Versão ${version} não suportada`,
    );
  }

  const key = getKey(encryptionKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Hash de PII pra logs estruturados (telefone, email).
 * Usa LOG_PII_SALT do env pra impedir reverse-engineering por rainbow table.
 */
export function hashPii(value: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 16);
}
