import { prisma } from '@zapai/db';
import { embedQuery } from '../knowledge/embeddings';

export interface RagChunk {
  content: string;
  title: string;
  score: number;
}

/**
 * Busca híbrida: pgvector (cosine) + FTS Portuguese.
 * Se VOYAGE_API_KEY não estiver configurada, usa apenas FTS.
 *
 * Indexação dos documentos é feita pelo módulo @zapai/ai/knowledge — aqui
 * só consultamos.
 */
export async function searchKnowledge(
  workspaceId: string,
  query: string,
  topK = 5,
): Promise<RagChunk[]> {
  const trimmedQuery = query.slice(0, 256);
  const embedding = await embedQuery(trimmedQuery);

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
      trimmedQuery,
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
    trimmedQuery,
    workspaceId,
    topK,
  );
  return rows.map((r) => ({ content: r.content, title: r.title, score: r.rank }));
}
