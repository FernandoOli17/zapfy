import 'server-only';

import { cookies } from 'next/headers';

export const IMPERSONATE_COOKIE = 'x-impersonate-workspace';

/**
 * Lê o workspaceId que o super-admin está impersonando.
 *
 * Não verifica se quem leu É super-admin — quem chama deve garantir isso
 * (e.g., `requireWorkspace` resolve por carregar User.isSuperAdmin). O cookie
 * é httpOnly + sameSite=lax, então não dá pra forjar do client.
 */
export async function getImpersonatedWorkspaceId(): Promise<string | null> {
  const c = await cookies();
  return c.get(IMPERSONATE_COOKIE)?.value ?? null;
}
