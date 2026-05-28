import { prisma, KnowledgeDocStatus, KnowledgeSource } from '@zapfy/db';
import { createLogger, assertSafeUrl, SsrfError } from '@zapfy/shared';
import { chunkText } from './chunker';
import { embedBatch } from './embeddings';

const log = createLogger('rag:process');

/** Limites globais por documento — evita engolir base inteira por erro. */
const MAX_CHARS_PER_DOC = 200_000;
const MAX_CHUNKS_PER_DOC = 400;

export interface ProcessKnowledgeResult {
  status: 'ready' | 'error';
  chunksCreated: number;
  embedded: boolean;
  errorMessage?: string;
  /**
   * Quando true, o erro provavelmente é transiente (rede, 5xx do Voyage,
   * timeout) e vale a pena retentar via BullMQ. Quando false, é permanente
   * (URL inválida, conteúdo vazio, content-type não suportado) — não retenta.
   */
  retriable?: boolean;
}

/**
 * Erros transientes — vale retentar via BullMQ retry.
 * Heurística simples: rede, timeout, 5xx, "rate limit".
 */
function isTransientError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('fetch failed') ||
    m.includes('timeout') ||
    m.includes('econnreset') ||
    m.includes('econnrefused') ||
    m.includes('etimedout') ||
    m.includes('socket hang up') ||
    m.includes('aborted') ||
    /\bhttp 5\d{2}\b/i.test(m) ||
    m.includes('rate limit') ||
    m.includes('429')
  );
}

/**
 * Processa um KnowledgeDocument que está em PROCESSING:
 * - se for URL e ainda não tem chunks, faz scrape do conteúdo
 * - se for MANUAL/UPLOAD com chunks raw, usa o conteúdo deles
 * - chunka tudo respeitando parágrafos/sentenças
 * - gera embeddings em batch (se VOYAGE_API_KEY presente)
 * - substitui chunks antigos (raw) pelos novos com embedding
 * - marca documento READY ou ERROR
 *
 * Idempotente: pode rodar de novo num doc PROCESSING que falhou antes.
 */
