import { describe, expect, it } from 'vitest';

import { splitText, isWithin24hWindow } from '../src/utils';

describe('splitText', () => {
  it('texto curto vira um chunk único', () => {
    expect(splitText('oi', { maxLen: 1024 })).toEqual(['oi']);
  });

  it('regressão WA-F1: separador ". " em idx === max não pode estourar maxLen', () => {
    // '. ' exatamente na posição max fazia cut = max + 2 → chunk de 1025 chars.
    const text = 'x'.repeat(1024) + '. ' + 'y'.repeat(50);
    const chunks = splitText(text, { maxLen: 1024 });
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1024);
    }
  });

  it('nunca estoura maxLen pra nenhum separador e não perde conteúdo', () => {
    const cases = [
      'palavra '.repeat(300), // corta em espaço
      'frase. '.repeat(250), // corta em ". "
      ('linha\n'.repeat(40) + '\n').repeat(8), // corta em \n / \n\n
      'a'.repeat(3000), // sem separador — fallback duro
    ];
    for (const text of cases) {
      const chunks = splitText(text, { maxLen: 1024 });
      for (const c of chunks) {
        expect(c.length).toBeLessThanOrEqual(1024);
      }
      // conteúdo preservado módulo whitespace (trim de borda por chunk)
      expect(chunks.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
    }
  });
});

describe('isWithin24hWindow', () => {
  it('sem lastIncomingAt → fora da janela', () => {
    expect(isWithin24hWindow(null)).toBe(false);
    expect(isWithin24hWindow(undefined)).toBe(false);
  });

  it('mensagem recente → dentro da janela', () => {
    expect(isWithin24hWindow(new Date(Date.now() - 60_000))).toBe(true);
  });

  it('mais de 24h → fora da janela', () => {
    expect(isWithin24hWindow(new Date(Date.now() - 25 * 3600 * 1000))).toBe(false);
  });

  it('regressão WA-H1: timestamp no futuro (clock skew da Meta) conta como DENTRO da janela', () => {
    // Relógio do servidor atrás do da Meta: mensagem "do futuro" é o caso mais
    // recente possível — bloquear aqui silenciava o agente logo após a mensagem.
    expect(isWithin24hWindow(new Date(Date.now() + 60_000))).toBe(true);
  });
});
