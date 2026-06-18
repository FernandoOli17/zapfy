# Achados brutos — Auth/Onboarding (agente 1)

## Achados

### A1: Device verification falha aberta — sessão não verificada ganha acesso total após 10 min
- **Arquivo:** apps/web/src/lib/device-verification.ts:340-356 (+ apps/web/src/app/(app)/layout.tsx:108-112)
- **Severidade:** critico
- **Bug:** O gate de verificação de dispositivo é "existe verificação pendente *não expirada*?". A sessão criada no login de device novo vale 30 dias e nunca é destruída quando a verificação expira. Cenário: atacante com senha vazada loga de device novo → é redirecionado pra /verify-device → simplesmente espera 10 minutos → `pendingVerificationForSession` retorna null (filtro `expiresAt: { gt: new Date() }`) → layout deixa passar e a própria página /verify-device dá `redirect('/dashboard')` (linha 41 do page.tsx). A feature inteira é contornável com paciência.
- **Evidência:** `pendingVerificationForSession` filtra `expiresAt: { gt: new Date() }`; nada marca a sessão como bloqueada nem a deleta no expiry; `session.expiresIn: 60*60*24*30` em auth.ts:83. Em verify-device/page.tsx:41, `if (!pending) redirect('/dashboard')`.
- **Fix proposto:** Verificação expirada sem `verifiedAt` deve manter o bloqueio (ou destruir a sessão associada): no gate, buscar pendente *incluindo* expiradas e, se expirada e não verificada, deletar a sessão e mandar pro /login com aviso. Alternativa: flag `deviceVerified` na sessão, default false pra device novo.
- **Zona:** segura

### A2: TASK-0009 confirmado e pior — falha de envio do email de verify-device é 100% invisível (try/catch morto + result.ok ignorado)
- **Arquivo:** apps/web/src/lib/device-verification.ts:204-213
- **Severidade:** critico
- **Bug:** `sendEmail` **nunca lança** — ele captura tudo internamente e retorna `{ ok: false, error }` (email/client.ts:43-71). Logo o `try/catch` com `log.warn` na linha 211-212 é código morto, e o retorno `{ok:false}` não é checado em lugar nenhum. Se o Resend rejeitar (mesmo padrão do ERR-0001), o user fica preso na tela /verify-device esperando um código que nunca chega, sem mecanismo de reenvio (a tela menciona um botão "reenviar" que não existe) — e depois de 10 min cai no fail-open do A1.
- **Evidência:** `sendEmail` retorna `Promise<{ ok: boolean; ... }>` e tem `catch` interno retornando `{ ok: false }`; em createDeviceVerification o valor de retorno é descartado. Obs: o `catch {` da linha 74 (sinal coletado) foi verificado — só engole `URIError` de `decodeURIComponent(city)` com fallback pro valor cru do header; benigno.
- **Fix proposto:** Checar `result.ok` e, em falha, propagar `AppError` (ou deletar a DeviceVerification recém-criada e destruir a sessão) pra o login falhar visivelmente em vez de fingir que enviou; remover o try/catch morto. Adicionar action de reenvio.
- **Zona:** segura

### A3: Gate de device verification só existe no layout RSC — tRPC/server actions/APIs não são bloqueados
- **Arquivo:** apps/web/src/app/(app)/layout.tsx:108-112 (única ocorrência do gate)
- **Severidade:** critico
- **Bug:** O único ponto que consulta `pendingVerificationForSession` é o layout de páginas `(app)`. O cookie de sessão criado no login de device novo é plenamente válido — um atacante ignora a tela /verify-device e chama `/api/trpc/*`, server actions (`requireWorkspace` em lib/inbox.ts não checa verificação pendente) ou rotas REST diretamente, com acesso total aos dados do workspace sem nunca confirmar o device.
- **Evidência:** Grep por `pendingVerification|deviceVerification` no app web retorna só 3 arquivos: o layout, a lib e a página verify-device. `requireWorkspace` (lib/inbox.ts:29) só faz `getSession` + member check. middleware.ts só checa existência do cookie.
- **Fix proposto:** Mover o check pra um ponto central de autorização: middleware tRPC / `requireWorkspace` / handler de sessão do Better Auth (ex.: customSession ou check no `getSession` wrapper), retornando 403 `DEVICE_VERIFICATION_PENDING` enquanto houver verificação pendente pra sessão.
- **Zona:** segura

