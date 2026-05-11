import Link from 'next/link';

import { LegalDt, LegalList, LegalPage, LegalSection } from '@/components/marketing/legal';

export const metadata = {
  title: 'Política de privacidade',
  description: 'Como o ZapAI coleta, usa e protege dados pessoais — conforme LGPD.',
};

const TOC = [
  { id: 'quem-somos', label: 'Quem somos' },
  { id: 'dados-coletados', label: 'Dados que coletamos' },
  { id: 'finalidades', label: 'Finalidades' },
  { id: 'base-legal', label: 'Base legal' },
  { id: 'compartilhamento', label: 'Compartilhamento' },
  { id: 'sub-operadores', label: 'Sub-operadores' },
  { id: 'retencao', label: 'Retenção' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'direitos', label: 'Seus direitos' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'transferencia-internacional', label: 'Transferência internacional' },
  { id: 'criancas', label: 'Crianças e adolescentes' },
  { id: 'alteracoes', label: 'Alterações' },
  { id: 'contato', label: 'Contato e DPO' },
];

export default function PrivacidadePage() {
  return (
    <LegalPage
      eyebrow="Privacidade"
      title="Como tratamos"
      emphasis="seus dados."
      lastUpdated="11 de maio de 2026"
      toc={TOC}
    >
      <p className="text-lg leading-relaxed text-muted-foreground">
        Esta Política de Privacidade descreve como o ZapAI coleta, usa, compartilha e protege
        dados pessoais. Está em conformidade com a Lei Geral de Proteção de Dados Pessoais
        (Lei nº 13.709/2018 — LGPD) e demais regulamentações aplicáveis.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Esta política trata de <LegalDt>dois grupos</LegalDt> de titulares: (a){' '}
        <LegalDt>clientes do ZapAI</LegalDt> (você que contrata a plataforma) e (b){' '}
        <LegalDt>contatos finais dos clientes</LegalDt> (pessoas que conversam com o agente IA
        no WhatsApp). Em (b), o ZapAI atua como{' '}
        <LegalDt>operador</LegalDt> dos dados — o cliente é o controlador.
      </p>

      <div className="mt-12 space-y-2">
        <LegalSection id="quem-somos" number={1} title="Quem somos">
          <p>
            ZapAI é uma plataforma SaaS operada por <LegalDt>[Razão Social]</LegalDt>, CNPJ{' '}
            <LegalDt>[CNPJ]</LegalDt>. Encarregado de Proteção de Dados (DPO):{' '}
            <LegalDt>[Nome do DPO a ser nomeado]</LegalDt> —{' '}
            <a href="mailto:dpo@zapai.dev" className="text-foreground underline-offset-4 hover:underline">
              dpo@zapai.dev
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection id="dados-coletados" number={2} title="Dados que coletamos">
          <p>
            <LegalDt>Cliente ZapAI (controlador):</LegalDt>
          </p>
          <LegalList>
            <li>Identificação: nome, e-mail, foto de perfil (OAuth Google), idioma preferido.</li>
            <li>Autenticação: hash de senha (bcrypt/argon2), sessões, tokens OAuth.</li>
            <li>Workspace: nome, slug, plano contratado, dados de pagamento via Stripe (não armazenamos cartão).</li>
            <li>Operacionais: logs de acesso, IP, user-agent, audit log de ações sensíveis.</li>
            <li>Configurações do Agente: system prompts, personalidade, tools ativas, base de conhecimento, regras de handoff.</li>
          </LegalList>
          <p className="pt-2">
            <LegalDt>Contato final do cliente (titular):</LegalDt>
          </p>
          <LegalList>
            <li>Número de telefone (E.164), nome (se fornecido pelo WhatsApp).</li>
            <li>Conteúdo das mensagens trocadas com o Agente (texto, mídias, status).</li>
            <li>Tags, campos customizados que o cliente atribuir.</li>
            <li>Metadados: timestamp, status de leitura, tipo de mensagem.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="finalidades" number={3} title="Finalidades do tratamento">
          <LegalList>
            <li>Prestar o serviço contratado (criar conta, atender o cliente final, etc.).</li>
            <li>Faturamento, cobrança e prevenção a fraude.</li>
            <li>Comunicação de produto (notificações operacionais, alertas).</li>
            <li>Cumprir obrigações legais, regulatórias e judiciais.</li>
            <li>Melhorar a plataforma (analytics agregado, métricas de uso).</li>
          </LegalList>
          <p>
            <LegalDt>Nunca</LegalDt> usamos conversas dos contatos finais para treinar modelos
            de IA, vender dados, ou marketing. Os modelos externos (Anthropic, etc.) são
            chamados com flag de no-training quando disponível.
          </p>
        </LegalSection>

        <LegalSection id="base-legal" number={4} title="Base legal (LGPD art. 7º e 11º)">
          <LegalList>
            <li>
              <LegalDt>Execução de contrato</LegalDt> (art. 7º, V) — entregar o serviço ao Cliente.
            </li>
            <li>
              <LegalDt>Cumprimento de obrigação legal</LegalDt> (art. 7º, II) — fiscal,
              contábil, antifraude.
            </li>
            <li>
              <LegalDt>Legítimo interesse</LegalDt> (art. 7º, IX) — métricas de produto agregadas,
              segurança da plataforma.
            </li>
            <li>
              <LegalDt>Consentimento</LegalDt> (art. 7º, I) — quando aplicável, especialmente para
              cookies analíticos não essenciais.
            </li>
            <li>
              Para os <LegalDt>contatos finais</LegalDt>, a base legal é definida pelo Cliente
              controlador. Tipicamente: consentimento (mensagem ativa de marketing), execução de
              contrato (cliente pedindo informação), ou legítimo interesse.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="compartilhamento" number={5} title="Com quem compartilhamos">
          <p>
            Não vendemos dados. Compartilhamos com sub-operadores estritamente necessários para
            entregar o serviço, todos com obrigações contratuais de confidencialidade e segurança.
          </p>
        </LegalSection>

        <LegalSection id="sub-operadores" number={6} title="Sub-operadores">
          <LegalList>
            <li>
              <LegalDt>Meta Platforms, Inc.</LegalDt> — WhatsApp Cloud API. Mensagens passam pelos
              servidores da Meta para entrega.
            </li>
            <li>
              <LegalDt>Anthropic, PBC</LegalDt> — provedor dos modelos Claude para o Agente e Forge.
              No-training habilitado.
            </li>
            <li>
              <LegalDt>Voyage AI</LegalDt> — embeddings semânticos para RAG.
            </li>
            <li>
              <LegalDt>Stripe Payments</LegalDt> — processamento de cobranças.
            </li>
            <li>
              <LegalDt>Neon</LegalDt> — banco de dados Postgres gerenciado.
            </li>
            <li>
              <LegalDt>Upstash</LegalDt> — Redis gerenciado para filas e cache.
            </li>
            <li>
              <LegalDt>Pusher</LegalDt> — canais real-time para o inbox.
            </li>
            <li>
              <LegalDt>UploadThing</LegalDt> — armazenamento de arquivos.
            </li>
            <li>
              <LegalDt>Resend</LegalDt> — e-mails transacionais.
            </li>
            <li>
              <LegalDt>Sentry, PostHog</LegalDt> — observabilidade e métricas de produto.
            </li>
            <li>
              <LegalDt>Vercel, Railway</LegalDt> — hospedagem das aplicações.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="retencao" number={7} title="Retenção e descarte">
          <LegalList>
            <li>Dados de conta: enquanto a conta estiver ativa + 30 dias após cancelamento.</li>
            <li>
              Mensagens e conversas: enquanto o workspace estiver ativo. Cliente pode pedir
              eliminação imediata via endpoint LGPD ou suporte.
            </li>
            <li>
              Logs de auditoria: 12 meses (obrigação legal de demonstração de compliance).
            </li>
            <li>
              Faturamento: pelo prazo da legislação fiscal aplicável (mínimo 5 anos).
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="seguranca" number={8} title="Segurança da informação">
          <LegalList>
            <li>
              Tokens da Meta cifrados em repouso com <LegalDt>AES-256-GCM</LegalDt> com chave única
              por workspace.
            </li>
            <li>TDE (Transparent Data Encryption) no banco de dados gerenciado.</li>
            <li>TLS 1.2+ em todo tráfego (HTTPS).</li>
            <li>
              Multi-tenant com <LegalDt>RLS na app layer</LegalDt> — toda query do Prisma é
              escopada por workspaceId.
            </li>
            <li>Rate limiting em endpoints públicos.</li>
            <li>Logs estruturados sem PII em texto plano (telefone hasheado com sal).</li>
            <li>Audit log de todas as ações administrativas críticas.</li>
          </LegalList>
          <p>
            Em caso de incidente de segurança, comunicaremos a ANPD e os titulares afetados em
            prazo razoável, conforme art. 48 da LGPD.
          </p>
        </LegalSection>

        <LegalSection id="direitos" number={9} title="Seus direitos como titular (LGPD art. 18)">
          <LegalList>
            <li>Confirmar a existência de tratamento.</li>
            <li>Acessar os dados que temos sobre você.</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
            <li>
              Pedir anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou
              tratados em desconformidade com a LGPD.
            </li>
            <li>Solicitar portabilidade dos dados.</li>
            <li>
              Eliminar dados pessoais tratados com consentimento (salvo retenção legal
              obrigatória).
            </li>
            <li>Revogar consentimento.</li>
            <li>Opor-se ao tratamento.</li>
          </LegalList>
          <p>
            Veja{' '}
            <Link href="/lgpd" className="text-foreground underline-offset-4 hover:underline">
              /lgpd
            </Link>{' '}
            para instruções práticas (endpoints, formulários, prazos).
          </p>
        </LegalSection>

        <LegalSection id="cookies" number={10} title="Cookies">
          <p>Usamos cookies estritamente necessários para:</p>
          <LegalList>
            <li>
              <LegalDt>Autenticação:</LegalDt> manter sessão logada (HttpOnly, Secure,
              SameSite=Lax).
            </li>
            <li>
              <LegalDt>CSRF:</LegalDt> proteção contra falsificação de requisição.
            </li>
            <li>
              <LegalDt>Tema:</LegalDt> lembrar preferência claro/escuro (não rastreia).
            </li>
          </LegalList>
          <p>
            Cookies analíticos (PostHog) são <LegalDt>opt-in</LegalDt> e respeitam Do Not Track.
            Não usamos cookies de publicidade.
          </p>
        </LegalSection>

        <LegalSection id="transferencia-internacional" number={11} title="Transferência internacional">
          <p>
            Alguns sub-operadores (Anthropic, Stripe, Vercel, etc.) estão sediados fora do Brasil
            (EUA, principalmente). A transferência ocorre com base no art. 33 da LGPD —
            normalmente cláusulas contratuais padrão e níveis equivalentes de proteção. Sempre
            que possível, usamos regiões mais próximas (us-east) para minimizar latência.
          </p>
        </LegalSection>

        <LegalSection id="criancas" number={12} title="Crianças e adolescentes">
          <p>
            O ZapAI não é dirigido a menores de 18 anos como Clientes da plataforma. Em relação a
            contatos finais, o tratamento de dados de crianças e adolescentes é de responsabilidade
            do Cliente controlador, que deve obter consentimento específico dos responsáveis
            legais quando aplicável (art. 14 da LGPD).
          </p>
        </LegalSection>

        <LegalSection id="alteracoes" number={13} title="Alterações nesta política">
          <p>
            Podemos atualizar esta política periodicamente. Alterações materiais serão comunicadas
            com pelo menos 15 dias de antecedência. A data da última atualização está no topo
            desta página.
          </p>
        </LegalSection>

        <LegalSection id="contato" number={14} title="Contato e DPO">
          <p>
            Para exercer seus direitos, esclarecer dúvidas sobre tratamento de dados, ou notificar
            incidentes, escreva para o DPO em{' '}
            <a href="mailto:dpo@zapai.dev" className="text-foreground underline-offset-4 hover:underline">
              dpo@zapai.dev
            </a>
            .
          </p>
          <p>
            Você também pode reclamar diretamente à ANPD (Autoridade Nacional de Proteção de
            Dados): <a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer" className="text-foreground underline-offset-4 hover:underline">www.gov.br/anpd</a>.
          </p>
        </LegalSection>
      </div>
    </LegalPage>
  );
}
