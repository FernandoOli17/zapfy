/** Conta linhas duplicadas de chaves no .env (só metadados, nunca o valor). */
import { readFileSync } from 'node:fs';

const lines = readFileSync('.env', 'utf8').split(/\r?\n/);

function report(name: string) {
  const hits = lines
    .map((l, i) => ({ l, i }))
    .filter((x) => new RegExp(`^\\s*${name}\\s*=`).test(x.l));
  console.info(`${name}: ${hits.length} linha(s)`);
  for (const { l, i } of hits) {
    const val = l.slice(l.indexOf('=') + 1);
    console.info(
      `  linha ${i + 1} · valor len ${val.trim().length} · aspas:${/["']/.test(val)} · espaço-interno:${/\s/.test(val.trim())} · não-ascii:${/[^\x00-\x7f]/.test(val)}`,
    );
  }
}

report('ANTHROPIC_API_KEY');
report('VOYAGE_API_KEY');
report('MOCK_AI');
