import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';

import { decrypt, encrypt, hashPii } from '../src/crypto.js';

const KEY = randomBytes(32).toString('hex');

describe('crypto', () => {
  it('round-trips um segredo curto', () => {
    const plaintext = 'EAAG1234567890ABC';
    const cipher = encrypt(plaintext, KEY);
    expect(cipher).not.toContain(plaintext);
    expect(decrypt(cipher, KEY)).toBe(plaintext);
  });

  it('round-trips strings com unicode', () => {
    const plaintext = 'olá, mundo — ç ã 🚀';
    expect(decrypt(encrypt(plaintext, KEY), KEY)).toBe(plaintext);
  });

  it('gera cifras diferentes pra mesma entrada (IV aleatório)', () => {
    const plaintext = 'mesmo-segredo';
    const a = encrypt(plaintext, KEY);
    const b = encrypt(plaintext, KEY);
    expect(a).not.toBe(b);
    expect(decrypt(a, KEY)).toBe(decrypt(b, KEY));
  });

  it('rejeita payload com auth tag adulterada', () => {
    const cipher = encrypt('secret', KEY);
    const parts = cipher.split(':');
    const tag = parts[2]!;
    const first = tag[0]!;
    const flipped = first === '0' ? '1' : '0';
    parts[2] = flipped + tag.slice(1);
    expect(() => decrypt(parts.join(':'), KEY)).toThrow();
  });

  it('rejeita chave de tamanho errado', () => {
    expect(() => encrypt('x', 'abc')).toThrow(/CRYPTO_INVALID_KEY/);
  });
});

describe('hashPii', () => {
  it('é determinístico com mesmo salt', () => {
    const a = hashPii('5511999998888', 'salt-a');
    const b = hashPii('5511999998888', 'salt-a');
    expect(a).toBe(b);
  });

  it('muda com salt diferente', () => {
    const a = hashPii('5511999998888', 'salt-a');
    const b = hashPii('5511999998888', 'salt-b');
    expect(a).not.toBe(b);
  });
});
