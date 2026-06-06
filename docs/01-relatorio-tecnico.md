# ISPTEC News — Relatório Técnico

> Projeto Final de **Multimédia 2026** · **Grupo 26 — Plataforma de Notícias Multimédia**.
> Referência de avaliação: `teacher-documentation.pdf`. Planeamento: [`00-plano-mestre.md`](00-plano-mestre.md).

---

## 1. Objetivo e enquadramento

O **ISPTEC News** é uma plataforma distribuída (cliente-servidor) para **criar, comprimir,
transmitir (streaming) e consumir** notícias com **texto, imagem, áudio e vídeo**. Demonstra, num
caso de uso real, os conceitos de multimédia da cadeira: compressão (codecs reais + algoritmo
próprio), streaming (VOD por HTTP Range e tempo real por MJPEG), arquitetura cliente-servidor com
**três clientes** (Web, Desktop, Mobile), autenticação/permissões, registo de logs e segurança.

---

## 2. Arquitetura

Backend único (API REST) servindo três clientes que partilham tipos via `@isptec/shared`.

```
Web (React/Vite) ─┐
Desktop (Electron)─┼─ REST + JWT ─▶ API (Node/Express/Prisma) ─▶ PostgreSQL
Mobile (Expo/RN) ─┘                     │  ├─ media-engine (sharp/ffmpeg + Huffman)
                                        │  └─ storage local /media (uploads + processed)
```

- **API:** Node + Express + Prisma (TypeScript). Rotas: `auth`, `news`, `categories`, `users`,
  `logs`, `media`, `stream`, `health` (montagem em [`apps/api/src/app.ts`](../apps/api/src/app.ts)).
- **BD:** PostgreSQL 16 (Docker em dev). Modelo em
  [`schema.prisma`](../apps/api/prisma/schema.prisma): `User`, `Category`, `News`, `Media`,
  `MediaVariant`, `Comment`, `Log`.
- **Clientes:** Web (React), Desktop (Electron embrulha o build da Web; dev carrega o Vite,
  produção serve `dist` via protocolo `app://`), Mobile (Expo/React Native + React Navigation).
- **Configuração de ambiente:** o URL da API é uma única variável por cliente
  (`VITE_API_URL` na Web/Desktop, `EXPO_PUBLIC_API_URL` no Mobile) → troca dev↔produção trivial.

Diagramas completos (mermaid) na secção 3 do [plano-mestre](00-plano-mestre.md).

---

## 3. Compressão multimédia (híbrida)

Estratégia **híbrida**: codecs reais (via `sharp`/`ffmpeg`) **+ algoritmo próprio (Huffman)** para
demonstrar domínio do conceito. Núcleo em [`apps/api/src/media-engine/`](../apps/api/src/media-engine).

| Tipo | Ferramenta | Variantes geradas |
|---|---|---|
| Imagem | `sharp` | WebP (q80/q50), JPEG (q70) + **Huffman próprio** (lossless) |
| Áudio | `ffmpeg` | MP3 128k, AAC 128k, OGG q5 |
| Vídeo | `ffmpeg` | H.264 720p, H.265 720p, VP9 720p + thumbnail |

Cada variante regista em `MediaVariant`: **tamanho**, **taxa de compressão**, **tempo de
processamento** e **qualidade** (PSNR na imagem) — materializando o relatório comparativo exigido,
exposto em `GET /media/:id/report`.

### 3.1 Resultados medidos (self-test)

Saída de [`scripts/selftest-compression.ts`](../apps/api/scripts/selftest-compression.ts)
(imagem sintética 800×600; áudio sine 4 s; vídeo `testsrc` 640×480 4 s):

| Variante | Tamanho | Taxa | Qualidade |
|---|---|---|---|
| Imagem original (PNG) | 103,0 KB | 1,00× | — |
| webp-q80 | 4,6 KB | **22,2×** | PSNR 48,0 dB |
| webp-q50 | 3,2 KB | **32,1×** | PSNR 45,0 dB |
| jpeg-q70 | 8,9 KB | 11,6× | PSNR 45,4 dB |
| **huffman-own** (pixels brutos) | 1104,7 KB ← 1406,3 KB | **1,27×** | sem perdas (round-trip ✓) |
| Áudio: mp3-128k / aac-128k / ogg-q5 | — | 5,4× / 5,5× / **29,9×** | — |
| Vídeo: h264 / h265 / vp9 720p | — | 1,7× / **1,8×** / 1,5× | — |

> Nota: as taxas de **vídeo** são baixas porque a fonte de teste (`testsrc`) é sintética e já muito
> compacta; em footage real as taxas são bastante superiores. O Huffman próprio é **lossless**
> (taxa modesta mas reversível: `decode(encode(x)) == x`), provando o conceito do núcleo do JPEG
> (DCT → quantização → **Huffman**).

---

## 4. Streaming (15% + auto-fail)

Streaming **real**, não simulado.

