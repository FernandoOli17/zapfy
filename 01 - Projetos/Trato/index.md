---
tipo: projeto
status: em-desenvolvimento
criado: 2026-05-26
tags: [trato, saas, whatsapp, ia, projeto-ativo]
codigo: "[[Trato/repo]]"
aliases: ["Trato App", "Trato SaaS"]
---

# Trato

> SaaS multi-tenant de atendimento via WhatsApp com agente IA. O **Forge** entrevista o cliente em linguagem natural e monta o agente. Quem entende de código tem o **Modo Desenvolvedor** com flow visual + tools custom + prompt raw.

**Diferencial central:** o moat não é a IA que atende, é a IA (Forge) que constrói a IA que atende — sem fluxograma, sem código, sem onboarding longo.

## Slogan

> Cliente chegou? Trato cuida.

## Estado atual

- **Fase:** 5.5 — Hardening pós-auditoria + modo desenvolvedor + templates por vertical + áudio no Forge
- **Próximo:** validar fluxo E2E com Anthropic key real (~$5 budget), criar a marca visual definitiva
- **Pendência usuário:** rodar `pnpm db:push` no Neon pra aplicar schema novo (devMode + flowGraph + CustomTool)

## Mapa do projeto

- [[Arquitetura]] — como o sistema funciona internamente
- [[Habilidades]] — o que o agente sabe fazer (templates + tools + verticais)
- [[Forge]] — o builder conversacional
- [[Modo Desenvolvedor]] — flow editor visual + tools custom + raw prompt
- [[Decisões]] — registro histórico de escolhas técnicas
- [[Glossário]] — vocabulário do projeto
- [[Roadmap]] — próximas frentes
- [[Operações]] — comandos do dia a dia
- [[Segurança]] — controles aplicados + dívidas

## Stack rápido

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 App Router + Tailwind v4 + ReactFlow |
| Backend | Next API Routes + tRPC v11 + Server Actions |
| DB | Postgres 16 (Neon) + pgvector + Prisma 6 |
| Auth | Better Auth (email/senha + Google + magic link) |
| Filas | BullMQ + Upstash Redis |
| IA | Anthropic Claude Sonnet 4.5 + Haiku 4.5 + Voyage AI embed |
| Áudio | Whisper-1 (OpenAI) — transcrição do Forge |
| WhatsApp | Meta Cloud API v21+ (BYO no MVP) |
| Pagamentos | Stripe Subscriptions |
| Deploy | Vercel (web) + Railway (worker) |

## Modelo de receita

3 planos mensais — [[Roadmap#Billing|Stripe]] já wired:

- **Starter R$97/mês** — 1 número, 1.000 conversas, 1 agente
- **Pro R$297/mês** — 3 números, 5.000 conversas, RAG ilimitado, webhooks
- **Premium R$697/mês** — 10 números, 20.000 conversas, modo desenvolvedor, API pública, multi-LLM

Trial 7 dias sem cartão. Ver [[Decisões#Pagamentos|decisão sobre Pix]].

## Quem é o cliente

Dono de PME que vende via WhatsApp:
- Pizzaria delivery, loja online, clínica/consultório, prestador de serviço, curso/mentoria
- 1-50 atendentes humanos
- Recebe 100-5000 mensagens/mês
- Sem time técnico — o app inteiro tem que funcionar sem `console.log`

Ver [[Habilidades#Templates por vertical]] pros 6 templates prontos.

## Links externos

- Repositório local: `C:/Users/ferna/zapai/`
- Branch atual: `master`
- DB: Neon (free tier, branch `main`)
- Redis: Upstash (free tier)
- Domínio planejado: `trato.dev` (a registrar)

## Arquivos-âncora no código

| O que | Onde |
|---|---|
| Schema Prisma | `packages/db/prisma/schema.prisma` |
| Engine do Forge | `packages/ai/src/forge/engine.ts` |
| Templates de agente | `packages/ai/src/playbooks/templates.ts` |
| Executor de flow custom | `packages/ai/src/flow/executor.ts` |
| Agente runtime | `packages/ai/src/agent/runner.ts` |
| Pipeline do worker | `apps/worker/src/jobs/process-message.ts` |
| Página Forge | `apps/web/src/app/(app)/forge/forge-workspace.tsx` |
| Página /developer | `apps/web/src/app/(app)/developer/` |
| Webhook Cloud API Meta | `apps/web/src/app/api/webhooks/whatsapp/[phoneNumberId]/route.ts` |

---

_Atualizar este arquivo quando muda algo grande. Sub-páginas mantêm o detalhe._
