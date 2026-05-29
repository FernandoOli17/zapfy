import { describe, expect, it } from 'vitest';

import {
  creditsSufficient,
  isAgentServingStatus,
  planLimitState,
  requiredPlanForFeature,
} from '../src/billing';
import { PLANS } from '../src/constants';

describe('isAgentServingStatus', () => {
  it('atende só com ACTIVE ou PAST_DUE (graça)', () => {
    expect(isAgentServingStatus('ACTIVE')).toBe(true);
    expect(isAgentServingStatus('PAST_DUE')).toBe(true);
  });
  it('não atende sem assinatura paga viva', () => {
    for (const s of ['TRIALING', 'CANCELED', 'UNPAID', 'INCOMPLETE'] as const) {
      expect(isAgentServingStatus(s)).toBe(false);
    }
  });
});

describe('planLimitState', () => {
  it('unlimited nunca estoura', () => {
    const s = planLimitState('unlimited', 999_999);
    expect(s).toEqual({ unlimited: true, pct: 0, over: false, remaining: null });
  });
  it('calcula pct e remaining', () => {
    const s = planLimitState(1_500, 750);
    expect(s.pct).toBe(50);
    expect(s.over).toBe(false);
    expect(s.remaining).toBe(750);
  });
  it('over quando used >= limit (no limite já bloqueia)', () => {
    expect(planLimitState(1_500, 1_500).over).toBe(true);
    expect(planLimitState(1_500, 1_501).over).toBe(true);
    expect(planLimitState(1_500, 1_499).over).toBe(false);
  });
  it('pct nunca passa de 100 e remaining não fica negativo', () => {
    const s = planLimitState(10, 25);
    expect(s.pct).toBe(100);
    expect(s.remaining).toBe(0);
  });
});

describe('requiredPlanForFeature', () => {
  it('customTools exige PRO (menor plano que habilita)', () => {
    expect(requiredPlanForFeature('customTools')).toBe('PRO');
    expect(PLANS.PRO.customTools).toBe(true);
    expect(PLANS.STARTER.customTools).toBe(false);
  });
  it('apiAccess exige BUSINESS', () => {
    expect(requiredPlanForFeature('apiAccess')).toBe('BUSINESS');
    expect(PLANS.BUSINESS.apiAccess).toBe(true);
    expect(PLANS.PRO.apiAccess).toBe(false);
  });
});

describe('creditsSufficient', () => {
  it('cobre quando saldo >= necessário', () => {
    expect(creditsSufficient(100, 100)).toBe(true);
    expect(creditsSufficient(100, 40)).toBe(true);
  });
  it('bloqueia quando saldo < necessário', () => {
    expect(creditsSufficient(39, 40)).toBe(false);
    expect(creditsSufficient(0, 1)).toBe(false);
  });
  it('zero destinatários não consome (mas não é negativo)', () => {
    expect(creditsSufficient(0, 0)).toBe(true);
    expect(creditsSufficient(0, -1)).toBe(false);
  });
});

describe('PLANS — números travados (ADR-0001)', () => {
  it('preços e limites de conversas de IA', () => {
    expect(PLANS.STARTER.priceBRLCents).toBe(9700);
    expect(PLANS.PRO.priceBRLCents).toBe(24700);
    expect(PLANS.BUSINESS.priceBRLCents).toBe(59700);
    expect(PLANS.STARTER.aiConversations).toBe(1_500);
    expect(PLANS.PRO.aiConversations).toBe(6_000);
    expect(PLANS.BUSINESS.aiConversations).toBe('unlimited');
  });
});
