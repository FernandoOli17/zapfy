// Fase 7 — tools especializadas por vertical.
// Cada arquivo exporta `build*Tools(deps)` que retorna `Record<string, Tool>`.
// Usadas pelo runner em `packages/ai/src/agent/tools/verticals.ts`.

export { buildEcommerceTools } from './ecommerce';
export { buildRestaurantTools } from './restaurant';
export { buildClinicTools } from './clinic';
export { buildInfoproductTools } from './infoproduct';
export { buildServiceTools } from './service';
export type { VerticalRuntimeDeps, VerticalToolsBuilder } from './runtime/types';
