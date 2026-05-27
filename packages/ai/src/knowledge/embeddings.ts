import { createLogger } from '@zapai/shared';

const log = createLogger('rag:embeddings');

const VOYAGE_MODEL = 'voyage-3';
const VOYAGE_BATCH_LIMIT = 64;
const VOYAGE_MAX_CHARS = 4096;

/**
 * Embedding em lote via Voyage AI. Cada chamada aceita até 128 inputs.
 * Usamos batch de 64 pra ficar abaixo do limite e dar margem.
 *
 * Retorna null se VOYAGE_API_KEY não estiver configurada (FTS continua valendo)
 * ou se o request falhar — caller decide se reagenda ou marca ERROR.
 */
export async function embedBatch(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  const key = process.env['VOYAGE_API_KEY'];
  if (!key) {
    log.warn('VOYAGE_API_KEY ausente — pulando embeddings');
    return null;
  }

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += VOYAGE_BATCH_LIMIT) {
    const batch = texts.slice(i, i + VOYAGE_BATCH_LIMIT).map((t) => t.slice(0, VOYAGE_MAX_CHARS));
    try {
      const res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: VOYAGE_MODEL, input: batch, input_type: 'document' }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        log.error({ status: res.status, body: body.slice(0, 200) }, 'voyage batch falhou');
        return null;
      }
      const json = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> };
      // garantir ordenação por index
      const sorted = [...json.data].sort((a, b) => a.index - b.index);
      for (const item of sorted) out.push(item.embedding);
    } catch (err) {
      log.error({ err: String(err) }, 'voyage batch exception');
      return null;
    }
  }

  return out;
}

/**
 * Embedding de um único texto (usado em queries de RAG).
 * Mantém compat com chamadas existentes.
 */
export async function embedQuery(text: string): Promise<number[] | null> {
  const key = process.env['VOYAGE_API_KEY'];
  if (!key) return null;

  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: [text.slice(0, VOYAGE_MAX_CHARS)],
        input_type: 'query',
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      log.warn({ status: res.status }, 'voyage query falhou — fallback FTS');
      return null;
    }
    const body = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return body.data[0]?.embedding ?? null;
  } catch (err) {
    log.warn({ err: String(err) }, 'voyage query exception — fallback FTS');
    return null;
  }
}
