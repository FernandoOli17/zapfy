import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Guard contra Server-Side Request Forgery (SSRF).
 *
 * Bloqueia:
 *  - schemes não-http/https (file:, gopher:, data:, javascript:, ftp:, ws:, etc.)
 *  - hostnames que resolvam pra IP privado / loopback / link-local / metadata cloud
 *  - portas suspeitas (default só permite 80, 443)
 *  - URLs sem hostname
 *
 * Uso típico:
 *   const safe = await assertSafeUrl(userInput);
 *   const res = await fetch(safe.href, { ... });
 *
 * IMPORTANTE: a validação de DNS é feita ANTES do fetch, mas o fetch real
 * resolve DNS de novo — em teoria há janela pra DNS rebinding. Pra MVP isso
 * é aceitável (atacante precisa controlar DNS autoritativo). Pra defesa
 * forte, usar `node:net.connect` ao IP validado e injetar `Host` header,
 * OU usar um egress proxy que faça validação.
 */

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);
const ALLOWED_PORTS_HTTP = new Set(['', '80', '443', '8080', '8443']);

/** Ranges de IPv4 considerados privados / locais. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) return true; // formato ruim → bloqueia

  const [a = 0, b = 0] = parts;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 0.0.0.0/8
  if (a === 0) return true;
  // 169.254.0.0/16 (link-local + metadata AWS/GCP/Azure 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 224.0.0.0/4 (multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (reserved)
  if (a >= 240) return true;

  return false;
}

/** IPv6 — bloqueia loopback, link-local, ULA, mapped IPv4-private. */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  // Loopback ::1
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // Unspecified ::
  if (lower === '::' || /^0:0:0:0:0:0:0:0$/.test(lower)) return true;
  // Link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  // Unique local fc00::/7
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
  // IPv4-mapped ::ffff:a.b.c.d — extrai IPv4 e re-checa
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped && mapped[1]) return isPrivateIPv4(mapped[1]);
  // Multicast ff00::/8
  if (/^ff[0-9a-f]{2}:/.test(lower)) return true;
  return false;
}

export class SsrfError extends Error {
  override readonly name = 'SsrfError';
  constructor(message: string) {
    super(message);
  }
}

export interface AssertSafeUrlOptions {
  /** Permite portas customizadas além de 80/443/8080/8443. */
  allowedPorts?: Set<string>;
  /** Lista branca de hostnames (sobrepõe TODAS as outras checks — usar com cuidado). */
  allowHostnames?: string[];
  /** Skip DNS resolution (útil em testes ou quando IP já validado). */
  skipDnsCheck?: boolean;
}

/**
 * Valida que `urlStr` é seguro pra fetch externo. Lança `SsrfError` se não for.
 * Retorna a URL parseada.
 */
export async function assertSafeUrl(
  urlStr: string,
  options: AssertSafeUrlOptions = {},
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new SsrfError('URL inválida');
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new SsrfError(`Scheme não permitido: ${parsed.protocol}`);
  }

  const allowedPorts = options.allowedPorts ?? ALLOWED_PORTS_HTTP;
  if (parsed.port && !allowedPorts.has(parsed.port)) {
    throw new SsrfError(`Porta não permitida: ${parsed.port}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) throw new SsrfError('URL sem hostname');

  // Whitelist explícita (ex.: graph.facebook.com pra Meta API)
  if (options.allowHostnames?.some((h) => hostname === h || hostname.endsWith('.' + h))) {
    return parsed;
  }

  // Bloqueia hostnames reservados óbvios
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    throw new SsrfError(`Hostname reservado: ${hostname}`);
  }

  // Se já é IP literal, checa direto
  const ipKind = isIP(hostname);
  if (ipKind === 4) {
    if (isPrivateIPv4(hostname)) {
      throw new SsrfError(`IP privado bloqueado: ${hostname}`);
    }
    return parsed;
  }
  if (ipKind === 6) {
    if (isPrivateIPv6(hostname)) {
      throw new SsrfError(`IP privado bloqueado: ${hostname}`);
    }
    return parsed;
  }

  if (options.skipDnsCheck) return parsed;

  // Resolve DNS e valida cada IP retornado (mitigação básica de DNS rebinding)
  let records: Array<{ address: string; family: number }>;
  try {
    records = await lookup(hostname, { all: true });
  } catch (err) {
    throw new SsrfError(`Falha ao resolver DNS: ${err instanceof Error ? err.message : String(err)}`);
  }

  for (const r of records) {
    if (r.family === 4 && isPrivateIPv4(r.address)) {
      throw new SsrfError(`Hostname resolve pra IP privado (${r.address}): ${hostname}`);
    }
    if (r.family === 6 && isPrivateIPv6(r.address)) {
      throw new SsrfError(`Hostname resolve pra IPv6 privado (${r.address}): ${hostname}`);
    }
  }

  return parsed;
}
