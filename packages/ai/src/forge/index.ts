// Fase 3 — implementar aqui: state machine, prompts por fase, meta-prompt,
// tools do Forge (classify_business_vertical, scrape_url, generate_system_prompt, etc.).

export const FORGE_PHASES = [
  'DISCOVERY',
  'VERTICAL_DETECTION',
  'GOALS',
  'TONE',
  'KNOWLEDGE',
  'TOOLS',
  'HANDOFF',
  'REVIEW',
  'PUBLISH',
  'REFINEMENT',
] as const;
export type ForgePhase = (typeof FORGE_PHASES)[number];