### A4: Bypass da verificação quando o user não tem outras sessões ativas ("primeira sessão" ≠ signup)
- **Arquivo:** apps/web/src/lib/auth.ts:104-116
- **Severidade:** medio
- **Bug:** O hook usa `prisma.session.count({ id: { not: session.id } }) === 0` como proxy de "signup". Mas sessões são deletadas em sign-out e na expiração. Cenário: vítima faz logout de todos os devices (0 rows em Session) → atacante loga com senha roubada → `prevSessions === 0` → device do atacante é registrado como **confiável sem verificação nenhuma** (`registerKnownDevice` direto), e fica permanente em KnownDevice.
- **Evidência:** Linhas 105-115: `if (prevSessions === 0) { await registerKnownDevice(...); return; }` — o critério não distingue signup de "user sem sessões vivas".
- **Fix proposto:** Trocar o proxy: considerar "primeiro device" só se `prisma.knownDevice.count({ where: { userId } }) === 0` **e** a conta foi criada há poucos minutos (`user.createdAt`), ou registrar o known device no fluxo de signup explicitamente.
- **Zona:** segura

### A5: "Não fui eu" não destrói a sessão do atacante se a verificação já expirou
- **Arquivo:** apps/web/src/lib/device-verification.ts:316-317
- **Severidade:** medio
- **Bug:** `revokeDeviceVerificationByToken` retorna `{ ok: false, reason: 'expired' }` se `expiresAt < now`, sem deletar a sessão associada. Cenário: vítima vê o email "novo acesso" 20 minutos depois e clica "bloquear esse acesso" → nada acontece com a sessão do atacante, que (via A1) já está dentro do app com sessão de 30 dias. Exatamente o caso em que a revogação mais importa.
- **Evidência:** `if (v.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };` antes do `tx.session.deleteMany`. O TTL de 10 min faz sentido pro **código**, não pro token de revogação.
- **Fix proposto:** Remover o check de expiração no caminho de revogação (ou dar TTL próprio e longo ao revokeToken, ex. 7 dias) — revogar deve sempre deletar a sessão pendente.
- **Zona:** segura

### A6: Erro ao criar a verificação de device → login segue sem verificação (fail-open silencioso)
- **Arquivo:** apps/web/src/lib/auth.ts:140-146
- **Severidade:** medio
- **Bug:** Qualquer exceção no hook (falha de DB ao criar `DeviceVerification`, etc.) cai num `catch` que só faz `log.error` e deixa o login de device desconhecido prosseguir sem nenhum gate — não existe registro pendente, então o layout (A3) deixa passar. Um incidente de DB parcial desliga a feature de segurança silenciosamente.
- **Evidência:** Comentário explícito "Não falha login se a verificação não rolar — só loga" + `catch` englobando todo o fluxo de detecção.
- **Fix proposto:** Fail-closed pra device desconhecido: se `createDeviceVerification` falhar, destruir a sessão recém-criada (ou rethrow pra abortar o login) em vez de logar e seguir.
- **Zona:** segura

### A7: Signup ignora `?next=` e `?email=` — fluxo de convite por signup quebra
- **Arquivo:** apps/web/src/app/(auth)/signup/signup-form.tsx:24-53 (origem: app/invite/[token]/page.tsx:114-120)
- **Severidade:** medio
- **Bug:** A página de convite manda o convidado pra `/signup?email=<email>&next=/invite/<token>`, mas o SignupForm não lê nenhum dos dois params: hardcoda `callbackURL: '/onboarding'` e `router.push('/onboarding')`, e não pré-preenche o email. Cenário: convidado novo cria conta → cai no onboarding "Crie seu workspace" → cria um workspace próprio em vez de voltar ao convite → nunca entra no time (e o convite morre em 7 dias).
- **Evidência:** LoginForm tem `sanitizeNext(params.get('next'))`; SignupForm não importa `useSearchParams`.
- **Fix proposto:** Replicar o `sanitizeNext` do login no SignupForm (callbackURL e push pro `next`), e inicializar o estado `email` com `params.get('email')`.
- **Zona:** segura

