import { describe, it, expect } from 'vitest';
import { detectHallucination } from '../src/eval/hallucination';

describe('detectHallucination', () => {
  it('flagra preço afirmado sem tool nem RAG', () => {
    const r = detectHallucination({
      reply: 'A ração de 15kg custa R$ 189,90.',
      toolsUsed: [],
      ragChunks: [],
    });
    expect(r.hallucinated).toBe(true);
    expect(r.findings[0]?.kind).toBe('price');
  });

  it('NÃO flagra quando uma tool de dados foi usada', () => {
    const r = detectHallucination({
      reply: 'A ração de 15kg custa R$ 189,90.',
      toolsUsed: ['list_products'],
      ragChunks: [],
    });
    expect(r.hallucinated).toBe(false);
  });

  it('NÃO flagra quando o número está ancorado no RAG', () => {
    const r = detectHallucination({
      reply: 'O prazo de garantia é de 90 dias.',
      toolsUsed: [],
      ragChunks: [{ content: 'Nossa política de garantia cobre 90 dias corridos.' }],
    });
    expect(r.hallucinated).toBe(false);
  });

  it('flagra prazo de entrega inventado', () => {
    const r = detectHallucination({
      reply: 'A entrega chega em 3 dias úteis no seu endereço.',
      toolsUsed: [],
      ragChunks: [],
    });
    expect(r.hallucinated).toBe(true);
    expect(r.findings.map((f) => f.kind)).toContain('eta');
  });

  it('flagra horário de funcionamento inventado', () => {
    const r = detectHallucination({
      reply: 'Funcionamos das 8h às 18h de segunda a sexta.',
      toolsUsed: [],
      ragChunks: [],
    });
    expect(r.hallucinated).toBe(true);
    expect(r.findings.map((f) => f.kind)).toContain('hours');
  });

  it('NÃO flagra linguagem de verificação sem número', () => {
    const r = detectHallucination({
      reply: 'Deixa eu verificar o preço certinho pra você, só um instante! 😊',
      toolsUsed: [],
      ragChunks: [],
    });
    expect(r.hallucinated).toBe(false);
  });

  it('NÃO flagra resposta sem fato de negócio', () => {
    const r = detectHallucination({
      reply: 'Oi! Claro, como posso te ajudar hoje? 🐶',
      toolsUsed: [],
      ragChunks: [],
    });
    expect(r.hallucinated).toBe(false);
  });
});
