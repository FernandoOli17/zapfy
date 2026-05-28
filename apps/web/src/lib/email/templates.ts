import 'server-only';

/**
 * Templates de email em HTML inline-style (compatível com clientes
 * antigos como Outlook). Sem CSS externo. Dark-friendly via cores
 * fixas. Tipografia simples (sans).
 */

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #18181b;
  line-height: 1.6;
`;

const CONTAINER_STYLES = `
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 24px;
`;

const HEADER_STYLES = `
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #18181b;
`;

const BUTTON_STYLES = `
  display: inline-block;
  background-color: #00E676;
  color: #0a0a0a;
  text-decoration: none;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 999px;
  margin: 20px 0;
`;

const FOOTER_STYLES = `
  border-top: 1px solid #e4e4e7;
  margin-top: 32px;
  padding-top: 20px;
  font-size: 12px;
  color: #71717a;
`;

function wrap(inner: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;background-color:#fafafa">
  <div style="${BASE_STYLES}">
    <div style="${CONTAINER_STYLES}">
      <div style="${HEADER_STYLES}; padding-bottom: 12px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#00E676;vertical-align:middle;margin-right:8px"></span>
        Zapfy
      </div>
      ${inner}
      <div style="${FOOTER_STYLES}">
        Zapfy · Agente IA para WhatsApp.<br/>
        Não esperava esse email? <a href="mailto:supportezapfy@gmail.com" style="color:#00E676">avisa pra gente</a>.
      </div>
    </div>
  </div>
</body></html>`;
}

export function magicLinkEmail(input: { url: string; email: string }) {
  const html = wrap(`
    <h1 style="font-size:24px;margin:24px 0 8px;color:#18181b">Seu link de acesso</h1>
    <p>Oi! Clique no botão abaixo pra entrar no Zapfy. O link expira em 5 minutos.</p>
    <a href="${input.url}" style="${BUTTON_STYLES}">Entrar no Zapfy</a>
    <p style="color:#71717a;font-size:13px">Se o botão não funcionar, copia e cola essa URL no navegador:</p>
    <p style="word-break:break-all;font-family:monospace;font-size:12px;background:#f4f4f5;padding:8px;border-radius:6px">${input.url}</p>
    <p style="color:#71717a;font-size:13px;margin-top:24px">Se você não pediu esse link, pode ignorar este email — ele expira sozinho.</p>
  `);
  const text = `Entre no Zapfy: ${input.url}\n\nO link expira em 5 minutos. Se não foi você, ignore.`;
  return { html, text, subject: 'Seu link de acesso ao Zapfy' };
}

export function welcomeEmail(input: { name: string; workspaceSlug: string; appUrl: string }) {
  const dashboardUrl = `${input.appUrl.replace(/\/$/, '')}/dashboard`;
  const forgeUrl = `${input.appUrl.replace(/\/$/, '')}/forge`;
  const html = wrap(`
    <h1 style="font-size:24px;margin:24px 0 8px">Bem-vindo, ${escapeHtml(input.name)}</h1>
    <p>Seu workspace <strong>${escapeHtml(input.workspaceSlug)}</strong> tá pronto. 7 dias de trial sem cartão.</p>
    <p>Próximos passos:</p>
    <ol style="padding-left: 20px">
      <li>Converse com o <strong>Forge</strong> — ele entrevista seu negócio e monta o agente IA.</li>
      <li>Conecte seu <strong>WhatsApp Business</strong> via Cloud API oficial da Meta.</li>
      <li>Comece a atender 24/7.</li>
    </ol>
    <a href="${forgeUrl}" style="${BUTTON_STYLES}">Abrir o Forge</a>
    <p style="color:#71717a;font-size:13px">Ou se preferir, vai direto pro <a href="${dashboardUrl}" style="color:#00E676">dashboard</a>.</p>
    <p style="margin-top:32px">Qualquer dúvida, responde esse email. A gente lê.</p>
    <p style="color:#71717a;font-size:13px">— Time Zapfy</p>
  `);
  const text = `Bem-vindo, ${input.name}!\n\nSeu workspace "${input.workspaceSlug}" tá pronto. 7 dias de trial sem cartão.\n\nPróximos passos:\n1. Converse com o Forge: ${forgeUrl}\n2. Conecte seu WhatsApp Business via Cloud API.\n3. Comece a atender 24/7.\n\n— Time Zapfy`;
  return { html, text, subject: `Bem-vindo ao Zapfy, ${input.name}` };
}

