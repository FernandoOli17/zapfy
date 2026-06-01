---
id: BLK-push-rede
type: blocker
status: open
severity: medium
owner: user
requires: rede sem filtro (ex: hotspot 4G) pra push HTTPS no github.com
created: 2026-06-01
related: [TASK-0019-forge-guiada-wizard]
tags: [blocker, area/infra]
---
# Push pro GitHub bloqueado — "Connection was reset"

## O que está bloqueado
Deploy da **Forge guiada** ([[TASK-0019-forge-guiada-wizard]]) em produção. A feature
está pronta, gate verde (incl. build) e E2E passando, **18 commits commitados localmente**
no master — mas `git push origin master` falha:

```
fatal: unable to access 'https://github.com/FernandoOli17/zapfy.git/':
Recv failure: Connection was reset
```

`git fetch` falha igual. Reproduzido 2x (não é blip). Mesmo padrão do firewall corporativo
Cisco citado no PLAN (que bloqueia 5432; aqui está resetando o 443/git também).

## Como resolver (ação do usuário)
- Trocar pra **rede sem filtro** (hotspot 4G, como foi feito no primeiro `db push`) e
  rodar `git push origin master` — ou me pedir pra eu rodar quando a rede trocar.
- Push pro GitHub dispara o **redeploy na Vercel** (web) → Forge guiada vai ao ar.
- Nada a corrigir no código; é só conectividade.

## Nada se perde
Os 18 commits estão seguros no repositório local. Quando a rede permitir, o push sobe tudo
de uma vez (chat fix + Forge guiada).
