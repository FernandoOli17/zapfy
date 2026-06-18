import Link from 'next/link';

import { LegalDt, LegalList, LegalPage, LegalSection } from '@/components/marketing/legal';

export const metadata = {
  title: 'Termos de uso',
  description: 'Termos e condições de uso da plataforma Zapfy.',
};

const TOC = [
  { id: 'identificacao', label: 'Identificação' },
  { id: 'definicoes', label: 'Definições' },
  { id: 'cadastro', label: 'Cadastro e conta' },
  { id: 'planos-pagamento', label: 'Planos e pagamento' },
  { id: 'uso-aceitavel', label: 'Uso aceitável' },
  { id: 'responsabilidades', label: 'Responsabilidades' },
  { id: 'propriedade-intelectual', label: 'Propriedade intelectual' },
  { id: 'confidencialidade', label: 'Confidencialidade' },
  { id: 'limitacao', label: 'Limitação de responsabilidade' },
  { id: 'rescisao', label: 'Rescisão' },
  { id: 'alteracoes', label: 'Alterações nos termos' },
  { id: 'lei-foro', label: 'Lei e foro' },
];

export default function TermosPage() {
  return (
    <LegalPage
      eyebrow="Termos de uso"
      title="As regras"
      emphasis="do nosso acordo."
      lastUpdated="18 de junho de 2026"
      toc={TOC}
    >
      <p className="text-lg text-muted-foreground leading-relaxed">
        Bem-vindo ao Zapfy. Estes Termos de Uso (&quot;Termos&quot;) regem o uso da plataforma
        Zapfy por você (&quot;Cliente&quot;), pessoa física ou jurídica, ao acessar nosso site,
        criar conta ou contratar nossos planos. Ao usar o serviço, você aceita estes Termos na
        íntegra. Se discordar de qualquer ponto, não use a plataforma.
      </p>

      <div className="mt-12 space-y-2">
        <LegalSection id="identificacao" number={1} title="Identificação">
          <p>
            O Zapfy é uma plataforma de software como serviço (SaaS) operada por{' '}
            <LegalDt>[Razão Social a ser preenchida]</LegalDt>, inscrita no CNPJ sob nº{' '}
            <LegalDt>[CNPJ a ser preenchido]</LegalDt>, com sede em [endereço], doravante
            denominada simplesmente &quot;Zapfy&quot; ou &quot;nós&quot;.
          </p>
          <p>
            Contato oficial:{' '}
            <a href="mailto:oi@Zapfy.dev" className="text-foreground underline-offset-4 hover:underline">
              oi@Zapfy.dev
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection id="definicoes" number={2} title="Definições">
          <LegalList>
            <li>
              <LegalDt>Plataforma:</LegalDt> sistema do Zapfy acessível via web, incluindo
              dashboard, APIs internas e integrações.
            </li>
            <li>
              <LegalDt>Agente:</LegalDt> instância de IA configurada pelo Cliente para atender
              suas conversas no WhatsApp Business.
            </li>
            <li>
              <LegalDt>Forge:</LegalDt> ferramenta conversacional do Zapfy que entrevista o
              Cliente e gera a configuração do Agente.
            </li>
            <li>
              <LegalDt>Workspace:</LegalDt> espaço lógico que isola dados, agentes, conversas e
              membros de uma organização.
            </li>
            <li>
              <LegalDt>Cloud API:</LegalDt> WhatsApp Cloud API oficial da Meta Platforms, Inc.
            </li>
            <li>
              <LegalDt>Conversa IA:</LegalDt> janela de até 24 horas de troca de mensagens com
              um único contato em que o Agente respondeu pelo menos uma vez.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="cadastro" number={3} title="Cadastro e conta">
          <p>
            Você precisa ter pelo menos 18 anos e capacidade civil para contratar. Ao se cadastrar,
            você declara que as informações fornecidas são verdadeiras, atuais e completas, e se
            compromete a mantê-las atualizadas.
          </p>
          <p>
            Você é o único responsável pela guarda das credenciais (e-mail, senha, links mágicos)
            e por todas as atividades realizadas em sua conta. Em caso de uso não autorizado,
            notifique-nos imediatamente.
          </p>
          <p>
            Reservamos o direito de recusar cadastro ou suspender conta a nosso critério em caso
            de violação destes Termos, atividade suspeita ou irregularidades.
          </p>
        </LegalSection>

        <LegalSection id="planos-pagamento" number={4} title="Planos, pagamento e cancelamento">
          <p>
            Oferecemos os planos Starter, Pro e Business, com mensalidades indicadas em{' '}
            <Link href="/precos" className="text-foreground underline-offset-4 hover:underline">
              /precos
            </Link>
            . Não há período de teste gratuito (trial): você pode montar e visualizar seu Agente
            com o Forge gratuitamente e sem cartão, e a cobrança só ocorre quando você contrata um
            plano pago, momento em que o Agente passa a atender no WhatsApp.
          </p>
          <p>
            A cobrança é processada via Stripe em ciclos mensais, a partir da contratação do
            plano. Oferecemos garantia de 7 dias: se você solicitar o cancelamento em até 7 (sete)
            dias corridos contados da contratação, devolvemos integralmente o valor pago nesse
            período. Após esse prazo, o cancelamento pode ser feito a qualquer momento pelo portal
            de assinatura, mantendo-se o acesso até o fim do ciclo já pago, sem reembolso
            proporcional dos dias não utilizados, salvo previsão expressa em contrário.
          </p>
          <p>
            Upgrades e downgrades são prorrateados no ciclo atual. Caso o limite mensal de
            Conversas IA seja excedido no plano Pro, podemos cobrar add-ons em lotes pré-definidos,
            sempre com aviso prévio quando 80% do limite for atingido. No plano Starter, o Agente
            pausa e fica em modo somente-humano até o início do próximo ciclo ou até upgrade.
          </p>
        </LegalSection>

        <LegalSection id="uso-aceitavel" number={5} title="Uso aceitável">
          <p>Você concorda em <LegalDt>não</LegalDt>:</p>
          <LegalList>
            <li>
              Enviar mensagens em massa não solicitadas (spam), violar a Política de Mensagens da
              Meta ou usar o serviço para fins ilegais.
            </li>
            <li>
              Tentar burlar limites técnicos, fazer engenharia reversa, ou explorar
              vulnerabilidades da plataforma.
            </li>
            <li>
              Compartilhar credenciais de acesso fora do seu time autorizado no workspace.
            </li>
            <li>
              Usar a plataforma para distribuir conteúdo difamatório, discriminatório,
              pornográfico, fraudulento, ou que viole direitos de terceiros.
            </li>
            <li>
              Tentar treinar modelos de IA com dados de outros clientes ou tentar acessar dados
              de outros workspaces.
            </li>
          </LegalList>
          <p>
            Violações podem resultar em suspensão imediata da conta e, em casos graves, comunicação
            a autoridades competentes.
          </p>
        </LegalSection>

        <LegalSection id="responsabilidades" number={6} title="Responsabilidades do Cliente">
          <LegalList>
            <li>
              Obter e manter ativo seu próprio Meta App e WhatsApp Business Account (no MVP, com
              modelo BYO), incluindo cumprimento das políticas da Meta.
            </li>
            <li>
              Garantir que possui base legal para tratar dados pessoais de seus contatos (consentimento,
              execução de contrato, legítimo interesse, etc.) na forma da LGPD.
            </li>
            <li>
              Revisar e validar as respostas geradas pelo Agente quando relevante (especialmente
              em verticais de saúde, jurídico ou financeiro).
            </li>
            <li>
              Pagar as mensalidades em dia. Atrasos podem suspender o serviço após notificação.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="propriedade-intelectual" number={7} title="Propriedade intelectual">
          <p>
            O software Zapfy, código, design, marca, documentação e demais elementos da plataforma
            são de propriedade exclusiva do Zapfy ou de seus licenciantes. Concedemos a você uma
            licença não exclusiva, intransferível e revogável de uso conforme estes Termos.
          </p>
          <p>
            O conteúdo que você submete (system prompts, base de conhecimento, mensagens, configurações
            do Agente) permanece de sua propriedade. Concede-nos licença limitada apenas para
            processar e armazenar esses dados na medida necessária para prestar o serviço.
          </p>
          <p>
            Não usaremos suas conversas para treinar modelos de IA próprios ou de terceiros. As
            chamadas a modelos externos (Anthropic, etc.) são feitas com flag de no-training quando
            disponível.
          </p>
        </LegalSection>

        <LegalSection id="confidencialidade" number={8} title="Confidencialidade">
          <p>
            Ambas as partes se comprometem a manter sigilo sobre informações confidenciais
            recebidas durante a vigência destes Termos, incluindo, mas não limitado a, conteúdo
            de conversas, configurações de Agente, dados comerciais e técnicos.
          </p>
        </LegalSection>

        <LegalSection id="limitacao" number={9} title="Limitação de responsabilidade">
          <p>
            A plataforma é fornecida &quot;como está&quot; e &quot;conforme disponível&quot;. Apesar
            do nosso melhor esforço com SLAs e monitoramento, não garantimos disponibilidade
            ininterrupta, livre de erros ou de bugs.
          </p>
          <p>
            Em nenhuma hipótese o Zapfy será responsável por danos indiretos, lucros cessantes,
            perda de oportunidade de negócio, perda de dados decorrentes de falha de terceiros
            (Meta, provedores de IA, etc.), ou por uso indevido da plataforma pelo Cliente.
          </p>
          <p>
            Nossa responsabilidade total, em qualquer caso, limita-se ao valor pago pelo Cliente
            nos 12 meses imediatamente anteriores ao evento que deu origem à reclamação.
          </p>
        </LegalSection>

        <LegalSection id="rescisao" number={10} title="Rescisão">
          <p>
            Você pode cancelar a qualquer momento. Podemos rescindir o contrato em caso de violação
            destes Termos, inadimplência prolongada, ou uso abusivo da plataforma, sempre com
            notificação prévia razoável quando possível.
          </p>
          <p>
            Após o cancelamento, seus dados ficam disponíveis para export por 30 dias e são
            permanentemente apagados após esse prazo, salvo obrigações legais de retenção.
          </p>
        </LegalSection>

        <LegalSection id="alteracoes" number={11} title="Alterações nos termos">
          <p>
            Podemos atualizar estes Termos periodicamente. Em caso de alterações materiais,
            notificaremos você com pelo menos 15 dias de antecedência por e-mail e/ou via
            dashboard. O uso continuado da plataforma após a entrada em vigor implica aceitação
            das novas condições.
          </p>
        </LegalSection>

        <LegalSection id="lei-foro" number={12} title="Lei aplicável e foro">
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
            foro da Comarca de <LegalDt>[Cidade a ser preenchida]</LegalDt>, com exclusão de
            qualquer outro, por mais privilegiado que seja, para dirimir quaisquer controvérsias
            decorrentes destes Termos.
          </p>
          <p>
            Antes de qualquer ação judicial, as partes se comprometem a tentar resolução amigável
            por e-mail (
            <a href="mailto:oi@Zapfy.dev" className="text-foreground underline-offset-4 hover:underline">
              oi@Zapfy.dev
            </a>
            ).
          </p>
        </LegalSection>
      </div>
    </LegalPage>
  );
}
