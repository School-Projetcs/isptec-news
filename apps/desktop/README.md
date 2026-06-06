# @isptec/desktop (Fase 4)

Cliente **Desktop** (Electron) que embrulha a app Web (`apps/web`).
Satisfaz o requisito de **cliente multiplataforma** (Windows/Linux/macOS).

## Como funciona

- **Dev:** o Electron carrega `http://localhost:5173` (servidor Vite da Web) e usa o
  proxy `/api` do Vite para falar com a API.
- **Prod:** o Electron carrega o build estático de `apps/web/dist` através de um
  protocolo próprio `app://` (com *fallback* para `index.html`, p/ o React Router).
  Como sob `app://` não há proxy, a Web é construída com `VITE_API_URL`
  (ver `apps/web/.env.production`, por omissão `http://localhost:3333`).

## Executar

### Desenvolvimento (com hot-reload da Web)

```bash
# Terminal 1 — API + Web (na raiz do monorepo)
pnpm dev

# Terminal 2 — janela Electron a apontar para o Vite
pnpm --filter @isptec/desktop dev
```

### Produção (janela autónoma a partir do build)

```bash
pnpm --filter @isptec/web build      # gera apps/web/dist (lê .env.production)
pnpm --filter @isptec/desktop start  # abre a janela Electron a servir o dist
```

> A API (`pnpm dev:api` ou `pnpm --filter @isptec/api start`) tem de estar a correr
> em `http://localhost:3333` para o cliente ter dados.

## Empacotamento (instaladores .exe/.AppImage/.dmg)

Ainda não configurado — usar `electron-builder` numa iteração futura (Fase 4/5).
Para a demo local, `start` abre a aplicação real sem necessidade de instalador.

> Detalhes no [plano-mestre](../../docs/00-plano-mestre.md).
