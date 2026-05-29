---
id: ERR-0001
type: error
severity: high
status: fixed
area: infra
created: 2026-05-28
fixed: 2026-05-28
commit:
related: [BLK-vercel-resend-env]
tags: [error, area/infra]
---
# Código de verify-device não chega no e-mail

## Sintoma
Usuário tentou logar; o código de confirmação de dispositivo nunca chegou no
Gmail. App agia como se tivesse enviado.

## Causa raiz
Dois bugs somados:
1. `RESEND_FROM_EMAIL` apontava pra um domínio **não verificado** no Resend
   (verificado = `zapfy.store`). Resend rejeitava o envio e o erro era **engolido**
   num `log.warn` em `device-verification.ts` (parecia sucesso).
2. `env.ts` validava `RESEND_FROM_EMAIL` como `.email()` puro — rejeitaria o
   formato recomendado `Nome <email>`.

## Correção
- `.env`: `RESEND_FROM_EMAIL = Zapfy <noreply@zapfy.store>`.
- `apps/web/src/lib/email/client.ts`: fallback `noreply@zapfy.store`.
- `apps/web/src/env.ts`: schema aceita `email` **ou** `Nome <email>`.
- Teste de entrega real via API Resend: **enviado OK** (id retornado).

## Produção (resolvido 2026-05-29)
Env `RESEND_FROM_EMAIL` corrigida no painel da Vercel + redeploy. Login testado em
www.zapfy.store: código chega no e-mail. ✅ ([[BLK-vercel-resend-env]] resolved.)

## Prevenção (teste que reproduz?)
- Débito: fazer a falha de envio de e-mail **não** ser engolida (logar como
  `error`/propagar) — registrado como [[TASK-0009-resend-erro-visivel]].
