# Errors Log

Erros encontrados, causa raiz, e solução aplicada. Anti-padrão: repetir o mesmo erro.

Formato:
```
## [data hora] arquivo:linha — título curto
**Sintoma:** o que apareceu
**Causa raiz:** por que aconteceu
**Solução:** o que fiz
**Prevenção:** o que mudei pra não repetir
```

---

## [2026-05-26 noite → 2026-05-27 manhã] Prisma EPERM Windows DLL lock — RESOLVIDO

**Sintoma:** `pnpm db:generate` falha com `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp...`

**Causa raiz:** Windows Defender ou outro processo abre o `.dll.node` em modo exclusivo. Quando `prisma generate` tenta renomear o `.tmp` em cima do arquivo atual, OS recusa.

**Workaround noturno:** `npx prisma generate --no-engine` pula download do binário (só atualiza tipos TS). Funciona pra typecheck mas QUEBRA build pq client.js fica em modo data-proxy.

**Resolução manhã:** rodei `rm -f .../tmp*` pra limpar arquivos órfãos + `npx prisma generate` (sem flag) — funcionou de primeira. O lock tinha sumido. Em seguida `prisma db push` sincronizou o Neon com o schema novo: "Done in 12.27s".

**Detalhe importante do db push:** Prisma CLI roda do `packages/db/`, mas `.env` tá no root do monorepo. Precisei carregar manualmente:
```bash
cd zapfy
export $(grep -E "^DATABASE_URL=" .env | xargs)
cd packages/db
npx prisma db push
```
Em sessão futura, considerar adicionar `--schema` + load explícito do .env, ou usar `dotenv-cli`.

**Prevenção:**
1. Antes de tentar generate, limpar tmps: `rm -f node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/*.tmp*`
2. Se persistir, fechar IDEs e tentar de novo (não rodar `--no-engine` no fluxo normal — só pra urgência)
3. Documentado em `Operações.md` do Obsidian

---

## [2026-05-26] Sed rename Orbe→Trato deixou README.md de fora

**Sintoma:** Usuário ainda viu "Zapfy" no `README.md` do root depois do rename.

**Causa raiz:** Meu `find apps packages -type f ...` só varreu `apps/` e `packages/`. Arquivos do root (`README.md`, `PLAN.md`, `CLAUDE.md`) ficaram com o nome antigo.

**Solução:** próximo passo — rodar sed também no root.

**Prevenção:** sempre incluir root nos replaces globais; conferir com grep depois.

---

## [2026-05-28 manhã] seed-granvilla.ts:503 — etaMinutes undefined incompatível com exactOptionalPropertyTypes

**Sintoma:** `pnpm typecheck` quebra em `packages/db`:
```
Type 'number | undefined' is not assignable to type 'number | null'.
```
Linha 503: `etaMinutes: state.status === OrderStatus.PREPARING ? 45 : undefined`.

**Causa raiz:** Prisma gera `etaMinutes?: number | null` (campo opcional nullable no schema). Com `exactOptionalPropertyTypes: true`, passar `undefined` explícito é ≠ omitir a chave — Prisma tipa como `number | null`, não `number | null | undefined`.

**Solução:** trocar `undefined` por `null` — semanticamente equivalente pro DB e respeita o tipo.

**Prevenção:** quando schema Prisma é `Int?`, usar `null` (não `undefined`) em ternários condicionais.

---

## [2026-05-28 manhã] seed-granvilla.ts — Can't reach database server porta 5432

**Sintoma:** `pnpm db:seed:granvilla` falha:
```
Can't reach database server at `ep-tiny-sky-aqo5fr79.c-8.us-east-1.aws.neon.tech:5432`.
```
Mas o web app (via /api/health) consegue conectar perfeitamente.

**Causa raiz:** o seed script usava `new PrismaClient()` direto (driver TCP 5432). O web app usa o cliente exportado por `packages/db/src/index.ts` que configura `PrismaNeon` adapter via HTTP/WebSocket (porta 443). O firewall corporativo Cisco bloqueia 5432.

**Solução:** replicar o setup do Neon adapter no topo do seed:
```ts
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });
```

**Prevenção:** todo script standalone que toca DB (seeds, migrations programáticas, scripts de manutenção) deve usar o mesmo adapter. Considerar mover esse setup pra um helper `@zapfy/db/script-client` reusável.

---

## [2026-05-28 manhã] next.config.ts — experimental.typedRoutes deprecated em Next 15.5+

**Sintoma:** `next build` emite warning:
```
⚠ experimental.typedRoutes has been moved to typedRoutes.
```
Não quebra build mas polui logs.

**Solução:** mover `typedRoutes: true` de `experimental` pro top-level do `nextConfig`. Fixado em `apps/web/next.config.ts`.

**Prevenção:** ao atualizar Next major/minor, scan dos `experimental.*` options no changelog.

---

## [2026-05-28 manhã] Playwright E2E — timeout 15s insuficiente em cold start turbopack

**Sintoma:** 2/3 tests de signup falham com `TimeoutError: page.waitForURL: Timeout 15000ms exceeded`. Test 3 (sem submit completo) passa.

**Causa raiz:** primeira request POST `/api/auth/sign-up/email` leva ~29s — Turbopack compila a rota dynamic + Neon serverless faz cold connect. Warm subsequent é <3s.

