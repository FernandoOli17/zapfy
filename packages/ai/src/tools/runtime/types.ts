import type { Tool } from 'ai';

/**
 * Dependências passadas ao runtime de tools — `workspaceId` + `contactId` +
 * `conversationId` injetadas pelo worker pra cada turno do agente.
 *
 * Tools que precisam de DB usam essas IDs pra escopar tudo.
 * Tools que chamam serviços externos (Stripe, Google Calendar) usam credenciais
 * do workspace (cifradas) — não passe credencial bruta aqui.
 */
export interface VerticalRuntimeDeps {
  workspaceId: string;
  contactId: string;
  conversationId: string;
}

/**
 * Factory de tools por vertical — assina `(deps) => Record<name, Tool>`.
 * Cada vertical exporta `build*Tools(deps)` que devolve só as tools do
 * seu domínio. O worker mescla com as global tools antes de chamar o LLM.
 */
export type VerticalToolsBuilder = (deps: VerticalRuntimeDeps) => Record<string, Tool>;
