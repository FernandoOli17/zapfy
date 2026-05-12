'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';

import { prisma, WhatsAppStatus } from '@zapai/db';
import { AppError, createLogger, decrypt, encrypt } from '@zapai/shared';
import { createWaClient, WaApiError } from '@zapai/wa';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { env } from '@/env';

const log = createLogger('whatsapp-actions');

async function requireSessionAndWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  return { user: session.user, workspace: member.workspace };
}

const connectInput = z.object({
  phoneNumberId: z
    .string()
    .trim()
    .min(8, 'phone_number_id inválido')
    .regex(/^\d+$/, 'phone_number_id deve conter só dígitos'),
  businessAccountId: z
    .string()
    .trim()
    .min(8, 'business_account_id inválido')
    .regex(/^\d+$/, 'business_account_id deve conter só dígitos'),
  accessToken: z.string().trim().min(40, 'access_token muito curto'),
  appSecret: z.string().trim().min(20, 'app_secret muito curto'),
});

export type ConnectWhatsAppResult =
  | {
      status: 'ok';
      accountId: string;
      displayPhone: string;
      webhookUrl: string;
      verifyToken: string;
    }
  | { status: 'error'; error: string };

/**
 * Cadastra ou atualiza WhatsAppAccount do workspace.
 * Testa as credenciais com a Meta antes de salvar.
 */
export async function connectWhatsAppAction(
  raw: z.infer<typeof connectInput>,
): Promise<ConnectWhatsAppResult> {
  const parsed = connectInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { workspace } = await requireSessionAndWorkspace();
  const data = parsed.data;

  // 1) testa as credenciais com a Meta
  const client = createWaClient({
    phoneNumberId: data.phoneNumberId,
    accessToken: data.accessToken,
  });

  let displayPhone: string;
  try {
    const info = await client.testConnection();
    displayPhone = info.display_phone_number;
  } catch (err) {
    if (err instanceof WaApiError) {
      log.warn(
        { phoneNumberId: data.phoneNumberId, metaCode: err.metaCode },
        'meta testConnection falhou',
      );
      return {
        status: 'error',
        error: `Meta rejeitou as credenciais: ${err.userMessage}${
          err.metaCode ? ` (code ${err.metaCode})` : ''
        }`,
      };
    }
    log.error({ err: String(err) }, 'meta testConnection erro inesperado');
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Erro inesperado ao falar com a Meta',
    };
  }

  // 2) cifra os segredos
  const accessTokenEncrypted = encrypt(data.accessToken, env.ENCRYPTION_KEY);
  const appSecretEncrypted = encrypt(data.appSecret, env.ENCRYPTION_KEY);
  const verifyToken = randomBytes(16).toString('hex');

  // 3) upsert da conta
  const existing = await prisma.whatsAppAccount.findUnique({
    where: { phoneNumberId: data.phoneNumberId },
  });
  if (existing && existing.workspaceId !== workspace.id) {
    return {
      status: 'error',
      error: 'Esse número já está vinculado a outro workspace. Desconecte de lá primeiro.',
    };
  }

  const account = existing
    ? await prisma.whatsAppAccount.update({
        where: { id: existing.id },
        data: {
          accessTokenEncrypted,
          appSecretEncrypted,
          businessAccountId: data.businessAccountId,
          displayPhone,
          webhookVerifyToken: existing.webhookVerifyToken || verifyToken,
          status: WhatsAppStatus.CONNECTED,
          lastErrorMessage: null,
          connectedAt: new Date(),
        },
      })
    : await prisma.whatsAppAccount.create({
        data: {
          workspaceId: workspace.id,
          phoneNumberId: data.phoneNumberId,
          businessAccountId: data.businessAccountId,
          accessTokenEncrypted,
          appSecretEncrypted,
          displayPhone,
          webhookVerifyToken: verifyToken,
          status: WhatsAppStatus.CONNECTED,
          connectedAt: new Date(),
        },
      });

  // 4) audit log
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: existing ? 'whatsapp.reconnect' : 'whatsapp.connect',
      targetType: 'WhatsAppAccount',
      targetId: account.id,
      metadata: { phoneNumberId: data.phoneNumberId, displayPhone },
    },
  });

  revalidatePath('/whatsapp');
  revalidatePath('/dashboard');

  return {
    status: 'ok',
    accountId: account.id,
    displayPhone,
    webhookUrl: buildWebhookUrl(data.phoneNumberId),
    verifyToken: account.webhookVerifyToken,
  };
}

/** Re-testa a conexão chamando GET /{phoneNumberId} na Meta. Atualiza status. */
export async function testWhatsAppConnectionAction(
  accountId: string,
): Promise<{ status: 'ok'; displayPhone: string } | { status: 'error'; error: string }> {
  const { workspace } = await requireSessionAndWorkspace();
  const account = await prisma.whatsAppAccount.findFirst({
    where: { id: accountId, workspaceId: workspace.id },
  });
  if (!account) return { status: 'error', error: 'Conta não encontrada' };

  try {
    const accessToken = decrypt(account.accessTokenEncrypted, env.ENCRYPTION_KEY);
    const client = createWaClient({ phoneNumberId: account.phoneNumberId, accessToken });
    const info = await client.testConnection();
    await prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: {
        status: WhatsAppStatus.CONNECTED,
        displayPhone: info.display_phone_number,
        lastErrorMessage: null,
      },
    });
    revalidatePath('/whatsapp');
    return { status: 'ok', displayPhone: info.display_phone_number };
  } catch (err) {
    const msg = err instanceof AppError ? err.userMessage : String(err);
    await prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: { status: WhatsAppStatus.ERROR, lastErrorMessage: msg.slice(0, 500) },
    });
    revalidatePath('/whatsapp');
    return { status: 'error', error: msg };
  }
}

export async function disconnectWhatsAppAction(
  accountId: string,
): Promise<{ status: 'ok' } | { status: 'error'; error: string }> {
  const { workspace } = await requireSessionAndWorkspace();
  const account = await prisma.whatsAppAccount.findFirst({
    where: { id: accountId, workspaceId: workspace.id },
  });
  if (!account) return { status: 'error', error: 'Conta não encontrada' };

  await prisma.whatsAppAccount.update({
    where: { id: account.id },
    data: { status: WhatsAppStatus.DISCONNECTED },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: 'whatsapp.disconnect',
      targetType: 'WhatsAppAccount',
      targetId: account.id,
    },
  });
  revalidatePath('/whatsapp');
  return { status: 'ok' };
}

// =========================================
// helpers
// =========================================

function buildWebhookUrl(phoneNumberId: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  return `${base}/api/webhooks/whatsapp/${phoneNumberId}`;
}