### A8: `probeAuthSignup` reenvia o POST de signup — pode criar a conta mostrando erro pro user
- **Arquivo:** apps/web/src/app/(auth)/signup/signup-form.tsx:42-47, 166-229
- **Severidade:** medio
- **Bug:** Quando o better-auth retorna erro sem `message`, o form re-submete o mesmo payload pra `/api/auth/sign-up/email` como "diagnóstico". Esse segundo POST tem efeito real: pode criar o usuário (e disparar autoSignIn/hooks) enquanto a UI exibe um texto de erro tipo "Resposta 200 sem mensagem" — o caso de sucesso não é tratado. Próxima tentativa do user: "email já cadastrado". Também consome o rate-limit de signup em dobro.
- **Evidência:** `const diag = await probeAuthSignup({ email, password, name }); setError(diag);` — o probe faz `fetch('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify(payload) })` e nenhum branch trata `res.ok` como sucesso.
- **Fix proposto:** Remover o probe (debug de dev em código de prod) ou trocá-lo por um GET de healthcheck sem efeito colateral; tratar erro sem message com texto genérico.
- **Zona:** segura

### A9: Convite stateless é reutilizável — membro removido se re-adiciona sozinho por até 7 dias
- **Arquivo:** apps/web/src/lib/invite-token.ts:20-23 + app/invite/[token]/actions.ts:56-77
- **Severidade:** medio
- **Bug:** O token HMAC não tem estado de "usado/revogado"; a única defesa é o check "já é membro". Cenário: admin convida alguém, a pessoa entra, faz algo errado e é removida do time → ela reusa o link do email original (válido 7 dias) e se re-adiciona ao workspace sem ninguém saber (vira não-membro de novo, então o check passa). Também não há como o owner revogar um convite enviado por engano sem trocar `BETTER_AUTH_SECRET` global.
- **Evidência:** Comentário no próprio arquivo admite o limite; `acceptInviteAction` só bloqueia se `workspaceMember` existir no momento do aceite.
- **Fix proposto:** Persistir `jti`/nonce do convite numa tabela (ou registro em AuditLog consultável) e marcá-lo consumido/revogado no aceite; rejeitar nonce já usado.
- **Zona:** segura

### A10: Email de boas-vindas promete "7 dias de trial sem cartão" mas o onboarding cria assinatura INCOMPLETE sem trial
- **Arquivo:** apps/web/src/lib/email/templates.ts:84,96 vs app/onboarding/actions.ts:40-56
- **Severidade:** medio
- **Bug:** `createWorkspaceAction` documenta "Sem trial: nasce INCOMPLETE… só atende quando a assinatura vira ACTIVE", mas o `welcomeEmail` disparado nesse mesmo fluxo diz "Seu workspace tá pronto. 7 dias de trial sem cartão." Cliente novo recebe promessa de trial que não existe — expectativa de cobrança errada (e os templates day3/day6 também assumem trial).
- **Evidência:** Comentário em actions.ts:40-41 + string do template linha 84.
- **Fix proposto:** Atualizar o copy do welcomeEmail (e revisar day3/day6) pro modelo real sem trial, ou implementar o trial — decisão de produto, perguntar antes.
- **Zona:** vermelha

### A11: Resposta de staff em ticket — falha de email vira `log.warn` e user nunca sabe (padrão ERR-0001)
- **Arquivo:** apps/web/src/lib/support.ts:152-196
- **Severidade:** medio
- **Bug:** No `replyTicket`, o status do ticket vira `AWAITING_USER` na transação e **depois** o email pro cliente é enviado dentro de try/catch→`log.warn`, com o `{ok:false}` de `sendEmail` também ignorado. Se o Resend falhar, o staff acha que respondeu, o ticket fica "aguardando user" e o cliente nunca recebe nada — mesma classe do ERR-0001.
- **Evidência:** `await sendEmail({...})` sem checar retorno, envolto em catch que só loga; sendEmail nunca lança (client.ts).
- **Fix proposto:** Checar `result.ok` e, em falha, marcar a mensagem com flag `emailDelivered:false` exposta no admin (ou retornar aviso pro staff re-tentar).
- **Zona:** segura

