import Link from 'next/link';
import { ArrowRight, Download, ShieldCheck, Trash2, UserX } from 'lucide-react';

import { LegalDt, LegalList, LegalPage, LegalSection } from '@/components/marketing/legal';

export const metadata = {
  title: 'LGPD',
  description: 'Como o Zapfy cumpre a Lei Geral de Proteção de Dados. DPO, direitos do titular, endpoints práticos.',
};

const TOC = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'controlador-operador', label: 'Controlador x operador' },
  { id: 'direitos-titular', label: 'Direitos do titular' },
  { id: 'como-exercer', label: 'Como exercer' },
  { id: 'endpoints', label: 'Endpoints LGPD' },
  { id: 'dpo', label: 'Encarregado (DPO)' },
  { id: 'dpa', label: 'DPA (acordo)' },
  { id: 'sub-operadores', label: 'Sub-operadores' },
  { id: 'incidentes', label: 'Incidentes' },
  { id: 'anpd', label: 'ANPD' },
];

const RIGHTS = [
  {
    icon: Download,
    title: 'Exportar seus dados',
    description: 'Receba um JSON com todos os seus dados pessoais — perfil, configurações, conversas. Em até 15 dias.',
    endpoint: 'POST /api/lgpd/export',
  },
  {
    icon: Trash2,
    title: 'Apagar sua conta',
    description: 'Solicita exclusão completa. Soft delete imediato + hard delete em 30 dias (período de reversão).',
    endpoint: 'POST /api/lgpd/delete',
  },
  {
    icon: UserX,
    title: 'Não me contate (opt-out)',
    description: 'Marca um contato final como "não contatar". O Agente nunca mais envia mensagem ativa pra ele.',
    endpoint: 'POST /api/lgpd/opt-out',
  },
];

