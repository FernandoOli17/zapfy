/**
 * Aderência ao tom — heurística determinística.
 *
 * O eval barato (MOCK / sem token) checa presença de marcadores de tom da marca
 * na resposta (ex.: emoji acolhedor, saudação calorosa, vocabulário do nicho).
 * No modo real (com token) um juiz Haiku avalia tom com mais nuance — ver
 * `scripts/eval-ai.ts`. Aqui é só o piso determinístico.
 */

export function matchesTone(text: string, markers: string[]): boolean {
  if (markers.length === 0) return true;
  const lower = text.toLowerCase();
  return markers.some((m) => lower.includes(m.toLowerCase()));
}

/** Conta quantos marcadores de tom apareceram (pra score graduado). */
export function toneScore(text: string, markers: string[]): number {
  if (markers.length === 0) return 1;
  const lower = text.toLowerCase();
  const hits = markers.filter((m) => lower.includes(m.toLowerCase())).length;
  return hits / markers.length;
}
