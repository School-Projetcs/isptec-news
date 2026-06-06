# ISPTEC News — Manual do Utilizador

> Como instalar, executar e demonstrar a plataforma. Complementa o
> [`README.md`](../README.md) (instalação rápida) e o [relatório técnico](01-relatorio-tecnico.md).

---

## 1. Pré-requisitos

- **Node.js** ≥ 20 e **pnpm** ≥ 9
- **Docker Desktop** (para o PostgreSQL local)
- **ffmpeg**: incluído via `ffmpeg-static`/`ffprobe-static` (resolvido por `pnpm install`)
- (Mobile) app **Expo Go** no telemóvel, ou um emulador Android/iOS

---

## 2. Instalação

```bash
pnpm install            # instala tudo (API, Web, Desktop, Mobile, shared)
pnpm db:up              # PostgreSQL + Adminer em Docker
pnpm db:migrate         # cria o esquema
pnpm db:seed            # cria utilizadores + categorias + 1 notícia de demonstração
```

> Os ficheiros `.env` de desenvolvimento já vêm preenchidos. A API corre na **porta 3333**
> (a 3000 está reservada a outra app local).

---

## 3. Executar os serviços

### 3.1 API + Web (núcleo)

```bash
pnpm dev                # API (:3333) + Web (:5173) em paralelo
```

| Serviço | URL |
|---|---|
| API | http://localhost:3333 · health: `/health` |
| Web | http://localhost:5173 |
| Adminer (BD) | http://localhost:8080 |

### 3.2 Cliente Desktop (Electron)

```bash
# opção A — desenvolvimento (carrega o Vite; requer `pnpm dev` a correr):
pnpm dev:desktop

# opção B — produção (build da Web + janela autónoma):
pnpm desktop
```

### 3.3 Cliente Mobile (Expo)

```bash
# 1) a API tem de estar a correr (pnpm dev:api)
# 2) define o URL da API para o IP da TUA máquina na rede local:
#    apps/mobile/.env  →  EXPO_PUBLIC_API_URL=http://192.168.x.x:3333
pnpm --filter @isptec/mobile start    # lê o QR code com a Expo Go
```

| Ambiente | `EXPO_PUBLIC_API_URL` |
|---|---|
| Telemóvel físico (Expo Go) | `http://<IP-LAN-da-máquina>:3333` |
| Emulador Android | `http://10.0.2.2:3333` |
| iOS Simulator | `http://localhost:3333` |

---

## 4. Credenciais de demonstração

| Papel | Email | Palavra-passe | Pode |
|---|---|---|---|
| **Admin** | `admin@isptec.local` | `admin123` | Tudo + gerir utilizadores e ver logs |
| **Editor** | `editor@isptec.local` | `editor123` | Criar/editar/publicar notícias e media |
| **Leitor** | `leitor@isptec.local` | `reader123` | Ler notícias e reproduzir media |

---

## 5. Guia de utilização por funcionalidade

### Ler notícias (qualquer utilizador)
1. Abrir a Web (ou Desktop/Mobile). O **Feed** mostra as notícias publicadas.
2. Tocar/clicar numa notícia → **detalhe** com texto e multimédia. O vídeo/áudio reproduz
   por **streaming** (seek, pausa, volume).

### Publicar uma notícia (Editor/Admin)
1. Entrar com a conta de editor.
2. **Gerir → Nova**: preencher título, resumo, corpo e categoria; gravar como rascunho ou publicar.
3. Em **Gerir** pode publicar/despublicar/eliminar.

### Comprimir media e ver o relatório (Editor/Admin)
1. Ir a **Media** (Web/Desktop) ou ao ecrã de upload (Mobile).
2. Escolher uma imagem, áudio ou vídeo e enviar.
3. A API comprime automaticamente e mostra o **relatório comparativo** (tamanho, taxa, poupança,
   qualidade) e a **reprodução** da variante.

### Transmissão ao vivo (Web/Desktop)
- Página **Ao vivo**: liga ao endpoint MJPEG e mostra a transmissão em tempo real.

### Reprodução offline (Mobile)
- No leitor de media, botão **"Guardar offline"** descarrega a variante; a etiqueta muda para
  "offline" e a reprodução passa a ser a partir do ficheiro local.

### Administração (Admin)
- **Admin**: lista de utilizadores (alterar papéis) e **logs** do sistema em tempo real.

---

## 6. Guião sugerido para a defesa (≈10 min)

1. **Arquitetura** (1 min): diagrama dos 3 clientes + API + BD; mostrar `GET /health`.
2. **Auth & permissões** (1,5 min): login; tentar ação de editor como leitor → `403`.
3. **Compressão** (2,5 min): upload de uma imagem e de um vídeo → relatório antes/depois;
   explicar o **Huffman próprio** (núcleo do JPEG).
4. **Streaming** (2,5 min): reproduzir vídeo com seek (VOD/Range); abrir a página **Ao vivo** (MJPEG).
5. **Multiplataforma** (1,5 min): mostrar a mesma conta na Web, no Desktop (Electron) e no Mobile;
   no Mobile, demonstrar **offline**.
6. **Segurança & logs** (1 min): mostrar `429` ao repetir logins; ecrã de logs no admin.

---

## 7. Resolução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Web não carrega dados | API não está a correr | `pnpm dev:api`; confirmar `:3333/health` |
| `/health` diz `db: disconnected` | PostgreSQL em baixo | `pnpm db:up` e aguardar; depois `pnpm db:migrate` |
| Upload de vídeo falha | ffmpeg não resolvido | reinstalar: `pnpm install`; testar `selftest-compression.ts` |
| Mobile não liga à API | `localhost` aponta para o telemóvel | usar o **IP LAN** em `EXPO_PUBLIC_API_URL` |
| `electron --version` falha | binário não descarregado | `pnpm rebuild electron` (ou correr o `install.js` do electron) |
| Muitos `429` no login | rate-limit (20/15 min) | aguardar a janela; é proteção intencional |
| Porta 3333 ocupada | outra app | mudar `PORT` em `apps/api/.env` e `VITE_API_URL`/`EXPO_PUBLIC_API_URL` |

---

## 8. Testes rápidos (sanidade)

```bash
pnpm typecheck                                            # tipos em todo o monorepo
pnpm --filter @isptec/api exec tsx scripts/selftest-compression.ts   # compressão (img+áudio+vídeo)
pnpm --filter @isptec/web build                          # build de produção da Web
```
