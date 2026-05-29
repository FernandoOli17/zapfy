---
id: BLK-vercel-resend-env
type: blocker
severity: high
status: resolved
owner: user
requires: manual-action
created: 2026-05-28
resolved: 2026-05-29
tags: [blocker, area/infra]
---
# Login de produção — RESEND_FROM_EMAIL errado na Vercel

## O que está bloqueado
No site no ar, o código de verify-device não chega no e-mail. Causa: a env
`RESEND_FROM_EMAIL` na Vercel ainda usa um domínio **não verificado** no Resend
(o domínio verificado é `zapfy.store`, região sa-east-1). O `.env` local foi
corrigido, mas **produção usa as env vars do painel da Vercel**, não o `.env`.

## Passos exatos pra resolver
1. Autorizar a integração Vercel (OAuth) — URL fornecida no chat; se a página de
   redirect falhar, colar a URL inteira da barra de endereço.
2. Eu seto na Vercel: `RESEND_FROM_EMAIL = noreply@zapfy.store`
   (**e-mail puro** — o código no ar ainda valida `.email()` puro, que rejeita o
   formato `Nome <email>`; usar puro até o fix de schema estar deployado).
3. Confirmar que a `RESEND_API_KEY` de produção é da **mesma conta** onde
   `zapfy.store` está verificado.
4. **Redeploy** (env nova só vale após novo deploy).

## Resolução (2026-05-29)
Usuário setou `RESEND_FROM_EMAIL` no painel da Vercel (projeto `zapfy`) e fiz o
redeploy de produção via integração (`dpl_EK2k...`, mesmo commit `ebdc0e9`, READY,
alias www.zapfy.store). Login testado em produção: **código chega no e-mail. ✅**

> Erro de origem documentado em [[ERR-0001-resend-from-dominio]].
