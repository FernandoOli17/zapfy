/**
 * Smoke test do expression parser do flow executor.
 * Valida os fixes G/H/L sem rodar API externa (custo zero).
 *
 * pnpm tsx scripts/smoke-expression.ts
 */
import { evalExpression } from '../packages/ai/src/flow/expression';

const scope = {
  inboundText: 'olá',
  classification: { intent: 'question', needs_handoff: false },
  rag: [{ title: 'a', content: 'b' }],
  agentResult: null,
};

interface Case {
  name: string;
  expr: string;
  expectThrow?: string;
  expectResult?: boolean;
}

const cases: Case[] = [
  // Bug G — múltiplos dots
  { name: 'G: number 1.2 ok', expr: '1.2 > 0', expectResult: true },
  { name: 'G: number 1.2.3 throws', expr: '1.2.3 > 0', expectThrow: 'múltiplos pontos' },
  // Bug H — escape sequences
  { name: 'H: \\n vira newline real', expr: '"a\\nb" contains "\\n"', expectResult: true },
  { name: 'H: \\\\ vira backslash', expr: '"a\\\\b" contains "\\\\"', expectResult: true },
  // Bug L — depth limit
  {
    name: 'L: 40 parens explode',
    expr: '(((((((((((((((((((((((((((((((((((((((1)))))))))))))))))))))))))))))))))))))))',
    expectThrow: 'profunda demais',
  },
  // Sanity
  { name: 'sanity true', expr: 'true', expectResult: true },
  { name: 'sanity path', expr: '$classification.needs_handoff === false', expectResult: true },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  try {
    const result = evalExpression(c.expr, scope);
    if (c.expectThrow) {
      console.error(`❌ ${c.name}: esperava throw "${c.expectThrow}", retornou ${result}`);
      fail += 1;
      continue;
    }
    if (c.expectResult !== undefined && result !== c.expectResult) {
      console.error(`❌ ${c.name}: esperava ${c.expectResult}, retornou ${result}`);
      fail += 1;
      continue;
    }
    console.log(`✅ ${c.name}`);
    pass += 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (c.expectThrow && msg.toLowerCase().includes(c.expectThrow.toLowerCase())) {
      console.log(`✅ ${c.name} (throw esperado: ${msg.slice(0, 60)})`);
      pass += 1;
      continue;
    }
    console.error(`❌ ${c.name}: throw inesperado: ${msg}`);
    fail += 1;
  }
}

console.log(`\n${pass}/${pass + fail} passaram`);
if (fail > 0) process.exit(1);
