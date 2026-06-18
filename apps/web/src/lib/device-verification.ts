import 'server-only';

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

import { redirect } from 'next/navigation';
import { prisma } from '@zapfy/db';
import { createLogger, hashPii } from '@zapfy/shared';

import { env } from '@/env';
import { sendEmail } from '@/lib/email/client';
import { newDeviceVerificationEmail } from '@/lib/email/templates';

const log = createLogger('device-verification');

/** Janela em que um código permanece válido. */
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos
/**
 * Janela em que o link "não fui eu" (revogação) continua válido. TTL próprio,
 * bem maior que o do código: o usuário legítimo pode demorar pra abrir o email
 * e clicar — mas a revogação SEMPRE deve poder destruir a sessão do atacante,
 * mesmo depois do código expirar.
 */
const REVOKE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
/** Comprimento do código em dígitos. */
const CODE_LENGTH = 6;

/**
 * Hash de PII (IP, UA) com `LOG_PII_SALT`. Reutiliza helper compartilhado pra
 * consistência com logs estruturados. Truncado em 16 chars (suficiente pra
 * detecção de duplicata, sem ser longo demais pra storage).
 */
function hashIp(ip: string): string {
  return hashPii(ip, env.LOG_PII_SALT);
}

function hashUserAgent(ua: string): string {
  return hashPii(ua, env.LOG_PII_SALT);
}

/**
 * Hash do código de 6 dígitos. Não precisa salt extra — código já é
 * curto-prazo (10min) + único por verificação.
 */
function hashCode(code: string): string {
  return createHash('sha256').update(`device-verify:${code}`).digest('hex');
}

/**
 * Lê IP do cliente respeitando headers de proxy (Vercel/Cloudflare).
 * Fallback pra '0.0.0.0' se nada decifrável — não deixar lançar erro.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get('x-real-ip') ??
    headers.get('cf-connecting-ip') ??
    headers.get('x-vercel-forwarded-for') ??
    '0.0.0.0'
  );
}

/**
 * Lê localização aproximada via headers Vercel/Cloudflare. Retorna string
 * legível ("São Paulo, BR") ou null.
 */
export function getClientLocation(headers: Headers): string | null {
  const city =
    headers.get('x-vercel-ip-city') ??
    headers.get('cf-ipcity') ??
    null;
  const country =
    headers.get('x-vercel-ip-country') ??
    headers.get('cf-ipcountry') ??
    null;
  if (city && country) {
    try {
      return `${decodeURIComponent(city)}, ${country}`;
    } catch {
      return `${city}, ${country}`;
    }
  }
  if (country) return country;
  return null;
}

/**
 * "Chrome em Windows · São Paulo" — label legível pra mostrar pro user.
 * Parsing minimal de UA. Sem libs externas (rastreamento de versão é overkill).
 */
export function describeDevice(userAgent: string, location: string | null): string {
  const ua = userAgent.toLowerCase();
  let browser = 'navegador';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/') && !ua.includes('chromium')) browser = 'Chrome';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari';

  let os = 'desktop';
  if (ua.includes('windows nt')) os = 'Windows';
  else if (ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone')) os = 'iPhone';
  else if (ua.includes('ipad')) os = 'iPad';
  else if (ua.includes('linux')) os = 'Linux';

  const base = `${browser} em ${os}`;
  return location ? `${base} · ${location}` : base;
}

/**
 * Retorna true se o par (userId, ip, ua) já foi visto antes — verificado e
 * registrado em `KnownDevice`. Atualiza `lastSeenAt`.
 */
export async function isKnownDevice(input: {
  userId: string;
  ipAddress: string;
  userAgent: string;
}): Promise<boolean> {
  const ipHash = hashIp(input.ipAddress);
  const userAgentHash = hashUserAgent(input.userAgent);
  const existing = await prisma.knownDevice.findUnique({
    where: { userId_ipHash_userAgentHash: { userId: input.userId, ipHash, userAgentHash } },
  });
  if (!existing) return false;
  // Atualiza last seen pra cleanup futuro de devices inativos
  await prisma.knownDevice.update({
    where: { id: existing.id },
    data: { lastSeenAt: new Date() },
  });
  return true;
}

/**
 * Registra um device como conhecido (chamado depois da verificação OU
 * em signup — primeiro device é confiável por padrão).
 */
export async function registerKnownDevice(input: {
  userId: string;
  ipAddress: string;
  userAgent: string;
  location: string | null;
}): Promise<void> {
  const ipHash = hashIp(input.ipAddress);
  const userAgentHash = hashUserAgent(input.userAgent);
  const label = describeDevice(input.userAgent, input.location);

  await prisma.knownDevice.upsert({
    where: { userId_ipHash_userAgentHash: { userId: input.userId, ipHash, userAgentHash } },
    create: { userId: input.userId, ipHash, userAgentHash, label },
    update: { lastSeenAt: new Date(), label },
  });
}

/**
 * Monta e dispara o e-mail de verificação de device. `sendEmail` nunca lança
 * (captura interna e retorna `{ ok }`), então o caller só checa o booleano.
 */
async function sendVerificationEmail(input: {
  userId: string;
  email: string;
  name: string | null;
  ipAddress: string;
  userAgent: string;
  location: string | null;
  appUrl: string;
  code: string;
  verifyToken: string;
  revokeToken: string;
}): Promise<{ ok: boolean }> {
  const appUrl = input.appUrl.replace(/\/$/, '');
  const tmpl = newDeviceVerificationEmail({
    name: input.name ?? input.email.split('@')[0] ?? 'usuário',
    ip: input.ipAddress,
    ...(input.location ? { location: input.location } : {}),
    device: describeDevice(input.userAgent, input.location),
    timestampLabel: new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }),
    verifyUrl: `${appUrl}/verify-device?token=${input.verifyToken}`,
    code: input.code,
    revokeUrl: `${appUrl}/api/auth/revoke-device?token=${input.revokeToken}`,
  });
  const result = await sendEmail({
    to: input.email,
    subject: tmpl.subject,
    html: tmpl.html,
    text: tmpl.text,
  });
  if (!result.ok) {
    log.error({ userId: input.userId, err: result.error }, 'e-mail verify-device NÃO enviado');
  }
  return { ok: result.ok };
}

