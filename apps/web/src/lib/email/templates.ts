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
  background-color: #60A5FA;
  color: #ffffff;
  text-decoration: none;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: 8px;
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
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#60A5FA;vertical-align:middle;margin-right:8px"></span>
        Orbe
      </div>
      ${inner}
      <div style="${FOOTER_STYLES}">
        Orbe · O WhatsApp da sua empresa, com cérebro próprio.<br/>
        Não esperava esse email? <a href="mailto:oi@Orbe.dev" style="color:#60A5FA">avisa pra gente</a>.
      </div>
    </div>
  </div>
</body></html>`;
}

export function magicLinkEmail(input: { url: string; email: string }) {
  const html = wrap(`
    <h1 style="font-size:24px;margin:24px 0 8px;color:#18181b">Seu link de acesso</h1>
    <p>Oi! Clique no botão abaixo pra entrar no Orbe. O link expira em 5 minutos.</p>
    <a href="${input.url}" style="${BUTTON_STYLES}">Entrar no Orbe</a>
    <p style="color:#71717a;font-size:13px">Se o botão não funcionar, copia e cola essa URL no navegador:</p>
    <p style="word-break:break-all;font-family:monospace;font-size:12px;background:#f4f4f5;padding:8px;border-radius:6px">${input.url}</p>
    <p style="color:#71717a;font-size:13px;margin-top:24px">Se você não pediu esse link, pode ignorar este email — ele expira sozinho.</p>
  `);
  const text = `Entre no Orbe: ${input.url}\n\nO link expira em 5 minutos. Se não foi você, ignore.`;
  return { html, text, subject: 'Seu link de acesso ao Orbe' };
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
    <p style="color:#71717a;font-size:13px">Ou se preferir, vai direto pro <a href="${dashboardUrl}" style="color:#60A5FA">dashboard</a>.</p>
    <p style="margin-top:32px">Qualquer dúvida, responde esse email. A gente lê.</p>
    <p style="color:#71717a;font-size:13px">— Time Orbe</p>
  `);
  const text = `Bem-vindo, ${input.name}!\n\nSeu workspace "${input.workspaceSlug}" tá pronto. 7 dias de trial sem cartão.\n\nPróximos passos:\n1. Converse com o Forge: ${forgeUrl}\n2. Conecte seu WhatsApp Business via Cloud API.\n3. Comece a atender 24/7.\n\n— Time Orbe`;
  return { html, text, subject: `Bem-vindo ao Orbe, ${input.name}` };
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
      <tr><td style="padding:6px 0;color:#71717a">E-mail:</td><td><a href="mailto:${escapeHtml(input.email)}" style="color:#60A5FA">${escapeHtml(input.email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#71717a">Assunto:</td><td>${escapeHtml(input.subject)}</td></tr>
    </table>
    <div style="border-left:3px solid #60A5FA;padding:12px 16px;background:#f4f4f5;margin:16px 0;white-space:pre-wrap">${escapeHtml(input.message)}</div>
    <p style="color:#71717a;font-size:13px">Responda direto pelo Reply-To deste email.</p>
  `);
  const text = `Novo contato:\n\nNome: ${input.name}\nE-mail: ${input.email}\nAssunto: ${input.subject}\n\n---\n${input.message}`;
  return { html, text, subject: `[Orbe Contato] ${input.subject}` };
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
  const text = `Redefinir senha do Orbe: ${input.url}\n\nLink expira em 1 hora. Se não foi você, ignore.`;
  return { html, text, subject: 'Redefinir sua senha do Orbe' };
}

export function teamInviteEmail(input: {
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
  recipientEmail: string;
}) {
  const html = wrap(`
    <h1 style="font-size:24px;margin:24px 0 8px">Você foi convidado</h1>
    <p><strong>${escapeHtml(input.inviterName)}</strong> convidou você pra entrar no workspace <strong>${escapeHtml(input.workspaceName)}</strong> no Orbe.</p>
    <a href="${input.inviteUrl}" style="${BUTTON_STYLES}">Aceitar convite</a>
    <p style="color:#71717a;font-size:13px">O convite expira em 7 dias.</p>
    <p style="color:#71717a;font-size:13px">Se você não conhece quem te convidou, pode ignorar este email.</p>
  `);
  const text = `${input.inviterName} te convidou pro workspace "${input.workspaceName}" no Orbe.\n\nAceitar: ${input.inviteUrl}\n\nO convite expira em 7 dias.`;
  return { html, text, subject: `${input.inviterName} te convidou pro Orbe` };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