- **VOD (sob demanda):** `GET /media/:id/raw` usa
  [`serveWithRange()`](../apps/api/src/media-engine/serve.ts) — responde `206 Partial Content`
  com `Accept-Ranges: bytes`. Os elementos HTML5 `<video>`/`<audio>` (Web/Desktop) e `expo-av`
  (Mobile) fazem **seek/pause/play reais**, cumprindo todos os controlos de reprodução exigidos.
- **Tempo real (Live):** `GET /stream/live` ([`routes/stream.ts`](../apps/api/src/routes/stream.ts))
  emite **MJPEG** (`multipart/x-mixed-replace`): o servidor gera e empurra frames JPEG (via `sharp`)
  a cada 500 ms; o cliente mostra-os num `<img>`. É transmissão ao vivo genuína, sem libs de cliente.
- **Offline:** `GET /media/:id/download` entrega a variante processada; o Mobile guarda-a com
  `expo-file-system` e reproduz a partir do ficheiro local.

---

## 5. Funcionalidades e domínio

- **Autenticação:** registo/login com **JWT** + **bcrypt** (`/auth/*`); token guardado no cliente.
- **Permissões (roles):** `ADMIN | EDITOR | READER` via middleware `requireRole(...)`
  ([`middleware/auth.ts`](../apps/api/src/middleware/auth.ts)) por rota (criar/editar notícias exige
  EDITOR/ADMIN; gestão de utilizadores exige ADMIN).
- **Notícias:** CRUD com rascunho/publicação, slug automático, categorias, contagem de visualizações.
- **Media:** upload (`multer`) → pipeline de compressão síncrono → variantes + relatório.
- **Registo de logs:** `requestLogger` + `writeLog` gravam ações na tabela `Log` (ecrã de admin).

---

## 6. Segurança

| Mecanismo | Implementação |
|---|---|
| Autenticação | JWT (`lib/jwt.ts`) + bcrypt |
| Autorização | `requireAuth` + `requireRole` por rota |
| Validação de input | `zod` (schemas em `@isptec/shared`) |
| Cabeçalhos HTTP | `helmet` (com `crossOriginResourcePolicy: cross-origin` para servir media) |
| CORS | `cors` configurável por `CORS_ORIGIN` |
| **Rate-limiting** | [`middleware/rateLimit.ts`](../apps/api/src/middleware/rateLimit.ts): `apiLimiter` global (ignora streaming/health) + `authLimiter` **20/15 min** em login/registo (anti força-bruta) |
| Logs de auditoria | tabela `Log` |

Verificado: `POST /auth/login` devolve `429` exatamente após 20 tentativas/IP; streaming e health
não são limitados. Em produção (atrás de proxy) definir `app.set('trust proxy', 1)`.

---

## 7. Rastreabilidade requisito → evidência

| Requisito (professor) | Onde | Evidência na defesa |
|---|---|---|
| API RESTful + BD | `apps/api` + Prisma/PostgreSQL | `GET /health` liga à BD |
| Gestão de utilizadores + auth | `/auth`, `/users` | Login ao vivo; alterar role (admin) |
| Permissões | `requireRole` | Ação sem permissão → `403` |
| Upload + compressão automática | `/media` + media-engine | Ecrã MediaLab: relatório antes/depois |
| Relatório comparativo | `MediaVariant` + `/media/:id/report` | Tabela com taxa/tempo/qualidade |
| Streaming VOD | `/media/:id/raw` (Range/206) | Seek/pause/play num vídeo |
| Streaming tempo real | `/stream/live` (MJPEG) | Página "Ao vivo" |
| Download / offline | `/media/:id/download` | Guardar offline no Mobile e reproduzir |
| Cliente multiplataforma | Web + Desktop + Mobile | Abrir os 3 clientes |
| Registo de logs | `requestLogger` + `Log` | Ecrã admin com logs |
| Segurança da comunicação | helmet/cors/JWT/zod/rate-limit | Justificar decisões; mostrar `429` |

---

## 8. Verificação e qualidade

- **Compressão:** `selftest-compression.ts` (imagem + áudio + vídeo + Huffman round-trip) — passa.
- **Streaming:** `serveWithRange` responde `206`; live emite frames JPEG contínuos.
- **Segurança:** rate-limiter testado em runtime (429 ao 21.º pedido de login).
- **Clientes:** Web `tsc` + `vite build` OK; Desktop smoke test (janela `app://`) OK; Mobile `tsc`
  + bundle Metro (804 módulos) OK.
- **Tipos partilhados:** `@isptec/shared` reutilizado pelos clientes (menos divergência de contrato).

---

## 9. Limitações conhecidas e trabalho futuro

- Mobile validado por typecheck + bundle; falta execução em dispositivo (Expo Go) — requer
  `EXPO_PUBLIC_API_URL` no IP da rede local.
- Desktop corre a partir do build (`pnpm desktop`); falta empacotar instaladores (`electron-builder`).
- Streaming HLS (`.m3u8` + segmentos) e DCT+quantização ficam como evolução (o núcleo Huffman já
  demonstra o conceito).
- `Comment` existe no modelo de dados mas ainda sem rotas/UI.
- Deploy em produção (Render/Fly + PostgreSQL gerido) é bónus; a demo principal é local.