export default function LgpdPage() {
  return (
    <LegalPage
      eyebrow="LGPD"
      title="Seus direitos,"
      emphasis="garantidos."
      lastUpdated="11 de maio de 2026"
      toc={TOC}
    >
      <p className="text-lg leading-relaxed text-muted-foreground">
        Esta página explica em <LegalDt>linguagem direta</LegalDt> como o Zapfy cumpre a Lei
        Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD). Pra detalhes formais,
        veja a{' '}
        <Link href="/privacidade" className="text-foreground underline-offset-4 hover:underline">
          Política de Privacidade
        </Link>
        .
      </p>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {RIGHTS.map((r) => (
          <div
            key={r.title}
            className="rounded-xl border border-border/60 bg-card/40 p-5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <r.icon className="h-4 w-4" />
            </div>
            <h3 className="mt-4 font-medium tracking-tight">{r.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{r.description}</p>
            <code className="mt-3 block text-xs text-muted-foreground/80">{r.endpoint}</code>
          </div>
        ))}
      </div>

      <div className="mt-16 space-y-2">
        <LegalSection id="resumo" number={1} title="Resumo em 30 segundos">
          <LegalList>
            <li>Seus dados são seus. Você pode pedir cópia, correção ou apagamento.</li>
            <li>
              Suas conversas <LegalDt>NUNCA</LegalDt> treinam modelos de IA. Tudo de IA externa
              roda com flag de no-training.
            </li>
            <li>Tokens da Meta cifrados com AES-256-GCM. Audit log de tudo.</li>
            <li>Endpoints de export/delete/opt-out funcionam de verdade — não é checkbox de compliance.</li>
            <li>Encarregado (DPO) responde em até 15 dias úteis.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="controlador-operador" number={2} title="Controlador x operador">
          <p>
            A LGPD distingue <LegalDt>controlador</LegalDt> (quem decide as finalidades do tratamento)
            de <LegalDt>operador</LegalDt> (quem trata em nome do controlador).
          </p>
          <LegalList>
            <li>
              Em relação a <LegalDt>dados de Clientes do Zapfy</LegalDt> (você, dono da conta) —
              somos <LegalDt>controladores</LegalDt>. Decidimos como cadastro, faturamento e
              autenticação funcionam.
            </li>
            <li>
              Em relação a <LegalDt>contatos finais</LegalDt> (pessoas que conversam com o Agente
              no WhatsApp) — somos <LegalDt>operadores</LegalDt>. O Cliente é o controlador e
              define base legal, finalidade, e retenção.
            </li>
          </LegalList>
          <p>
            Por isso, se um contato final pedir export/delete, você (Cliente) é quem operacionaliza
            — e oferecemos os endpoints/UI no dashboard pra te ajudar a fazer isso em segundos.
          </p>
        </LegalSection>

        <LegalSection id="direitos-titular" number={3} title="Direitos do titular (LGPD art. 18)">
          <LegalList>
            <li>Confirmar a existência de tratamento.</li>
            <li>Acessar dados.</li>
            <li>Corrigir dados incorretos.</li>
            <li>Anonimizar, bloquear ou eliminar dados desnecessários, excessivos ou ilegais.</li>
            <li>Portabilidade.</li>
            <li>Eliminação de dados tratados com consentimento.</li>
            <li>Informações sobre uso compartilhado.</li>
            <li>Revogar consentimento.</li>
            <li>Opor-se a tratamento.</li>
            <li>Revisão de decisão automatizada.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="como-exercer" number={4} title="Como exercer seus direitos">
          <p>Três caminhos, todos com resposta em até 15 dias úteis (art. 19, caput):</p>
          <LegalList>
            <li>
              <LegalDt>Dashboard:</LegalDt> Configurações → Privacidade → "Exportar dados" /
              "Apagar conta". Disponível pra Clientes.
            </li>
            <li>
              <LegalDt>Endpoints da API:</LegalDt> chamadas autenticadas em{' '}
              <code>/api/lgpd/*</code>. Útil pra automação de operadores.
            </li>
            <li>
              <LegalDt>E-mail:</LegalDt>{' '}
              <a href="mailto:dpo@Zapfy.dev" className="text-foreground underline-offset-4 hover:underline">
                dpo@Zapfy.dev
              </a>{' '}
              com cópia de identidade.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="endpoints" number={5} title="Endpoints LGPD">
          <p>Pra Clientes do Zapfy que querem automatizar atendimento ao titular:</p>
          <div className="mt-3 space-y-3 rounded-xl border border-border/60 bg-card/40 p-5 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-foreground">POST /api/lgpd/export</code>
              </div>
              <p className="mt-1 text-muted-foreground">
                Body: <code>{`{ phoneE164?: string, contactId?: string }`}</code>. Retorna ID de
                job — o JSON fica disponível pra download em até 24h.
              </p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <div className="flex items-center gap-2">
                <code className="font-mono text-foreground">POST /api/lgpd/delete</code>
              </div>
              <p className="mt-1 text-muted-foreground">
                Body: <code>{`{ phoneE164: string, hardDeleteIn?: '30d' | 'immediate' }`}</code>.
                Soft delete imediato, hard delete agendado.
              </p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <div className="flex items-center gap-2">
                <code className="font-mono text-foreground">POST /api/lgpd/opt-out</code>
              </div>
              <p className="mt-1 text-muted-foreground">
                Body: <code>{`{ phoneE164: string }`}</code>. Marca o contato como "não contatar"
                — bloqueia broadcasts e templates futuros pra ele.
              </p>
            </div>
          </div>
          <p>
            Auth: header <code>Authorization: Bearer zk_xxx</code> (API key do workspace). Veja{' '}
            <Link href="/blog/api-publica-Zapfy" className="text-foreground underline-offset-4 hover:underline">
              docs da API
            </Link>
            .
          </p>
        </LegalSection>

        <LegalSection id="dpo" number={6} title="Encarregado de Proteção de Dados (DPO)">
          <LegalList>
            <li>
              <LegalDt>Nome:</LegalDt> [Nome a ser preenchido na nomeação oficial]
            </li>
            <li>
              <LegalDt>E-mail:</LegalDt>{' '}
              <a href="mailto:dpo@Zapfy.dev" className="text-foreground underline-offset-4 hover:underline">
                dpo@Zapfy.dev
              </a>
            </li>
            <li>
              <LegalDt>Atribuições</LegalDt> (LGPD art. 41 §2º): aceitar reclamações de titulares,
              orientar funcionários sobre práticas a serem tomadas, executar demais atribuições
              definidas pela ANPD.
            </li>
            <li>
              <LegalDt>Prazo de resposta:</LegalDt> até 15 dias úteis (art. 19, caput).
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="dpa" number={7} title="DPA — Data Processing Agreement">
          <p>
            Para Clientes do plano <LegalDt>Premium</LegalDt> que precisam formalizar o tratamento
            de dados de seus titulares conosco (com o Zapfy atuando como operador), oferecemos um
            DPA padrão que pode ser assinado eletronicamente. Solicite em{' '}
            <a href="mailto:dpo@Zapfy.dev" className="text-foreground underline-offset-4 hover:underline">
              dpo@Zapfy.dev
            </a>{' '}
            informando CNPJ do controlador.
          </p>
        </LegalSection>

        <LegalSection id="sub-operadores" number={8} title="Sub-operadores">
          <p>
            Lista completa de sub-operadores e finalidades em{' '}
            <Link href="/privacidade#sub-operadores" className="text-foreground underline-offset-4 hover:underline">
              Privacidade → Sub-operadores
            </Link>
            . Você é notificado em caso de inclusão de novo sub-operador relevante com pelo
            menos 30 dias de antecedência.
          </p>
        </LegalSection>

        <LegalSection id="incidentes" number={9} title="Incidentes de segurança">
          <p>
            Em caso de incidente que possa acarretar risco ou dano relevante aos titulares,
            comunicaremos:
          </p>
          <LegalList>
            <li>
              À <LegalDt>ANPD</LegalDt> em prazo razoável (art. 48 §1º), tipicamente até 72h após
              a detecção.
            </li>
            <li>
              Aos <LegalDt>titulares afetados</LegalDt> diretamente quando exigido.
            </li>
            <li>
              Aos <LegalDt>Clientes controladores</LegalDt> imediatamente quando o incidente envolver
              dados sob sua responsabilidade.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="anpd" number={10} title="Reclamações à ANPD">
          <p>
            Se você não estiver satisfeito com nossa resposta, pode reclamar diretamente à
            Autoridade Nacional de Proteção de Dados:{' '}
            <a
              href="https://www.gov.br/anpd"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline-offset-4 hover:underline"
            >
              www.gov.br/anpd
            </a>
            .
          </p>
        </LegalSection>
      </div>

      <div className="mt-16 rounded-2xl border border-primary/30 bg-primary/5 p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-medium tracking-tight">Tem alguma dúvida ou pedido?</h3>
            <p className="mt-2 text-muted-foreground">
              Manda direto pro DPO em{' '}
              <a href="mailto:dpo@Zapfy.dev" className="text-foreground underline-offset-4 hover:underline">
                dpo@Zapfy.dev
              </a>
              . Resposta em até 15 dias úteis.
            </p>
            <Link
              href="/contato"
              className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Ou usar o formulário de contato <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </LegalPage>
  );
}
