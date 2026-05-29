import { describe, it, expect, afterEach } from 'vitest';
import { routeModel, isRoutingEnabled } from '../src/agent/routing';

const base = {
  intent: 'greeting',
  sentiment: 'neutral',
  needsHandoff: false,
  messageLength: 20,
  historyLength: 0,
};

describe('routeModel', () => {
  it('saudação curta → fast (Haiku)', () => {
    expect(routeModel(base).target).toBe('fast');
  });

  it('intent complexa (order) → chat (Sonnet)', () => {
    expect(routeModel({ ...base, intent: 'order' }).target).toBe('chat');
  });

  it('cliente insatisfeito → chat', () => {
    expect(routeModel({ ...base, sentiment: 'negative' }).target).toBe('chat');
  });

  it('precisa de handoff → chat', () => {
    expect(routeModel({ ...base, needsHandoff: true }).target).toBe('chat');
  });

  it('conversa longa → chat', () => {
    expect(routeModel({ ...base, historyLength: 8 }).target).toBe('chat');
  });

  it('mensagem trivial porém longa → chat (conservador)', () => {
    expect(routeModel({ ...base, messageLength: 400 }).target).toBe('chat');
  });
});

describe('isRoutingEnabled', () => {
  const original = process.env['AI_ROUTING'];
  afterEach(() => {
    if (original === undefined) delete process.env['AI_ROUTING'];
    else process.env['AI_ROUTING'] = original;
  });

  it('desligado por default', () => {
    delete process.env['AI_ROUTING'];
    expect(isRoutingEnabled()).toBe(false);
  });

  it('liga com AI_ROUTING=true', () => {
    process.env['AI_ROUTING'] = 'true';
    expect(isRoutingEnabled()).toBe(true);
  });
});
