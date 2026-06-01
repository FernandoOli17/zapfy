import { describe, expect, it } from 'vitest';

import { forgeAnswersSchema } from '../src/forge/types';
import { VERTICAL_LIST, VERTICAL_META } from '../src/forge/verticals';
import { VERTICAL_IDS } from '../src/forge/types';

describe('persona no forgeAnswersSchema', () => {
  it('aceita persona com style human + displayName opcional', () => {
    const parsed = forgeAnswersSchema.parse({
      persona: { style: 'human', displayName: 'Sofia' },
    });
    expect(parsed.persona?.style).toBe('human');
    expect(parsed.persona?.displayName).toBe('Sofia');
  });

  it('aceita persona assistant sem displayName', () => {
    const parsed = forgeAnswersSchema.parse({ persona: { style: 'assistant' } });
    expect(parsed.persona?.style).toBe('assistant');
  });
});

describe('VERTICAL_META', () => {
  it('cobre todos os verticais com label, emoji e sugestões', () => {
    for (const id of VERTICAL_IDS) {
      const meta = VERTICAL_META[id];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.emoji.length).toBeGreaterThan(0);
      expect(meta.goalSuggestions.length).toBeGreaterThan(0);
    }
  });

  it('VERTICAL_LIST tem a mesma quantidade que VERTICAL_IDS', () => {
    expect(VERTICAL_LIST.length).toBe(VERTICAL_IDS.length);
  });
});
