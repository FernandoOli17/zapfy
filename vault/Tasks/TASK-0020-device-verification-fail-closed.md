---
id: TASK-0020
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P1
area: web
created: 2026-06-12
updated: 2026-06-12
related: [TASK-0009, ERR-0001]
tags: [task, area/web, audit-2026-06-10, security]
---
# Device verification fail-closed (cluster AU-A1/A2/A3/A5/A6/A14)

## Objetivo
A verificação de dispositivo é contornável e silenciosa em 5 pontos (todos
CONFIRMADOS na auditoria 2026-06-10):
- **AU-A1 (crítico):** verificação expirada e nunca confirmada → gate libera
  (`pendingVerificationForSession` filtra `expiresAt > now`); atacante espera
  10min e entra com sessão de 30 dias.
- **AU-A2 (crítico, = TASK-0009):** `sendEmail` nunca lança e o `{ok:false}` é
  descartado — user fica preso esperando código que nunca chega, sem botão de
  reenvio (a tela promete um que não existe).
- **AU-A3 (crítico):** o gate só existe no layout RSC — server actions e rotas
  de API aceitam a sessão não-verificada normalmente.
- **AU-A5:** "não fui eu" com token expirado não destrói a sessão do atacante.
- **AU-A6:** exceção ao criar a verificação → login segue sem gate (fail-open).
- **AU-A14 (menor):** `getClientIp`/`getClientLocation` mortos — e-mail mostra
  sempre "Local: não identificado".

## Plano
- Redesign fail-closed: verificação expirada+não-confirmada destrói a sessão
  (ou bloqueia até reenvio); check central em `requireWorkspace`/wrapper de
  sessão (403 `DEVICE_VERIFICATION_PENDING`), não só no layout.
- Checar `result.ok` do sendEmail; falha = login falha visível + action de
  reenvio de código na tela /verify-device.
- Revogação por token com TTL próprio (ex. 7 dias) que SEMPRE deleta a sessão.
- Falha ao criar verificação de device desconhecido = destruir a sessão.
- Ligar localização (headers Vercel) ou remover os helpers mortos.
- Cuidado de UX: fail-closed + e-mail quebrado = lockout — reenvio e mensagem
  clara são parte do mesmo pacote (não entregar pela metade).

## Critério de pronto
- [ ] esperar a expiração NÃO dá acesso (teste E2E)
- [ ] server action com sessão pendente recebe 403
- [ ] falha de envio é visível + reenvio funciona
- [ ] "não fui eu" destrói a sessão mesmo expirado
- [ ] gate verde
