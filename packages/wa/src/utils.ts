import { WA_TEXT_SAFE_LEN, WA_WINDOW_MS } from './constants';

/**
 * Divide texto longo em chunks respeitando palavras, parágrafos e WA_TEXT_SAFE_LEN.
 * Mantém numeração natural ("1/3", "2/3", "3/3") se opt-in.
 */
export function splitText(
  body: string,
  options: { maxLen?: number; addCounter?: boolean } = {},
): string[] {
  const max = options.maxLen ?? WA_TEXT_SAFE_LEN;
  const text = body.trim();
  if (text.length <= max) return [text];

  const chunks: string[] = [];
  let rest = text;

  while (rest.length > max) {
    // tenta cortar em quebra dupla de linha, depois em \n, depois em espaço
    let cut = findCut(rest, max, ['\n\n', '\n', '. ', ' ']);
    if (cut <= 0) cut = max; // fallback
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);

  if (options.addCounter && chunks.length > 1) {
    return chunks.map((c, i) => `(${i + 1}/${chunks.length}) ${c}`);
  }
  return chunks;
}

function findCut(text: string, max: number, separators: string[]): number {
  for (const sep of separators) {
    const idx = text.lastIndexOf(sep, max);
    if (idx > max * 0.4) return idx + sep.length;
  }
  return -1;
}

/**
 * Verifica se a conversa ainda está dentro da janela de 24h. Se sim, pode mandar
 * mensagem livre. Se não, só template HSM aprovado.
 */
export function isWithin24hWindow(lastIncomingAt: Date | null | undefined): boolean {
  if (!lastIncomingAt) return false;
  const elapsed = Date.now() - lastIncomingAt.getTime();
  return elapsed >= 0 && elapsed < WA_WINDOW_MS;
}

/** Horas decorridas desde a última mensagem recebida (arredondado pra baixo). */
export function hoursSince(lastIncomingAt: Date): number {
  return Math.floor((Date.now() - lastIncomingAt.getTime()) / (60 * 60 * 1000));
}

/**
 * Normaliza telefone pra E.164 sem `+`. Remove tudo que não é dígito.
 * Não valida país — só formata. Caller deve validar via `phoneE164Schema` de @zapai/shared.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Converte timestamp string da Meta (segundos epoch) pra Date. */
export function parseMetaTimestamp(timestamp: string): Date {
  const seconds = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(seconds)) return new Date();
  return new Date(seconds * 1000);
}
