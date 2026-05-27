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
cd zapai
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

**Sintoma:** Usuário ainda viu "ZapAI" no `README.md` do root depois do rename.

**Causa raiz:** Meu `find apps packages -type f ...` só varreu `apps/` e `packages/`. Arquivos do root (`README.md`, `PLAN.md`, `CLAUDE.md`) ficaram com o nome antigo.

**Solução:** próximo passo — rodar sed também no root.

**Prevenção:** sempre incluir root nos replaces globais; conferir com grep depois.

---

(novos erros são adicionados aqui ↑)