export async function processKnowledgeDocument(
  documentId: string,
): Promise<ProcessKnowledgeResult> {
  const doc = await prisma.knowledgeDocument.findUnique({
    where: { id: documentId },
    include: { chunks: { orderBy: { createdAt: 'asc' } } },
  });

  if (!doc) {
    return { status: 'error', chunksCreated: 0, embedded: false, errorMessage: 'doc not found' };
  }

  try {
    // ── 1. obter texto bruto ────────────────────────────────────────────────
    let rawText = '';
    let resolvedTitle = doc.title;

    if (doc.source === KnowledgeSource.URL && doc.sourceUrl) {
      const fetched = await fetchUrlText(doc.sourceUrl);
      if (fetched.text.length === 0) {
        throw new Error('conteúdo vazio na URL — confira se a página é pública');
      }
      rawText = fetched.text;
      // mantém custom title se já tiver sido seteado diferente da URL
      if (doc.title === doc.sourceUrl) {
        resolvedTitle = fetched.title || doc.sourceUrl;
      }
    } else {
      // MANUAL/UPLOAD — texto vem de chunks raw já inseridos
      rawText = doc.chunks.map((c) => c.content).join('\n\n').trim();
      if (!rawText) {
        throw new Error('documento sem conteúdo');
      }
    }

    // truncate global pra não explodir custo
    if (rawText.length > MAX_CHARS_PER_DOC) {
      log.warn({ docId: doc.id, original: rawText.length }, 'truncando doc grande');
      rawText = rawText.slice(0, MAX_CHARS_PER_DOC);
    }

    // ── 2. chunkar ──────────────────────────────────────────────────────────
    const chunks = chunkText(rawText).slice(0, MAX_CHUNKS_PER_DOC);
    if (chunks.length === 0) {
      throw new Error('nenhum chunk gerado');
    }

    // ── 3. embed (best-effort) ─────────────────────────────────────────────
    const embeddings = await embedBatch(chunks.map((c) => c.content));
    const embedded = embeddings !== null;
    if (!embedded) {
      log.warn({ docId: doc.id }, 'embeddings ausentes — FTS-only');
    }

    // ── 4. substituir chunks atomicamente ───────────────────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { documentId: doc.id } });
      // inserir novos chunks (sem embedding ainda)
      const created = await Promise.all(
        chunks.map((c) =>
          tx.knowledgeChunk.create({
            data: {
              documentId: doc.id,
              content: c.content,
              tokens: c.tokens,
              metadata: { index: c.index },
            },
          }),
        ),
      );

      // atualizar embeddings via raw SQL (pgvector cast)
      if (embedded && embeddings) {
        if (embeddings.length !== created.length) {
          throw new Error(
            `embeddings.length (${embeddings.length}) divergente de created.length (${created.length})`,
          );
        }
        for (let i = 0; i < created.length; i++) {
          const emb = embeddings[i];
          if (!emb) continue;
          const chunk = created[i];
          if (!chunk?.id) {
            // Não pode acontecer (criamos com create() obrigatório), mas se acontecer,
            // o ?? '' antigo silenciava UPDATE com `WHERE id = ''` (0 rows). Agora explode
            // a transação inteira pra não persistir doc parcialmente embedado.
            throw new Error(`chunk[${i}] sem id após create — abortando pra evitar dado corrompido`);
          }
          const literal = `[${emb.join(',')}]`;
          await tx.$executeRawUnsafe(
            `UPDATE "KnowledgeChunk" SET embedding = $1::vector WHERE id = $2`,
            literal,
            chunk.id,
          );
        }
      }

      await tx.knowledgeDocument.update({
        where: { id: doc.id },
        data: {
          status: KnowledgeDocStatus.READY,
          title: resolvedTitle,
          errorMessage: null,
        },
      });
    });

    log.info(
      { docId: doc.id, chunks: chunks.length, embedded },
      'doc processado',
    );
    return { status: 'ready', chunksCreated: chunks.length, embedded };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const retriable = isTransientError(msg);
    log.warn({ docId: documentId, err: msg, retriable }, 'process falhou');
    // Só persiste ERROR se for permanente. Em erro transiente, deixa em
    // PROCESSING pra próxima retry do BullMQ tentar de novo. Após esgotar
    // tentativas, BullMQ vai mover pro DLQ e o sweep ou ação manual marca ERROR.
    if (!retriable) {
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: KnowledgeDocStatus.ERROR,
          errorMessage: msg.slice(0, 500),
        },
      });
    }
    return {
      status: 'error',
      chunksCreated: 0,
      embedded: false,
      errorMessage: msg,
      retriable,
    };
  }
}

/** Fetch leve de URL pública → title + texto-corpo limpo. */
async function fetchUrlText(url: string): Promise<{ title: string; text: string }> {
  // SSRF guard: bloqueia file:, gopher:, IPs privados, metadata cloud (169.254.x).
  let safe: URL;
  try {
    safe = await assertSafeUrl(url);
  } catch (err) {
    if (err instanceof SsrfError) {
      throw new Error(`URL bloqueada por segurança: ${err.message}`);
    }
    throw err;
  }

  const res = await fetch(safe.href, {
    method: 'GET',
    headers: {
      'user-agent': 'Trato-Knowledge/1.0 (+https://trato.dev)',
      accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15_000),
    redirect: 'manual', // bloqueia redirect pra IP privado via Location: header
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`URL retornou redirect ${res.status} — siga manualmente se confiável`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao buscar URL`);
  }
  // Cap em 2MB pra evitar download de binário grande
  const lengthHeader = res.headers.get('content-length');
  if (lengthHeader && Number.parseInt(lengthHeader, 10) > 2 * 1024 * 1024) {
    throw new Error('Conteúdo maior que 2MB — pule ou hospede como PDF');
  }
  const html = await res.text();
  if (html.length > 2 * 1024 * 1024) {
    throw new Error('Conteúdo maior que 2MB');
  }
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? new URL(url).hostname;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(?:br|hr)[^>]*>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|li|h[1-6])>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title: title.slice(0, 200), text };
}
