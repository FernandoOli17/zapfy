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

## [2026-05-26 noite] Prisma EPERM Windows DLL lock

**Sintoma:** `pnpm db:generate` falha com `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp...`

**Causa raiz:** Windows Defender ou outro processo abre o `.dll.node` em modo exclusivo. Quando `prisma generate` tenta renomear o `.tmp` em cima do arquivo atual, OS recusa.

**Solução temporária:** rodei `npx prisma generate --no-engine` que pula download do engine binário (só atualiza tipos TS). Funciona pra `pnpm typecheck` mas QUEBRA build de produção porque o client.js fica em modo data-proxy.

**Solução definitiva:** usuário precisa fechar IDEs/dev servers que podem ter aberto o `.dll.node` indiretamente (Claude Code, Cursor, VSCode com Prisma extension) e rodar `pnpm db:generate` numa janela limpa.

**Prevenção:** documentado em `Operações.md` do Obsidian + nessa entrada.

---

## [2026-05-26] Sed rename Orbe→Trato deixou README.md de fora

**Sintoma:** Usuário ainda viu "ZapAI" no `README.md` do root depois do rename.

**Causa raiz:** Meu `find apps packages -type f ...` só varreu `apps/` e `packages/`. Arquivos do root (`README.md`, `PLAN.md`, `CLAUDE.md`) ficaram com o nome antigo.

**Solução:** próximo passo — rodar sed também no root.

**Prevenção:** sempre incluir root nos replaces globais; conferir com grep depois.

---

(novos erros são adicionados aqui ↑)