### A12: Redirects do revoke-device apontam pra query params que nenhuma página lê
- **Arquivo:** apps/web/src/app/api/auth/revoke-device/route.ts:18,24-32
- **Severidade:** menor
- **Bug:** A rota redireciona pra `/login?error=revoke-<reason>`, `/login?error=missing-token` e `/forgot-password?revoked=1`, mas nem o LoginPage/LoginForm nem o ForgotPasswordPage leem `error`/`revoked`. A vítima que clica "bloquear esse acesso" cai numa tela de login/recuperação genérica sem confirmação de que o acesso foi (ou não) bloqueado.
- **Evidência:** login-form.tsx só lê `next`; forgot-password/page.tsx não lê searchParams.
- **Fix proposto:** Renderizar banner condicional nessas páginas pros params já emitidos (sucesso de revogação e erros).
- **Zona:** segura

### A13: `{' '}` literal de JSX dentro de template string — renderiza no HTML do email
- **Arquivo:** apps/web/src/lib/email/templates.ts:392
- **Severidade:** menor
- **Bug:** `supportReplyToUserEmail` contém `Você tem uma resposta no ticket{' '}` dentro de uma template string comum — o cliente recebe o texto literal `{' '}` no corpo do email.
- **Evidência:** Linha 392: `Você tem uma resposta no ticket{' '}` (sintaxe JSX colada num template literal).
- **Fix proposto:** Substituir `{' '}` por espaço simples.
- **Zona:** segura

### A14: `getClientIp`/`getClientLocation` nunca usados — localização sempre null no fluxo real
- **Arquivo:** apps/web/src/lib/device-verification.ts:44-80 (+ auth.ts:113,137)
- **Severidade:** menor
- **Bug:** Os helpers de IP/localização existem mas nenhum caller os usa; o hook de sessão passa `location: null` sempre. Todo email de device novo mostra "Local: não identificado" e o label de device nunca tem cidade — metade da informação que o user precisaria pra decidir "fui eu / não fui eu" está morta. Funcionalidade pela metade (anti-padrão do CLAUDE.md).
- **Evidência:** Grep: únicas ocorrências de `getClientIp|getClientLocation` são as definições.
- **Fix proposto:** Resolver a localização no hook (headers Vercel estão disponíveis via `headers()` no contexto do request) e passar pra `createDeviceVerification`/`registerKnownDevice`; ou remover os helpers mortos.
- **Zona:** segura

### A15: Magic link / reset logam email + URL com token antes do throw em prod mal configurada
- **Arquivo:** apps/web/src/lib/auth.ts:38-40, 62-66
- **Severidade:** menor
- **Bug:** Sem `RESEND_API_KEY`, `log.info({ email, url }, ...)` roda **antes** do `throw` de produção — numa prod mal configurada, tokens de login one-click e emails (PII) vão pro log estruturado, violando a regra "sem PII em texto plano".
- **Evidência:** Ordem das linhas: log.info na 38/63, throw condicional na 39-41/64-66.
- **Fix proposto:** Em produção, lançar antes de logar; em dev, manter o log (ou logar só em `NODE_ENV !== 'production'`).
- **Zona:** segura

## Anotações UX
- /verify-device instrui "clique em 'reenviar' abaixo" mas não existe botão de reenvio na tela (verify-device/page.tsx:84).
- Branding inconsistente: onboarding e invite mostram "Trato"/"Trato.dev/" enquanto auth layout e emails dizem "Zapfy" (onboarding/page.tsx:35, onboarding-form.tsx:55, invite/[token]/page.tsx:46).
- /verify-device usa cores dark hardcoded (#0a0a0a) ignorando o tema claro disponível no resto do app.