export function contactNotificationEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const html = wrap(`
    <h1 style="font-size:20px;margin:24px 0 8px">Novo contato pelo site</h1>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#71717a;width:80px">Nome:</td><td>${escapeHtml(input.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a">E-mail:</td><td><a href="mailto:${escapeHtml(input.email)}" style="color:#00E676">${escapeHtml(input.email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#71717a">Assunto:</td><td>${escapeHtml(input.subject)}</td></tr>
    </table>
    <div style="border-left:3px solid #00E676;padding:12px 16px;background:#f4f4f5;margin:16px 0;white-space:pre-wrap">${escapeHtml(input.message)}</div>
    <p style="color:#71717a;font-size:13px">Responda direto pelo Reply-To deste email.</p>
  `);
  const text = `Novo contato:\n\nNome: ${input.name}\nE-mail: ${input.email}\nAssunto: ${input.subject}\n\n---\n${input.message}`;
  return { html, text, subject: `[Zapfy Contato] ${input.subject}` };
}

export function passwordResetEmail(input: { url: string; email: string }) {
  const html = wrap(`
    <h1 style="font-size:24px;margin:24px 0 8px;color:#18181b">Redefinir sua senha</h1>
    <p>Recebemos pedido pra redefinir a senha de <strong>${escapeHtml(input.email)}</strong>.</p>
    <a href="${input.url}" style="${BUTTON_STYLES}">Definir nova senha</a>
    <p style="color:#71717a;font-size:13px">Link expira em 1 hora. Se o botão não funcionar, copia e cola:</p>
    <p style="word-break:break-all;font-family:monospace;font-size:12px;background:#f4f4f5;padding:8px;border-radius:6px">${input.url}</p>
    <p style="color:#71717a;font-size:13px;margin-top:24px">Se você não pediu, pode ignorar — a senha atual continua válida.</p>
  `);
  const text = `Redefinir senha do Zapfy: ${input.url}\n\nLink expira em 1 hora. Se não foi você, ignore.`;
  return { html, text, subject: 'Redefinir sua senha do Zapfy' };
}

export function teamInviteEmail(input: {
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
  recipientEmail: string;
}) {
  const html = wrap(`
    <h1 style="font-size:24px;margin:24px 0 8px">Você foi convidado</h1>
    <p><strong>${escapeHtml(input.inviterName)}</strong> convidou você pra entrar no workspace <strong>${escapeHtml(input.workspaceName)}</strong> no Zapfy.</p>
    <a href="${input.inviteUrl}" style="${BUTTON_STYLES}">Aceitar convite</a>
    <p style="color:#71717a;font-size:13px">O convite expira em 7 dias.</p>
    <p style="color:#71717a;font-size:13px">Se você não conhece quem te convidou, pode ignorar este email.</p>
  `);
  const text = `${input.inviterName} te convidou pro workspace "${input.workspaceName}" no Zapfy.\n\nAceitar: ${input.inviteUrl}\n\nO convite expira em 7 dias.`;
  return { html, text, subject: `${input.inviterName} te convidou pro Zapfy` };
}

/**
 * Day 3 — usuário não completou o Forge ainda. Nudge gentil.
 */
export function day3ForgeNudgeEmail(input: { name: string; appUrl: string }) {
  const forgeUrl = `${input.appUrl.replace(/\/$/, '')}/forge`;
  const html = wrap(`
    <h1 style="font-size:24px;margin:24px 0 8px">Já criou seu agente, ${escapeHtml(input.name)}?</h1>
    <p>Você criou sua conta no Zapfy faz 3 dias e ainda não terminou de configurar o agente IA.</p>
    <p>O <strong>Forge</strong> faz isso em 5 minutos conversando — você só responde 6 perguntas (vertical, tom, horário, etc.) e ele monta o agente.</p>
    <a href="${forgeUrl}" style="${BUTTON_STYLES}">Configurar agora</a>
    <p style="color:#71717a;font-size:13px;margin-top:24px">Travou em alguma parte? Responde esse email contando e a gente resolve junto.</p>
    <p style="color:#71717a;font-size:13px">— Time Zapfy</p>
  `);
  const text = `Já criou seu agente, ${input.name}?\n\nVocê criou sua conta faz 3 dias e ainda não terminou. O Forge faz isso em 5 minutos conversando.\n\nConfigurar: ${forgeUrl}\n\nTravou em algo? Responde esse email.\n\n— Time Zapfy`;
  return { html, text, subject: `Faltam 5min pro seu agente IA estar no ar 🤖` };
}

/**
 * Day 6 — trial acaba amanhã. Mostra plano + CTA pra upgrade.
 */
