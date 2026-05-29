/**
 * Diagnóstico de entrega de email (Resend) via API REST. Manda um email de
 * teste pro endereço informado e imprime o erro real que hoje fica engolido
 * no warn.
 *
 * Uso:
 *   npx tsx --env-file=.env packages/db/scripts/test-resend.ts <email-destino>
 */
async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Uso: tsx scripts/test-resend.ts <email-destino>');
    process.exit(1);
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'Zapfy <noreply@zapfy.store>';
  if (!key) {
    console.error('RESEND_API_KEY ausente — emails em modo console, nada é entregue.');
    process.exit(2);
  }
  console.info(`from=${from}  to=${to}`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Zapfy — teste de entrega',
      html: '<p>Se você recebeu isso, o Resend está entregando. Código de teste: 123456</p>',
      text: 'Teste de entrega Resend. Código: 123456',
    }),
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) {
    console.error(`❌ Resend retornou HTTP ${res.status}:`);
    console.error(JSON.stringify(body, null, 2));
    process.exit(3);
  }
  console.info('✅ Enviado. id =', (body as { id?: string }).id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
