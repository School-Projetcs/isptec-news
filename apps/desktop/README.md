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

Podes executar todo o ecossistema com zero-fricção através do comando na raiz do projeto:

```bash
pnpm start:all
```
*Isto irá lançar a API, a Web e abrir automaticamente a janela do Electron para o Desktop num novo terminal!*

### Desenvolvimento Manual (com hot-reload da Web)

Se preferires correr à mão:
```bash
# Terminal 1 — API + Web (na raiz do monorepo)
pnpm dev

# Terminal 2 — janela Electron a apontar para o Vite
pnpm dev:desktop
```

### Produção (janela autónoma a partir do build)

```bash
pnpm desktop  # constrói a Web e abre a janela Electron a servir o build estático
```

## Empacotamento (instaladores .exe/.AppImage/.dmg)

O `electron-builder` já está configurado. Podes gerar o instalador (ex: `.exe` no Windows) correndo o seguinte comando a partir da raiz:

```bash
pnpm --filter @isptec/desktop dist
```
O executável final ficará guardado na pasta `apps/desktop/release/`.

> Detalhes no [relatório técnico](../../docs/RELATORIO-TECNICO.md).
