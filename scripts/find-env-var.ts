/**
 * Descobre em qual arquivo .env mora uma variável e sob qual NOME — sem nunca
 * imprimir o valor (só o nome da chave e o arquivo). Ajuda quando uma credencial
 * "está lá" mas o app não enxerga (arquivo errado / nome errado).
 *
 * Rodar: pnpm tsx scripts/find-env-var.ts voyage
 */
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'dotenv';

const needle = (process.argv[2] ?? 'voyage').toLowerCase();

const candidates = [
  '.env',
  '.env.local',
  'apps/web/.env',
  'apps/web/.env.local',
  'apps/worker/.env',
  'apps/worker/.env.local',
];

console.info(`🔎 procurando chaves contendo "${needle}" (mostro só NOME + arquivo, nunca valor)\n`);
let found = false;
for (const file of candidates) {
  if (!existsSync(file)) {
    console.info(`   ${file.padEnd(24)} — não existe`);
    continue;
  }
  const parsed = parse(readFileSync(file));
  const keys = Object.keys(parsed);
  const matches = keys.filter((k) => k.toLowerCase().includes(needle));
  const hasExact = keys.includes('VOYAGE_API_KEY');
  console.info(
    `   ${file.padEnd(24)} — ${keys.length} vars` +
      (matches.length ? ` · contém: ${matches.join(', ')}` : '') +
      (hasExact ? ' · ✅ VOYAGE_API_KEY exato' : ''),
  );
  if (matches.length) found = true;
}
if (!found) {
  console.info('\n❌ Nenhuma variável com esse nome em nenhum arquivo .env conhecido.');
}