export function day6TrialEndingEmail(input: { name: string; appUrl: string }) {
  const billingUrl = `${input.appUrl.replace(/\/$/, '')}/billing`;
  const html = wrap(`
    <h1 style="font-size:24px;margin:24px 0 8px">Seu trial acaba amanhã, ${escapeHtml(input.name)}</h1>
    <p>Você tá usando o Zapfy faz 6 dias. <strong>Amanhã o trial expira</strong> e você precisa escolher um plano pra continuar atendendo no WhatsApp.</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <tr>
        <td style="padding:12px;border:1px solid #e4e4e7;border-radius:8px;background:#fafafa">
          <strong style="font-size:16px">Starter — R$ 97/mês</strong><br/>
          <span style="color:#71717a;font-size:13px">1.000 conversas IA/mês · 1 número WhatsApp · 1 atendente</span>
        </td>
      </tr>
      <tr><td style="padding:4px"></td></tr>
      <tr>
        <td style="padding:12px;border:2px solid #00E676;border-radius:8px;background:#0a0a0a0d">
          <strong style="font-size:16px;color:#0a0a0a">Pro — R$ 297/mês</strong> <span style="background:#00E676;color:white;padding:2px 6px;border-radius:4px;font-size:10px;text-transform:uppercase">recomendado</span><br/>
          <span style="color:#3b3b3f;font-size:13px">10.000 conversas IA · 3 números · 5 atendentes · Custom tools · Broadcasts</span>
        </td>
      </tr>
      <tr><td style="padding:4px"></td></tr>
      <tr>
        <td style="padding:12px;border:1px solid #e4e4e7;border-radius:8px;background:#fafafa">
          <strong style="font-size:16px">Premium — R$ 697/mês</strong><br/>
          <span style="color:#71717a;font-size:13px">Ilimitado · API access · Suporte prioritário</span>
        </td>
      </tr>
    </table>

    <a href="${billingUrl}" style="${BUTTON_STYLES}">Escolher plano</a>
    <p style="color:#71717a;font-size:13px;margin-top:24px">Não quer continuar? Tudo bem — sua conta vira modo limitado (read-only) em 24h. Pode reativar quando quiser.</p>
  `);
  const text = `Seu trial acaba amanhã, ${input.name}.\n\nEscolha um plano em ${billingUrl}\n\n- Starter R$ 97 — 1k conversas, 1 número\n- Pro R$ 297 — 10k conversas, 3 números, custom tools\n- Premium R$ 697 — ilimitado\n\nSem upgrade, conta vai pra modo read-only.\n\n— Time Zapfy`;
  return { html, text, subject: 'Seu trial Zapfy acaba amanhã ⏰' };
}

/**
 * Onboarding concluído — agente publicado, WhatsApp conectado.
 */
export function activationEmail(input: { name: string; workspaceSlug: string; appUrl: string }) {
  const inboxUrl = `${input.appUrl.replace(/\/$/, '')}/inbox`;
  const analyticsUrl = `${input.appUrl.replace(/\/$/, '')}/analytics`;
  const html = wrap(`
    <h1 style="font-size:28px;margin:24px 0 8px">Seu agente está no ar 🎉</h1>
    <p>Parabéns, ${escapeHtml(input.name)}. Você acabou de ativar o agente IA do workspace <strong>${escapeHtml(input.workspaceSlug)}</strong>.</p>
    <p>A partir de agora, toda mensagem que chegar no seu número WhatsApp será respondida pelo agente em segundos. Sem tempo de espera. Sem perder cliente fora do horário.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0">
      <p style="margin:0;font-weight:600;color:#15803d">✓ Próximos passos opcionais</p>
      <ul style="margin:8px 0 0;padding-left:20px;color:#15803d;font-size:14px">
        <li>Suba documentos pra base de conhecimento (RAG)</li>
        <li>Convide seu time pra fazer handoff humano</li>
        <li>Configure templates HSM pra envio ativo</li>
      </ul>
    </div>

    <a href="${inboxUrl}" style="${BUTTON_STYLES}">Ver Inbox ao vivo</a>
    <p style="color:#71717a;font-size:13px">Ou acompanhe métricas em <a href="${analyticsUrl}" style="color:#00E676">analytics</a>.</p>
    <p style="margin-top:32px;color:#71717a;font-size:13px">— Time Zapfy</p>
  `);
  const text = `Seu agente está no ar! 🎉\n\nParabéns, ${input.name}. O workspace "${input.workspaceSlug}" tá ativo.\n\nVer inbox: ${inboxUrl}\nAnalytics: ${analyticsUrl}\n\nPróximos passos:\n- Subir documentos pra RAG\n- Convidar time pra handoff\n- Configurar templates HSM\n\n— Time Zapfy`;
  return { html, text, subject: 'Seu agente Zapfy está no ar 🎉' };
}

