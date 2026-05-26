import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';

const log = createLogger('rag');

export interface RagChunk {
  content: string;
  title: string;
  score: number;
}

/** Voyage AI embedding — null se VOYAGE_API_KEY não configurada. */
async function fetchEmbedding(text: string): Promise<number[] | null> {
  const key = process.env['VOYAGE_API_KEY'];
  if (!key) return null;

  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'voyage-3', input: [text.slice(0, 4096)] }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return body.data[0]?.embedding ?? null;
  } catch (err) {
    log.warn({ err: String(err) }, 'voyage embedding falhou — fallback FTS');
    return null;
  }
}

/** Indexa um chunk de texto em KnowledgeChunk.embedding (Fase 5+). */
export async function embedAndStore(chunkId: string, text: string): Promise<boolean> {
  const embedding = await fetchEmbedding(text);
  if (!embedding) return false;

  const vectorLiteral = `[${embedding.join(',')}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk" SET embedding = $1::vector WHERE id = $2`,
    vectorLiteral,
    chunkId,
  );
  return true;
}

/**
 * Busca híbrida: pgvector (cosine) + FTS Portuguese.
 * Se VOYAGE_API_KEY não estiver configurada, usa apenas FTS.
 */
export async function searchKnowledge(
  workspaceId: string,
  query: string,
  topK = 5,
): Promise<RagChunk[]> {
  const embedding = await fetchEmbedding(query);

  if (embedding) {
    // Hybrid: vector + FTS com RRF (Reciprocal Rank Fusion)
    const vectorLiteral = `[${embedding.join(',')}]`;
    const rows = await prisma.$queryRawUnsafe<
      Array<{ content: string; title: string; score: number }>
    >(
      `WITH vector_ranked AS (
         SELECT kc.content, kd.title,
                ROW_NUMBER() OVER (ORDER BY kc.embedding <=> $1::vector) AS rn_v
         FROM "KnowledgeChunk" kc
         JOIN "KnowledgeDocument" kd ON kc."documentId" = kd.id
         WHERE kd."workspaceId" = $2 AND kd.status = 'READY'
           AND kc.embedding IS NOT NULL
         LIMIT 20
       ),
       fts_ranked AS (
         SELECT kc.content, kd.title,
                ROW_NUMBER() OVER (
                  ORDER BY ts_rank(to_tsvector('portuguese', kc.content),
                                   plainto_tsquery('portuguese', $3)) DESC
                ) AS rn_f
         FROM "KnowledgeChunk" kc
         JOIN "KnowledgeDocument" kd ON kc."documentId" = kd.id
         WHERE kd."workspaceId" = $2 AND kd.status = 'READY'
           AND to_tsvector('portuguese', kc.content) @@ plainto_tsquery('portuguese', $3)
         LIMIT 20
       )
       SELECT COALESCE(v.content, f.content) AS content,
              COALESCE(v.title, f.title) AS title,
              (1.0 / (60 + COALESCE(v.rn_v, 100)) + 1.0 / (60 + COALESCE(f.rn_f, 100))) AS score
       FROM vector_ranked v
       FULL OUTER JOIN fts_ranked f ON v.content = f.content
       ORDER BY score DESC
       LIMIT $4`,
      vectorLiteral,
      workspaceId,
      query.slice(0, 256),
      topK,
    );
    return rows;
  }

  // FTS only
  const rows = await prisma.$queryRawUnsafe<
    Array<{ content: string; title: string; rank: number }>
  >(
    `SELECT kc.content, kd.title,
            ts_rank(to_tsvector('portuguese', kc.content),
                    plainto_tsquery('portuguese', $1)) AS rank
     FROM "KnowledgeChunk" kc
     JOIN "KnowledgeDocument" kd ON kc."documentId" = kd.id
     WHERE kd."workspaceId" = $2
       AND kd.status = 'READY'
       AND to_tsvector('portuguese', kc.content) @@ plainto_tsquery('portuguese', $1)
     ORDER BY rank DESC
     LIMIT $3`,
    query.slice(0, 256),
    workspaceId,
    topK,
  );
  return rows.map((r) => ({ content: r.content, title: r.title, score: r.rank }));
}