/**
 * Cria uma verificação de dispositivo e dispara o email pro user.
 * Retorna { verifyToken, code, emailSent } pro caller. `revokeToken` fica salvo
 * no DB. `emailSent` deixa o caller decidir UX (ex.: avisar pra usar reenvio),
 * mas o bloqueio NÃO depende do email ter saído — a verificação pendente já
 * trava a sessão (fail-closed).
 */
export async function createDeviceVerification(input: {
  userId: string;
  email: string;
  name: string | null;
  sessionToken: string | null;
  ipAddress: string;
  userAgent: string;
  location: string | null;
  appUrl: string;
}): Promise<{ verifyToken: string; code: string; emailSent: boolean }> {
  // Código humano: 6 dígitos com leading zeros preservados.
  const code = randomInt(0, 1_000_000).toString().padStart(CODE_LENGTH, '0');
  const verifyToken = randomBytes(32).toString('hex');
  const revokeToken = randomBytes(32).toString('hex');

  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.deviceVerification.create({
    data: {
      userId: input.userId,
      sessionToken: input.sessionToken,
      ipAddress: input.ipAddress,
      location: input.location,
      userAgent: input.userAgent,
      codeHash: hashCode(code),
      verifyToken,
      revokeToken,
      expiresAt,
    },
  });

  const sent = await sendVerificationEmail({
    userId: input.userId,
    email: input.email,
    name: input.name,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    location: input.location,
    appUrl: input.appUrl,
    code,
    verifyToken,
    revokeToken,
  });

  log.info(
    { userId: input.userId, ipHash: hashIp(input.ipAddress), emailSent: sent.ok },
    'verificação de device criada',
  );

  return { verifyToken, code, emailSent: sent.ok };
}

/**
 * Reenvia o código pra verificação PENDENTE da sessão: regenera código e
 * estende o TTL (não cria registro novo — verifyToken/revokeToken preservados).
 */
