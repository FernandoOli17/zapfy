/**
 * Email sequence sweep — roda a cada 30min no worker.
 *
 * Identifica usuários que precisam receber:
 *  - day3_forge_nudge: criado há 3 dias e Forge não publicado
 *  - day6_trial_ending: trial acaba em <24h
 *  - activation: agente publicado E primeira mensagem (envio único)
 *
 * Idempotência via tabela `EmailSent` — uma (userId, templateKey) só envia 1x.
 *
 * **welcome** é enviado direto no signup, não aqui (instantâneo).
 */
import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';
import { Resend } from 'resend';

import { env } from '../env';

const log = createLogger('worker:email-seq');

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  if (resendClient) return resendClient;
  if (!env.RESEND_API_KEY) return null;
  resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

const APP_URL = env.NEXT_PUBLIC_APP_URL ?? 'https://trato.dev';

interface TemplateOutput {
  subject: string;
  html: string;
  text: string;
}

/**
 * Recriação dos templates pro worker — não importa de apps/web/ pra evitar
 * acoplamento. Mantém em sync manualmente (são 3 templates curtos).
 */
function day3Forge(name: string): TemplateOutput {
  const forgeUrl = `${APP_URL.replace(/\/$/, '')}/forge`;
  return {
    subject: 'Faltam 5min pro seu agente IA estar no ar 🤖',
    html: `<p>Oi ${name}, você criou conta no Trato faz 3 dias e ainda não terminou de configurar o agente. O Forge faz isso em 5min conversando.</p><p><a href="${forgeUrl}">Configurar agora →</a></p>`,
    text: `Oi ${name}, você criou conta faz 3 dias. Configure o agente: ${forgeUrl}`,
  };
}

function day6Trial(name: string): TemplateOutput {
  const billingUrl = `${APP_URL.replace(/\/$/, '')}/billing`;
  return {
    subject: 'Seu trial Trato acaba amanhã ⏰',
    html: `<p>${name}, seu trial expira em <24h. Escolha um plano pra continuar atendendo no WhatsApp.</p><p><a href="${billingUrl}">Escolher plano →</a></p><p>- Starter R$ 97 | Pro R$ 297 | Premium R$ 697</p>`,
    text: `${name}, seu trial expira em <24h. Escolha plano: ${billingUrl}`,
  };
}

function activation(name: string, slug: string): TemplateOutput {
  const inboxUrl = `${APP_URL.replace(/\/$/, '')}/inbox`;
  return {
    subject: 'Seu agente Trato está no ar 🎉',
    html: `<p>Parabéns ${name}! O agente do workspace <strong>${slug}</strong> tá respondendo no WhatsApp.</p><p><a href="${inboxUrl}">Ver inbox →</a></p>`,
    text: `Seu agente do workspace ${slug} está ativo! Ver inbox: ${inboxUrl}`,
  };
}

async function sendIfNotSent(input: {
  userId: string;
  email: string;
  templateKey: string;
  tmpl: TemplateOutput;
}): Promise<void> {
  const already = await prisma.emailSent.findUnique({
    where: { userId_templateKey: { userId: input.userId, templateKey: input.templateKey } },
  });
  if (already) return;

  const resend = getResend();
  if (!resend) {
    log.info(
      { userId: input.userId, templateKey: input.templateKey, to: input.email, subject: input.tmpl.subject },
      '[email-dev] enviaria',
    );
    // Persiste mesmo em modo dev pra não spam-rebuildar no log
    await prisma.emailSent.create({
      data: { userId: input.userId, templateKey: input.templateKey, resendId: 'dev-no-op' },
    });
    return;
  }

  try {
    const res = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL ?? 'Trato <noreply@trato.dev>',
      to: [input.email],
      subject: input.tmpl.subject,
      html: input.tmpl.html,
      text: input.tmpl.text,
    });
    if (res.error) {
      log.warn({ templateKey: input.templateKey, err: res.error }, 'resend error');
      return;
    }
    await prisma.emailSent.create({
      data: {
        userId: input.userId,
        templateKey: input.templateKey,
        resendId: res.data?.id ?? null,
      },
    });
    log.info({ userId: input.userId, templateKey: input.templateKey }, 'email sequence enviado');
  } catch (err) {
    log.error({ userId: input.userId, templateKey: input.templateKey, err: String(err) }, 'send falhou');
  }
}

export async function runEmailSequencesSweep(): Promise<{ sent: number }> {
  let sent = 0;

  // ─── day3_forge_nudge ───────────────────────────────────────────────────
  const day3CandidateAt = new Date(Date.now() - 3 * 86_400_000);
  const day3WindowStart = new Date(day3CandidateAt.getTime() - 12 * 3600 * 1000);
  const day3WindowEnd = new Date(day3CandidateAt.getTime() + 12 * 3600 * 1000);

  const day3Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day3WindowStart, lte: day3WindowEnd },
    },
    include: {
      workspaceMembers: {
        include: {
          workspace: {
            include: { agents: { include: { _count: { select: { versions: true } } } } },
          },
        },
        take: 1,
      },
    },
    take: 100,
  });

  for (const u of day3Users) {
    if (!u.email) continue;
    // Forge publicado = agent com pelo menos uma version
    const hasPublished = u.workspaceMembers.some((m) =>
      m.workspace.agents.some((a) => a._count.versions > 0),
    );
    if (hasPublished) continue;

    await sendIfNotSent({
      userId: u.id,
      email: u.email,
      templateKey: 'day3_forge_nudge',
      tmpl: day3Forge(u.name?.split(' ')[0] ?? 'tudo bem?'),
    });
    sent += 1;
  }

  // ─── day6_trial_ending ──────────────────────────────────────────────────
  const tomorrowStart = new Date(Date.now() + 23 * 3600 * 1000);
  const tomorrowEnd = new Date(Date.now() + 25 * 3600 * 1000);

  const day6Users = await prisma.user.findMany({
    where: {
      workspaceMembers: {
        some: {
          workspace: {
            subscription: {
              status: 'TRIALING',
              trialEndsAt: { gte: tomorrowStart, lte: tomorrowEnd },
            },
          },
        },
      },
    },
    take: 100,
  });

  for (const u of day6Users) {
    if (!u.email) continue;
    await sendIfNotSent({
      userId: u.id,
      email: u.email,
      templateKey: 'day6_trial_ending',
      tmpl: day6Trial(u.name?.split(' ')[0] ?? 'olá'),
    });
    sent += 1;
  }

  // ─── activation ─────────────────────────────────────────────────────────
  // Trigger: workspace tem Agent publicado E ao menos 1 Message — convergiu
  const activationCandidates = await prisma.workspace.findMany({
    where: {
      agents: { some: { currentVersionId: { not: null } } },
      messages: { some: {} },
    },
    include: {
      members: {
        where: { role: 'OWNER' },
        include: { user: true },
        take: 1,
      },
    },
    take: 200,
  });

  for (const ws of activationCandidates) {
    const owner = ws.members[0]?.user;
    if (!owner || !owner.email) continue;
    await sendIfNotSent({
      userId: owner.id,
      email: owner.email,
      templateKey: 'activation',
      tmpl: activation(owner.name?.split(' ')[0] ?? '', ws.slug),
    });
    sent += 1;
  }

  return { sent };
}
