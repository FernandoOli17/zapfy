import { describe, expect, it } from 'vitest';

import { VERTICAL_TOOL_CATALOG } from '../src/forge';
import { buildVerticalTools } from '../src/agent/tools/verticals';
import { buildGlobalTools } from '../src/agent/tools/global';
import type { AgentToolDeps } from '../src/agent/tools/global';

const noop = async () => {
  /* nunca executa — só precisamos dos nomes */
};

const globalDeps: AgentToolDeps = {
  workspaceId: 'ws_test',
  contactId: 'ct_test',
  conversationId: 'cv_test',
  searchKnowledge: async () => [],
  setContactField: noop,
  transferToHuman: noop,
  sendTemplate: noop,
};

/**
 * Regressão FO-A9: o catálogo da fase TOOLS do Forge oferecia tools que não
 * existem no runtime (send_intake_form, apply_loyalty_discount, apply_discount,
 * follow_up, request_payment_pix). O nome escolhido ia parar no system prompt
 * gerado e o agente prometia capacidade fantasma ao cliente final.
 * Lei: catálogo ⊆ tools reais (global + vertical).
 */
describe('VERTICAL_TOOL_CATALOG ⊆ tools implementadas', () => {
  const globalNames = new Set(Object.keys(buildGlobalTools(globalDeps)));

  for (const [vertical, entries] of Object.entries(VERTICAL_TOOL_CATALOG)) {
    it(`${vertical}: toda tool do catálogo existe no runtime`, () => {
      const verticalNames = new Set(
        Object.keys(
          buildVerticalTools(vertical, {
            workspaceId: 'ws_test',
            contactId: 'ct_test',
            conversationId: 'cv_test',
          }),
        ),
      );
      const missing = entries
        .map((e) => e.name)
        .filter((name) => !verticalNames.has(name) && !globalNames.has(name));
      expect(missing).toEqual([]);
    });
  }
});
