import { prisma } from '@zapai/db';
import { assertSafeUrl, createLogger, SsrfError } from '@zapai/shared';
import { createHmac } from 'node:crypto';

const log = createLogger('worker:custom-tool');

/**
 * Invoca uma CustomTool registrada no workspace.
 *
 * Pipeline:
 *  1. Carrega CustomTool por workspaceId + name
 *  2. Re-roda SSRF guard no endpoint (DNS pode ter mudado desde o create)
 *  3. POST com header HMAC-signature + JSON body
 *  4. Respeita timeoutMs configurado
 *  5. Parse response.json() — devolve `{ok:true, data}` ou `{ok:false, error}`
 *
 * IMPORTANTE: secret nunca sai do servidor — só o hash fica no DB. Aqui
 * precisamos do **secret cru** pra gerar HMAC. Decisão atual: secret cru
 * NÃO é persistido — vai pro cliente uma vez na criação. Pra invocar, o
 * CLIENTE precisa armazenar o secret e fornecer via endpoint próprio
 * (Bearer auth?), ou usaríamos outro padrão.
 *
 * Workaround MVP: requer custom tools terem seu próprio header de
 * autenticação compartilhado (ex: cliente cola `Bearer <token-deles>`
 * configurável em CustomTool.metadata). Por hora, retornamos `ok: false`
 * com mensagem clara quando secret não consegue ser usado.
 *
 * TODO(arch): suporte adequado a HMAC com secret-em-trânsito — seja via
 * vault-encrypted-at-rest, ou abandonar HMAC e usar mTLS / OAuth client creds.
 */
export async function invokeCustomTool(input: {
  toolName: string;
  args: Record<string, unknown>;
  workspaceId: string;
}): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const tool = await prisma.customTool.findUnique({
    where: { workspaceId_name: { workspaceId: input.workspaceId, name: input.toolName } },
  });
  if (!tool) {
    return { ok: false, error: `custom tool "${input.toolName}" não cadastrada` };
  }
  if (!tool.active) {
    return { ok: false, error: `custom tool "${input.toolName}" está desativada` };
  }

  // Re-roda SSRF guard em cada invocação (DNS pode ter mudado desde o create)
  try {
    await assertSafeUrl(tool.endpoint);
  } catch (err) {
    const msg = err instanceof SsrfError ? err.message : String(err);
    log.warn({ toolName: input.toolName, endpoint: tool.endpoint, err: msg }, 'SSRF re-check falhou');
    return { ok: false, error: `endpoint bloqueado: ${msg}` };
  }

  const body = JSON.stringify({ args: input.args, workspaceId: input.workspaceId });

  // HMAC com hash do secret (não temos secret cru — limitação MVP, ver TODO acima).
  // Por hora usamos o hash como secret HMAC — não é o ideal mas evita assinatura
  // "vazia". Cliente do outro lado precisa ter o mesmo hash pra validar.
  const signature = `sha256=${createHmac('sha256', tool.secretHash).update(body).digest('hex')}`;

  try {
    const res = await fetch(tool.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [tool.signatureHeader]: signature,
        'user-agent': 'Trato-Tool/1.0',
      },
      body,
      signal: AbortSignal.timeout(tool.timeoutMs),
      redirect: 'manual', // bloqueia redirect surpresa
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return {
        ok: false,
        error: `endpoint retornou HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 100)}` : ''}`,
      };
    }
    const data = (await res.json()) as unknown;
    log.info({ toolName: input.toolName, status: res.status }, 'custom tool ok');
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ toolName: input.toolName, err: msg }, 'custom tool falhou');
    return { ok: false, error: msg };
  }
}