/**
 * Email de verificação de novo dispositivo / IP.
 *
 * Dispara quando o user faz login de um IP nunca visto antes pra essa
 * conta (heurística simples: comparar request IP com a tabela de
 * `KnownDevice`/`Session.ipAddress` históricos do user). O email manda
 * o link de aprovação + código curto pra digitar na própria página.
 *
 * Tom: amigável, sem alarme exagerado — não queremos assustar o user
 * legítimo viajando, mas damos a saída clara se for tentativa de
 * invasão.
 */
export function newDeviceVerificationEmail(input: {
  name: string;
  ip: string;
  /** Cidade/região resolvida do IP — opcional. Ex: "São Paulo, BR". */
  location?: string;
  device: string;
  /** Hora do acesso em horário do user. */
  timestampLabel: string;
  /** Link que valida + libera a sessão. */
  verifyUrl: string;
  /** Código curto (6 dígitos) que o user pode digitar manualmente. */
  code: string;
  /** Link pra invalidar a sessão se não foi o user. */
  revokeUrl: string;
}) {
  const safeIp = escapeHtml(input.ip);
  const safeDevice = escapeHtml(input.device);
  const safeLocation = input.location ? escapeHtml(input.location) : null;
  const safeName = escapeHtml(input.name);
  const safeCode = escapeHtml(input.code);
  const safeTimestamp = escapeHtml(input.timestampLabel);

  const html = wrap(`
    <h1 style="font-size:24px;margin:24px 0 8px;color:#18181b">
      Olá, ${safeName} 👋
    </h1>
    <p>
      A gente detectou um <strong>acesso novo</strong> à sua conta Zapfy
      a partir de um dispositivo que nunca vimos antes. Pra manter sua
      conta segura, precisamos confirmar que foi você.
    </p>

    <div style="margin:24px 0;padding:16px;background-color:#fafafa;border:1px solid #e4e4e7;border-radius:12px">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Detalhes do acesso</p>
      <p style="margin:8px 0 4px;font-size:14px"><strong>📍 Local:</strong> ${safeLocation ?? 'não identificado'}</p>
      <p style="margin:4px 0;font-size:14px"><strong>🌐 IP:</strong> <span style="font-family:monospace">${safeIp}</span></p>
      <p style="margin:4px 0;font-size:14px"><strong>💻 Dispositivo:</strong> ${safeDevice}</p>
      <p style="margin:4px 0;font-size:14px"><strong>🕒 Quando:</strong> ${safeTimestamp}</p>
    </div>

    <p style="margin-top:24px"><strong>Foi você?</strong> Clica no botão pra liberar essa sessão:</p>
    <a href="${input.verifyUrl}" style="${BUTTON_STYLES}">Sim, fui eu — liberar acesso</a>

    <p style="color:#71717a;font-size:13px;margin-top:16px">Ou digita esse código de 6 dígitos na tela que abriu:</p>
    <p style="font-family:monospace;font-size:28px;font-weight:700;letter-spacing:8px;color:#0a0a0a;background:#f4f4f5;padding:16px;border-radius:8px;text-align:center;margin:8px 0">${safeCode}</p>
    <p style="color:#71717a;font-size:12px;margin:0">O código expira em 10 minutos.</p>

    <div style="margin:32px 0;padding:16px;background-color:#fef2f2;border:1px solid #fee2e2;border-radius:12px">
      <p style="margin:0;font-size:14px;color:#991b1b">
        <strong>Não foi você?</strong> Sua senha pode ter vazado.
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:#7f1d1d">
        Clica aqui pra <a href="${input.revokeUrl}" style="color:#dc2626;font-weight:600">bloquear esse acesso e trocar a senha</a> agora.
      </p>
    </div>

    <p style="color:#71717a;font-size:12px;margin-top:24px">
      Mandamos esse aviso toda vez que detectamos um IP/dispositivo novo —
      é normal receber se você está viajando, trocou de internet ou está
      em outro computador. Se reconhece o acesso, é só clicar no botão
      verde acima e seguir trabalhando. 💚
    </p>
  `);

  const text = `Olá, ${input.name}!

Detectamos um acesso novo à sua conta Zapfy:

📍 Local: ${input.location ?? 'não identificado'}
🌐 IP: ${input.ip}
💻 Dispositivo: ${input.device}
🕒 Quando: ${input.timestampLabel}

FOI VOCÊ?
Libere o acesso aqui: ${input.verifyUrl}

Ou digite esse código de 6 dígitos na tela aberta:
${input.code}
(expira em 10 min)

NÃO FOI VOCÊ?
Bloqueie e troque a senha: ${input.revokeUrl}

Esse aviso é automático — toda vez que detectamos IP/dispositivo
novo a gente confere com você. Se está viajando ou em outro PC,
é só confirmar e seguir. 💚

— Time Zapfy`;

  return {
    html,
    text,
    subject: '🔐 Novo acesso na sua conta Zapfy — confirme que foi você',
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
