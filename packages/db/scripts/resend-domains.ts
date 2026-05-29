/**
 * Lista os domínios da conta Resend e o status de verificação de cada um.
 * Leitura apenas — pra descobrir qual domínio usar no `from`.
 *
 * Uso: pnpm --filter @zapfy/db exec tsx scripts/resend-domains.ts
 */
async function main() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('RESEND_API_KEY ausente.');
    process.exit(2);
  }
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    console.error(JSON.stringify(body, null, 2));
    process.exit(3);
  }
  const data = (body as { data?: Array<{ name: string; status: string; region?: string }> }).data ?? [];
  if (data.length === 0) {
    console.info('Nenhum domínio nessa conta Resend. (Chave de outra conta/team?)');
    return;
  }
  console.info('Domínios na conta Resend:');
  for (const d of data) {
    console.info(`  ${d.name}  →  status=${d.status}${d.region ? `  region=${d.region}` : ''}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