export async function resendDeviceVerification(
  sessionToken: string,
  appUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const pending = await prisma.deviceVerification.findFirst({
    where: { sessionToken, verifiedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!pending) return { ok: false, error: 'Nenhuma verificação pendente.' };

  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
    select: { email: true, name: true },
  });
  if (!user) return { ok: false, error: 'Usuário não encontrado.' };

  const code = randomInt(0, 1_000_000).toString().padStart(CODE_LENGTH, '0');
  await prisma.deviceVerification.update({
    where: { id: pending.id },
    data: { codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  const sent = await sendVerificationEmail({
    userId: pending.userId,
    email: user.email,
    name: user.name,
    ipAddress: pending.ipAddress,
    userAgent: pending.userAgent,
    location: pending.location,
    appUrl,
    code,
    verifyToken: pending.verifyToken,
    revokeToken: pending.revokeToken,
  });
  if (!sent.ok) return { ok: false, error: 'Falha ao enviar o e-mail. Tenta de novo em instantes.' };
  return { ok: true };
}

/**
 * Valida um código (digitado manualmente) OU token (clicado no email).
 * Retorna a verification + registra device como conhecido se válido.
 */
export async function consumeDeviceVerification(input: {
  userId: string;
  code?: string;
  token?: string;
}): Promise<
  | { ok: true; verificationId: string }
  | { ok: false; reason: 'not-found' | 'expired' | 'invalid' | 'already-used' }
> {
  if (!input.code && !input.token) {
    return { ok: false, reason: 'invalid' };
  }

  // Por token: busca direto (token é único).
  if (input.token) {
    const v = await prisma.deviceVerification.findUnique({
      where: { verifyToken: input.token },
    });
    if (!v || v.userId !== input.userId) return { ok: false, reason: 'not-found' };
    if (v.verifiedAt) return { ok: false, reason: 'already-used' };
    if (v.revokedAt) return { ok: false, reason: 'invalid' };
    if (v.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

    await prisma.$transaction([
      prisma.deviceVerification.update({
        where: { id: v.id },
        data: { verifiedAt: new Date() },
      }),
    ]);
    await registerKnownDevice({
      userId: v.userId,
      ipAddress: v.ipAddress,
      userAgent: v.userAgent,
      location: v.location,
    });
    return { ok: true, verificationId: v.id };
  }

  // Por código: precisa pegar todas verificações abertas do user e comparar
  // hash em constant time pra evitar timing attacks.
  if (!input.code) return { ok: false, reason: 'invalid' };
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: 'invalid' };

  const openVerifications = await prisma.deviceVerification.findMany({
    where: {
      userId: input.userId,
      verifiedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  if (openVerifications.length === 0) return { ok: false, reason: 'not-found' };

  const targetHash = hashCode(code);
  const targetBuf = Buffer.from(targetHash, 'hex');
  const match = openVerifications.find((v) => {
    const candidate = Buffer.from(v.codeHash, 'hex');
    if (candidate.length !== targetBuf.length) return false;
    return timingSafeEqual(candidate, targetBuf);
  });
  if (!match) return { ok: false, reason: 'invalid' };

  await prisma.deviceVerification.update({
    where: { id: match.id },
    data: { verifiedAt: new Date() },
  });
  await registerKnownDevice({
    userId: match.userId,
    ipAddress: match.ipAddress,
    userAgent: match.userAgent,
    location: match.location,
  });
  return { ok: true, verificationId: match.id };
}

/**
 * Revoga a verificação via token (botão "não fui eu" no email). Destrói
 * a sessão associada e marca a verificação como revogada.
 */
export async function revokeDeviceVerificationByToken(token: string): Promise<
  | { ok: true; userId: string }
  | { ok: false; reason: 'not-found' | 'expired' | 'already-used' }
> {
  const v = await prisma.deviceVerification.findUnique({
    where: { revokeToken: token },
  });
  if (!v) return { ok: false, reason: 'not-found' };
  if (v.revokedAt) return { ok: false, reason: 'already-used' };
  // NÃO usa `expiresAt` (TTL do código, 10min) — a revogação tem janela
  // própria de 7 dias. Código expirado mas verificação ainda não confirmada =
  // sessão do atacante segue viva, então "não fui eu" PRECISA destruí-la.
  if (Date.now() - v.createdAt.getTime() > REVOKE_TTL_MS) {
    return { ok: false, reason: 'expired' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.deviceVerification.update({
      where: { id: v.id },
      data: { revokedAt: new Date() },
    });
    if (v.sessionToken) {
      // Destrói a sessão que estava pendente — força o atacante a re-logar.
      await tx.session.deleteMany({
        where: { token: v.sessionToken, userId: v.userId },
      });
    }
  });

  return { ok: true, userId: v.userId };
}

/**
 * Retorna a verificação pendente mais recente pra essa sessão, se houver.
 * Usado pelo guard/gate pra detectar "user tem que verificar antes de seguir
 * usando o app".
 *
 * FAIL-CLOSED: NÃO filtra por `expiresAt`. Uma verificação criada, nunca
 * confirmada e nunca revogada continua BLOQUEANDO mesmo depois do código
 * expirar — senão o atacante só esperaria 10min pra o gate liberar a sessão
 * de 30 dias (AU-A1). O flag `expired` deixa a UI oferecer reenvio (TTL do
 * código acabou) em vez de bloquear de vez.
 */
export async function pendingVerificationForSession(input: {
  userId: string;
  sessionToken: string;
}): Promise<{ id: string; expiresAt: Date; expired: boolean } | null> {
  const v = await prisma.deviceVerification.findFirst({
    where: {
      userId: input.userId,
      sessionToken: input.sessionToken,
      verifiedAt: null,
      revokedAt: null,
    },
    select: { id: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!v) return null;
  return { id: v.id, expiresAt: v.expiresAt, expired: v.expiresAt.getTime() < Date.now() };
}

/**
 * Guard fail-closed pra ser chamado por QUALQUER boundary autenticado (server
 * action, route handler, page) que não passe pelo `requireWorkspace` central.
 * Se a sessão tem uma verificação de device pendente (mesmo expirada e nunca
 * confirmada), redireciona pra /verify-device em vez de deixar a mutação rodar
 * (AU-A3). `redirect` lança `NEXT_REDIRECT` — o caller não continua.
 */
export async function enforceDeviceVerified(input: {
  userId: string;
  sessionToken: string;
}): Promise<void> {
  const pending = await pendingVerificationForSession(input);
  if (pending) redirect('/verify-device');
}
