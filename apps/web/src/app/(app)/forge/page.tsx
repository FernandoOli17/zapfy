import { loadCurrentForgeSession } from './actions';
import { ForgeWorkspace } from './forge-workspace';

export const metadata = { title: 'Forge — Configurar agente' };

export const dynamic = 'force-dynamic';

export default async function ForgePage() {
  const state = await loadCurrentForgeSession();
  return <ForgeWorkspace initialState={state} />;
}
