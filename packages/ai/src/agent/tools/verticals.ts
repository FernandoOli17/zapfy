import type { Tool } from 'ai';
import {
  buildEcommerceTools,
  buildRestaurantTools,
  buildClinicTools,
  buildInfoproductTools,
  buildServiceTools,
} from '../../tools';
import type { VerticalId } from '../../forge/types';

/**
 * Deps que o worker injeta — IDs do contexto da mensagem.
 *
 * Mudança da Fase 7: antes era um Record com callbacks (`listProducts`,
 * `getMenu`, etc.) que o worker implementava. Agora as tools acessam Postgres
 * direto via `prisma` em `@zapfy/ai/tools/*.ts`. O worker só passa os IDs.
 *
 * Mantemos `conversationId` opcional pra backward-compat (algumas tools antigas
 * funcionavam sem ele).
 */
export interface VerticalToolDeps {
  workspaceId: string;
  contactId: string;
  conversationId?: string;
}

/**
 * Roteia o vertical pra factory de tools correspondente.
 * Default (vertical desconhecido ou OTHER): retorna objeto vazio — só global tools rodam.
 */
export function buildVerticalTools(
  vertical: VerticalId | string,
  deps: VerticalToolDeps,
): Record<string, Tool> {
  const runtime = {
    workspaceId: deps.workspaceId,
    contactId: deps.contactId,
    conversationId: deps.conversationId ?? 'unknown',
  };
  switch (vertical) {
    case 'ECOMMERCE':
      return buildEcommerceTools(runtime);
    case 'RESTAURANT':
      return buildRestaurantTools(runtime);
    case 'CLINIC':
      return buildClinicTools(runtime);
    case 'INFOPRODUCT':
      return buildInfoproductTools(runtime);
    case 'SERVICE':
      return buildServiceTools(runtime);
    default:
      return {};
  }
}
