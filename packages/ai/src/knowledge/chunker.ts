/**
 * Chunker para RAG — divide texto longo em janelas com overlap respeitando
 * parágrafos e sentenças. Tamanho default ~800 chars (~200 tokens), overlap
 * 100 chars (~25 tokens) — recall+precisão razoáveis pra voyage-3.
 */

export interface ChunkOptions {
  /** Tamanho alvo de cada chunk em chars. Default 800. */
  maxChars?: number;
  /** Sobreposição entre chunks em chars. Default 100. */
  overlap?: number;
  /** Tamanho mínimo de chunk pra emitir. Default 80 — evita lixo. */
  minChars?: number;
}

export interface Chunk {
  /** Posição do chunk dentro do documento. */
  index: number;
  /** Conteúdo do chunk (já trim). */
  content: string;
  /** Estimativa de tokens (~chars/4). */
  tokens: number;
}

/**
 * Divide `text` em chunks. Tenta sempre cortar em fim de parágrafo, depois
 * sentença, depois espaço. Adiciona overlap pra preservar contexto entre
 * pedaços. Pula chunks abaixo de `minChars` (descarta sobras curtas).
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? 800;
  const overlap = options.overlap ?? 100;
  const minChars = options.minChars ?? 80;

  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (normalized.length === 0) return [];
  if (normalized.length <= maxChars) {
    return normalized.length >= minChars
      ? [{ index: 0, content: normalized, tokens: estimateTokens(normalized) }]
      : [];
  }

  const chunks: Chunk[] = [];
  let cursor = 0;
  let idx = 0;

  while (cursor < normalized.length) {
    const remaining = normalized.length - cursor;
    if (remaining <= maxChars) {
      const tail = normalized.slice(cursor).trim();
      if (tail.length >= minChars) {
        chunks.push({ index: idx++, content: tail, tokens: estimateTokens(tail) });
      } else if (chunks.length > 0 && tail.length > 0) {
        // anexa sobra curta ao último chunk
        const last = chunks[chunks.length - 1];
        if (last) {
          last.content = `${last.content} ${tail}`.trim();
          last.tokens = estimateTokens(last.content);
        }
      }
      break;
    }

    const sliceEnd = cursor + maxChars;
    const candidate = normalized.slice(cursor, sliceEnd);
    const cut = findCut(candidate);
    const actualEnd = cursor + cut;
    const content = normalized.slice(cursor, actualEnd).trim();
    if (content.length >= minChars) {
      chunks.push({ index: idx++, content, tokens: estimateTokens(content) });
    }
    // avança com overlap
    cursor = Math.max(actualEnd - overlap, cursor + 1);
  }

  return chunks;
}

function findCut(text: string): number {
  const max = text.length;
  // tenta parágrafo → sentença → espaço, na metade final do candidato
  const minAccept = Math.floor(max * 0.5);
  const candidates: Array<[string, number]> = [
    ['\n\n', 2],
    ['. ', 2],
    ['! ', 2],
    ['? ', 2],
    ['\n', 1],
    [' ', 1],
  ];
  for (const [sep, lenAdj] of candidates) {
    const i = text.lastIndexOf(sep);
    if (i >= minAccept) return i + lenAdj;
  }
  return max;
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
