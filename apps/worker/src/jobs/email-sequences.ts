/**
 * Email sequence sweep — roda a cada 30min no worker.
 *
 * Identifica usuários que precisam receber:
 *  - day3_forge_nudge: criado há 3 dias e Forge não publicado
 *  - day6_trial_ending: criado há ~6 dias e ainda sem assinatura paga
 *    (workspace INCOMPLETE → agente nunca foi ao ar). Sem trial (ADR-0001):
 *    é um nudge pra assinar, não um aviso de expiração.
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

function day6Activate(name: string): TemplateOutput {
  const billingUrl = `${APP_URL.replace(/\/$/, '')}/billing`;
  return {
    subject: 'Falta pouco pro seu agente Trato ir ao ar 🚀',
    html: `<p>${name}, seu agente está montado mas ainda não atende no WhatsApp. Escolha um plano pra colocar no ar — garantia de 7 dias, não gostou devolvemos.</p><p><a href="${billingUrl}">Escolher plano →</a></p><p>- Starter R$ 97 | Pro R$ 247 | Business R$ 597</p>`,
    text: `${name}, seu agente está montado mas ainda não atende no WhatsApp. Escolha um plano (garantia de 7 dias): ${billingUrl} — Starter R$ 97 | Pro R$ 247 | Business R$ 597`,
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
}): Promise<boolean> {
  const already = await prisma.emailSent.findUnique({
    where: { userId_templateKey: { userId: input.userId, templateKey: input.templateKey } },
  });
  if (already) return false;

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
    return true;
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
      // Falha do Resend é a classe do ERR-0001: sem EmailSent persistido, a
      // janela móvel do sweep pode expirar e o e-mail nunca mais é tentado.
      log.error({ userId: input.userId, templateKey: input.templateKey, err: res.error }, 'resend error — email NÃO enviado');
      return false;
    }
    await prisma.emailSent.create({
      data: {
        userId: input.userId,
        templateKey: input.templateKey,
        resendId: res.data?.id ?? null,
      },
    });
    log.info({ userId: input.userId, templateKey: input.templateKey }, 'email sequence enviado');
    return true;
  } catch (err) {
    log.error({ userId: input.userId, templateKey: input.templateKey, err: String(err) }, 'send falhou');
    return false;
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

    const ok = await sendIfNotSent({
      userId: u.id,
      email: u.email,
      templateKey: 'day3_forge_nudge',
      tmpl: day3Forge(u.name?.split(' ')[0] ?? 'tudo bem?'),
    });
    if (ok) sent += 1;
  }

  // ─── day6_trial_ending (nudge pra assinar — sem trial, ADR-0001) ─────────
  // Sem trial: o workspace nasce INCOMPLETE e o agente só atende no WhatsApp
  // quando vira ACTIVE. Aos ~6 dias do signup, quem ainda está INCOMPLETE
  // (nunca assinou) recebe um empurrãozinho. Janela móvel em torno de D+6,
  // espelhando o sweep de day3 (chave: User.createdAt).
  const day6CandidateAt = new Date(Date.now() - 6 * 86_400_000);
  const day6WindowStart = new Date(day6CandidateAt.getTime() - 12 * 3600 * 1000);
  const day6WindowEnd = new Date(day6CandidateAt.getTime() + 12 * 3600 * 1000);

  const day6Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day6WindowStart, lte: day6WindowEnd },
      workspaceMembers: {
        some: {
          workspace: {
            subscription: { status: 'INCOMPLETE' },
          },
        },
      },
    },
    take: 100,
  });

  for (const u of day6Users) {
    if (!u.email) continue;
    const ok = await sendIfNotSent({
      userId: u.id,
      email: u.email,
      templateKey: 'day6_trial_ending',
      tmpl: day6Activate(u.name?.split(' ')[0] ?? 'olá'),
    });
    if (ok) sent += 1;
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
    const ok = await sendIfNotSent({
      userId: owner.id,
      email: owner.email,
      templateKey: 'activation',
      tmpl: activation(owner.name?.split(' ')[0] ?? '', ws.slug),
    });
    if (ok) sent += 1;
  }

  return { sent };
}