**Solução:** bumpar `waitForURL` timeouts em `helpers.ts` de 15s pra 60s, e `playwright.config.ts` global `timeout` de 30s pra 90s + `expect.timeout` de 5s pra 10s. Cobre cold + warm.

**Prevenção:** documentar no playwright.config que webServer pode levar até 1min na primeira request por rota dinâmica. Em CI considerar pré-aquecer com `curl /api/auth/sign-up/email` (espera 401) antes da suite.

---

## [2026-05-28 manhã] Playwright E2E — helper de signup deixava user sem workspace

**Sintoma:** `billing.spec.ts:10` falha porque `body` da página contém "Criar workspace" (texto de /onboarding) em vez de "plano/billing".

**Causa raiz:** o `signupNewUser` parava em `/onboarding` sem criar workspace. Middleware bounceava qualquer navegação subsequente de volta pra `/onboarding`.

**Solução:** estender helper pra clicar "Criar workspace" se cair em `/onboarding`. Workspace name precisa ser único por test (Date.now() + Math.random) pra não colidir em slug com tests anteriores.

**Prevenção:** helpers de teste devem deixar o usuário em estado canônico (logado + workspace criado) — não "no meio do onboarding".

---

## [2026-05-28 manhã] Playwright E2E — forge spec usava seletor `h1` que não existe

**Sintoma:** `forge.spec.ts:15` falha em `expect(page.locator('h1, [data-page="forge"]')).toBeVisible`.

**Causa raiz:** `ForgeWorkspace` renderiza `<h2>` introdutório, não `<h1>`. Atributo `data-page="forge"` nunca existiu.

**Solução:** ajustar locator pra `'h1, h2'` first.

**Prevenção:** quando adicionar locators baseados em tag heading, conferir o que a página renderiza de fato (não inventar `data-*` que não existe).

---

## [2026-05-28 noite] Code review xhigh — 15 findings (3 críticos de segurança)

### 🔴 #1 CRÍTICO — Gate verify-device só em (app)/layout.tsx
Server Actions e API routes que chamam `auth.api.getSession` sozinhos
pulam o gate. Atacante com cookie roubado pode chamar /api/auth/sign-out,
/api/realtime/auth, /api/forge/transcribe, ou qualquer Server Action
(whatsapp/connect, forge/publish, settings/update) durante a janela
"pending verification" e mutar estado sem confirmar device.

**Fix necessário:** criar `requireVerifiedSession(headers)` que wrappers
`auth.api.getSession` + checa `pendingVerificationForSession`. Substituir
todos os usos diretos de `getSession` pelos críticos. **PENDENTE.**

### 🔴 #11 CRÍTICO — Revoke endpoint GET prefetched por email scanners
`GET /api/auth/revoke-device?token=...` é executado por Outlook Safe
Links, Gmail prefetch, antivírus URL scanners assim que email chega.
Resultado: revogação automática → user real nunca consegue confirmar.

**Fix necessário:** trocar pra POST + tela de confirmação. Email link
abre `/verify-device/revoke?token=...` que mostra botão "Confirmar
revogação". **PENDENTE.**

### 🔴 #5 CRÍTICO — Hook fail-open silencioso
Em `lib/auth.ts:141`, qualquer erro em `createDeviceVerification`
(Resend down, DB hiccup) é swallowed com `log.error` e o user é
ADMITIDO sem KnownDevice + sem DeviceVerification. Gate vê null
e libera. Feature de verificação inteira pode silenciosamente
falhar-open em prod.

**Fix necessário:** se createDeviceVerification throw, criar um
`DeviceVerification` placeholder com `expiresAt` longe → força user
a re-login. **PENDENTE.**

### Outras 12 findings (correctness/perf/UX) — anotadas pra próxima sessão:
- `lib/plans.ts:39` `distinct: ['conversationId']` deveria ser `contactId`
- `lib/plans.ts:34` 30-day rolling window vs `currentPeriodStart` inconsistentes (UI mostra ambos como "ciclo")
- `lib/auth.ts:97` race no `prisma.session.count === 0` permite atacante VPN ser "primeiro device"
- `lib/plans.ts:81` `dailyActiveContactsLastDays` carrega todas Messages 14d em memória (timeout em workspace grande)
- `next.config.ts:81` glob `@prisma+client@*` frágil a hash changes do pnpm
- `lib/email/templates.ts:192` day6TrialEndingEmail ainda fala "10.000 conversas IA" (não atualizado pro novo pricing)
- `lib/device-verification.ts:143` token clickable de qualquer browser libera sessão (sem session binding)
- `lib/device-verification.ts:262` code-consume registra IP/UA do banco, não da request atual
- `lib/device-verification.ts:31` hashPii 64 bits permite correlação cross-user com DB access
- `schema.prisma:18` driverAdapters preview requer adapter explícito em TODO `new PrismaClient` — não validado em build
- `lib/auth.ts:105` hook serial 3+ queries adiciona 200-800ms a todo signin
- `app/verify-device/page.tsx:29` redirect pra /dashboard quando há OUTRA verificação pendente cria loop visual

---

(novos erros são adicionados aqui ↑)
