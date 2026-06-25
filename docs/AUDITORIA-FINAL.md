# Auditoria Final de Conformidade — ISPTEC News (Grupo 26)

> Documento de auditoria baseado **exclusivamente em evidências do código** e nos requisitos
> oficiais (`teacher-documentation.pdf`). Data: 2026-06-23. Verificação: `pnpm -r typecheck`
> passa em api + web + mobile + shared.

---

## 1. Estado Atual do Projeto

### Funcionalidades implementadas (verificadas no código)

| Área | Evidência |
|---|---|
| API REST | `apps/api/src/app.ts` monta auth, news, categories, users, logs, media, stream, comments |
| Base de dados | Prisma + PostgreSQL — `apps/api/prisma/schema.prisma` (User, Category, News, Media, MediaVariant, Comment, Log, SavedNews) |
| Autenticação | JWT + bcrypt — `routes/auth.ts`, `lib/jwt.ts`, `middleware/auth.ts` |
| **Segurança PKI/CA** | CA própria + certificados de dispositivo + handshake + não-repúdio — `src/security/pki/`, `routes/devices.ts`, `middleware/deviceCert.ts`, `scripts/pki.ts` (ver `docs/SEGURANCA-PKI.md`) |
| Permissões (separação estrita) | `requireRole(...)`: EDITOR=conteúdo, ADMIN=só gestão de contas/certificados/logs |
| Logs | `middleware/requestLogger.ts` + `writeLog()` → tabela `Log` |
| Upload + compressão automática | `routes/media.ts` (multer) → `media-engine/process.ts` (síncrono) |
| Compressão imagem | `media-engine/image.ts` — WebP q80/q50, JPEG q70 + PSNR |
| Compressão áudio | `media-engine/audio.ts` — MP3, AAC, OGG |
| Compressão vídeo | `media-engine/video.ts` — H.264, H.265, VP9 + miniatura |
| Algoritmo próprio | `media-engine/huffman.ts` — Huffman lossless de raiz (encode/decode) |
| Relatório de compressão | `GET /media/:id/report` — original, comprimido, ratio, poupança %, tempo, PSNR |
| Streaming VOD | `media-engine/serve.ts` — `serveWithRange()` (206 Partial Content) |
| Streaming ao vivo | `live/hls.ts` + `live/ingest.ts` (browser→WS→FFmpeg→HLS) + `live/rtmp.ts` |
| Download | `GET /media/:id/download` (`res.download`, original ou variante) |
| Pesquisa | `GET /news?search=` + filtro `?category=` (e agora caixa de pesquisa na Web) |
| Cliente Web | `apps/web` (React + Vite) |
| Cliente Desktop | `apps/desktop` (Electron) |
| Cliente Mobile | `apps/mobile` (Expo / React Native) |
| Extras | comentários, notícias guardadas, TTS, "Resumo do dia", tema, widgets reais |

### Funcionalidades parcialmente implementadas

- **Gestão de perfil:** existe visualização da conta (Web `UserMenu`, Mobile `AccountScreen`) e
  logout, mas **não há endpoint para editar nome/email nem alterar palavra-passe**. → ver Tarefa I-1.
- **Reprodução offline (Mobile):** download via `expo-file-system` implementado; reprodução do
  ficheiro guardado deve ser confirmada em dispositivo (VERIF-M).

### Funcionalidades ausentes / não verificadas em runtime

- **Vídeo demonstrativo (5–10 min)** — entregável obrigatório, ainda por gravar.
- **Cliente Mobile em dispositivo real** — validado por typecheck + bundle Metro, mas não corrido
  em Expo Go neste ambiente.
- **Empacotamento Desktop (instalador)** — `electron-builder` configurado mas instalador não gerado.

### Arquitetura identificada

Monorepo **pnpm + TypeScript**. Backend único (Express + Prisma + PostgreSQL) servindo 3 clientes
por REST + JWT. Núcleo multimédia: `media-engine` (compressão + VOD) e `live` (HLS). Pacote
partilhado `@isptec/shared` com tipos e schemas zod.

### Riscos para a defesa

1. **Mobile não testado em dispositivo** — risco médio. Mitigação: testar com Expo Go e
   `EXPO_PUBLIC_API_URL` apontando para o IP LAN antes da defesa.
2. **Streaming ao vivo ponta-a-ponta no browser** — a ingestão arranca o FFmpeg (verificado),
   mas o vídeo real câmara→HLS deve ser ensaiado (iOS Safari tem `MediaRecorder` limitado;
   usar Android/desktop).
3. **Gestão de perfil incompleta** — pode surgir como pergunta; ter resposta pronta ou
   implementar (Tarefa I-1).
4. **Vídeo demonstrativo em falta** — entregável obrigatório; gravar com o guião em `docs/DEFESA.md`.

---

## 2. Matriz de Conformidade (requisitos oficiais)

Legenda: ✅ Implementado · 🟡 Parcial · ❌ Ausente

### 2.1 Requisitos técnicos obrigatórios (secção 4 do PDF)

| Requisito do Professor | Estado | Evidência |
|---|:--:|---|
| API RESTful | ✅ | `apps/api/src/app.ts` + `routes/*` |
| Base de Dados | ✅ | Prisma + PostgreSQL (`prisma/schema.prisma`) |
| Gestão de Utilizadores | ✅ | `routes/auth.ts`, `routes/users.ts` |
| Upload de conteúdos | ✅ | `routes/media.ts` (multer, até 200 MB) |
| Compressão automática no upload | ✅ | `processMedia()` chamado no handler de upload |
| Gestão de permissões | ✅ | `requireRole()` (ADMIN/EDITOR/READER) |
| Registo de logs | ✅ | `requestLogger` + `writeLog()` → tabela `Log` |
| Streaming dos conteúdos | ✅ | VOD (Range) + Live (HLS) |
| **Cliente: Login** | ✅ | Web `Login.tsx`, Mobile `LoginScreen.tsx` |
| **Cliente: Consulta de conteúdos** | ✅ | Feed + detalhe (3 clientes) |
| **Cliente: Reprodução multimédia** | ✅ | `<video>`/`HlsPlayer` (Web), `expo-video`/`expo-audio` (Mobile) |
| **Cliente: Download** | ✅ | `GET /media/:id/download` + UI |
| **Cliente: Upload** | ✅ | `MediaLab`/`NewsModal` (Web), `UploadScreen` (Mobile) |
| **Cliente: Pesquisa** | ✅ | `GET /news?search=` + caixa de pesquisa na Home (corrigido) |
| **Cliente: Gestão de perfil** | 🟡 | Visualização de conta + logout; falta editar/alterar palavra-passe |

### 2.2 Compressão multimédia (secção 5)

| Requisito | Estado | Evidência |
|---|:--:|---|
| Compressão de imagens (JPEG/PNG/WebP) | ✅ | `image.ts` — WebP, JPEG (PNG suportado no código) |
| Compressão de áudio (MP3/AAC/OGG) | ✅ | `audio.ts` — libmp3lame, aac, libvorbis |
| Compressão de vídeo (H.264/H.265/VP9) | ✅ | `video.ts` — libx264, libx265, libvpx-vp9 |
| Tamanho original | ✅ | `Media.originalSize` |
| Tamanho comprimido | ✅ | `MediaVariant.size` |
| Taxa de compressão | ✅ | `MediaVariant.compressionRatio` + `savingPct` no report |
| Qualidade percebida | ✅ | PSNR (`computePSNR`) nas variantes de imagem |
| Tempo de processamento | ✅ | `MediaVariant.processingMs` |

### 2.3 Streaming (secção 6)

| Requisito | Estado | Evidência |
|---|:--:|---|
| Streaming Sob Demanda (VOD) | ✅ | `serveWithRange()` (206) em `GET /media/:id/raw` |
| Streaming em Tempo Real | ✅ | HLS (`live/hls.ts`, ingestão por browser/RTMP) |
| Play / Pause / Stop | ✅ | Controlos nativos HTML5 `<video controls>` / `expo-video` |
| Avançar / Retroceder | ✅ | Seek por HTTP Range (Accept-Ranges: bytes) |
| Controlo de volume | ✅ | Controlos nativos do player |
| Indicador de progresso | ✅ | Barra nativa do player |

### 2.4 Penalizações (auto-fail) — secção 11

| Item de reprovação automática | Estado |
|---|:--:|
| Sem compressão → reprovação | ✅ **Coberto** (imagem+áudio+vídeo+Huffman) |
| Sem streaming → reprovação | ✅ **Coberto** (VOD + Live) |
| Sem cliente multiplataforma → reprovação | ✅ **Coberto** (Web + Desktop + Mobile) |

---

## 3. Lista de Tarefas Prioritárias (Etapa 3)

### 🔴 Crítico (risco de reprovação) — **nenhum pendente**

Os três itens de reprovação automática estão implementados e verificados. Não há tarefas críticas
de código em aberto. O único item formalmente obrigatório que falta é **não-código**:

- **C-1 — Gravar o vídeo demonstrativo (5–10 min).** Entregável obrigatório (secção 9 do PDF).
  Justificativa: a sua ausência é uma falha de entrega. Impacto: entregável em falta.
  Complexidade: baixa (guião pronto em `docs/DEFESA.md`).

### 🟡 Importante (pode reduzir a nota)

- **I-1 — Gestão de perfil editável.** Adicionar `PATCH /auth/me` (nome/email) e
  `POST /auth/change-password` + ecrã na Web/Mobile. Justificativa: é uma função de cliente
  explicitamente listada (secção 4). Impacto: critério "Funcionalidades" (25%) e UX (10%).
  Complexidade: média.
- **I-2 — Testar o Mobile em dispositivo real (VERIF-M).** Justificativa: o cliente
  multiplataforma é central na avaliação e na demonstração. Impacto: defesa/demonstração.
  Complexidade: baixa.
- **I-3 — Ensaiar o streaming ao vivo ponta-a-ponta** (Android/desktop) antes da defesa.
  Impacto: critério Streaming (15%). Complexidade: baixa.

### 🟢 Opcional (melhorias)

- **O-1 — Gerar instalador Desktop** (`electron-builder`). Mostra "aplicação Desktop" empacotada.
- **O-2 — Página dedicada de comparação de codecs** (UI lado-a-lado das variantes) para valorizar
  a compressão na demo.
- **O-3 — Descompressão Huffman exposta** (botão "descomprimir e verificar" prova lossless ao vivo).

---

## 4. Auditoria do Fluxo de Download (Etapa 4)

**Implementação:** `GET /media/:id/download` em `apps/api/src/routes/media.ts`.

| Verificação | Resultado |
|---|---|
| O download funciona | ✅ Usa `res.download()` do Express (define `Content-Disposition: attachment`) |
| Suporta original e variantes | ✅ `?variant=<label>`; sem variante → ficheiro original |
| Integridade dos ficheiros | ✅ Envia o ficheiro tal-qual do disco (sem transformação) |
| Tratamento de falhas (media inexistente) | ✅ 404 `Media não encontrada`; variante inexistente → 404 |
| Logs | 🟡 Upload/delete são registados; o **download não gera log** (oportunidade de melhoria) |
| Feedback visual (cliente) | ✅ Botões de download na Web/Mobile |

**Causa/impacto/correção do único ponto fraco:** o download não escreve em `Log`. Impacto: baixo
(não é exigido). Correção sugerida (opcional), no handler de download:

```ts
// após validar a media, antes de res.download(...)
await writeLog({ action: 'media.download', userId: req.user?.id ?? null,
  message: `${media.id}${variantLabel ? ' ' + variantLabel : ''}` });
```

**Risco a vigiar:** se a media for apagada do disco mas persistir na BD, `res.download` falha; o
handler de `raw` já valida `existsSync`, mas o de `download` confia no ficheiro existir — convém
acrescentar a mesma verificação `existsSync` antes de `res.download`.

---

## 5. Auditoria do Sistema de Compressão (Etapa 5)

### Imagens — `media-engine/image.ts`
- Biblioteca: **sharp**. Variantes: `webp-q80`, `webp-q50`, `jpeg-q70` (PNG nível 9 suportado).
- Qualidade percebida: **PSNR** real (`computePSNR`, MSE entre original e variante).
- Algoritmo próprio: **Huffman lossless** aplicado aos **pixels em bruto (RGB)** — prova
  compressão real e é a peça anti-plágio.

### Áudio — `media-engine/audio.ts`
- Biblioteca: **fluent-ffmpeg** (binários `ffmpeg-static`). Codecs: **MP3** (libmp3lame 128k),
  **AAC** (128k), **OGG/Vorbis** (q5).

### Vídeo — `media-engine/video.ts`
- Codecs: **H.264** (libx264, crf 28), **H.265/HEVC** (libx265, crf 30), **VP9** (libvpx-vp9,
  crf 34). Escala para 720p, `+faststart`, miniatura gerada.

### Métricas (todas guardadas em `MediaVariant` e expostas em `/media/:id/report`)
`originalSize`, `size`, `compressionRatio`, `savingPct = 1 − 1/ratio`, `processingMs`, `qualityScore` (PSNR).

### Resumo simplificado para a defesa
> "Quando faço upload, a API gera automaticamente várias versões comprimidas. Para imagens uso
> sharp (WebP e JPEG) e meço a qualidade com PSNR; para áudio e vídeo uso o FFmpeg com codecs
> reais — MP3/AAC/OGG e H.264/H.265/VP9. Além disso, implementei do zero um compressor de
> **Huffman** (sem perdas) para demonstrar que percebo o algoritmo por dentro. Cada versão guarda
> o tamanho, a taxa de compressão, o tempo e a qualidade, que mostro no relatório comparativo."

**Validação:** o script `apps/api/scripts/selftest-compression.ts` processa imagem, áudio e vídeo
sem subir a API (prova rápida na defesa). O **Modo Dev** transmite por SSE cada passo do pipeline
em tempo real.

---

## 6. Limpeza do Repositório (Etapa 10) — EXECUTADA

### Documentação redundante eliminada (`git rm`)

Os documentos antigos foram substituídos pelos novos entregáveis e **removidos**:

| Removido | Substituído por |
|---|---|
| `docs/00-plano-mestre.md` | (plano interno; coberto pelo relatório) |
| `docs/01-relatorio-tecnico.md` | `docs/RELATORIO-TECNICO.md` |
| `docs/03-proposta-redesign.md` | (proposta já implementada — histórica) |
| `docs/04-arquitetura-streaming.md` | `docs/RELATORIO-TECNICO.md` §7 (Streaming) |
| `docs/05-auditoria-conformidade.md` | `docs/AUDITORIA-FINAL.md` |
| `docs/06-deploy-zero-cost.md` | (deploy não é requisito) |
| `docs/07-key-points.md` | `docs/DEFESA.md` |
| `docs/08-guia-video-demonstracao.md` | `docs/DEFESA.md` (Parte B) |

As referências a estes ficheiros foram corrigidas nos docs mantidos (manual, ARCHITECTURE,
DIRECTORY_MAP, CURRENT_STATE, READMEs das apps).

### Documentação oficial (entregáveis)

`README.md` · `docs/RELATORIO-TECNICO.md` · `docs/02-manual-utilizador.md` ·
`docs/AUDITORIA-FINAL.md` · `docs/DEFESA.md`.

### Artefactos de runtime
`media/uploads/*`, `media/processed/*` e `media/live/*` já são **gitignored** (só `.gitkeep`
é versionado) — nada a remover do repositório.

### Docs operacionais (mantidos — infraestrutura de desenvolvimento, não submeter)

`CURRENT_STATE.md`, `TASKS.md`, `HANDOFF.md`, `DIRECTORY_MAP.md`, `ARCHITECTURE.md`,
`TEST_PLAN.md` — sistema de comandos interno da equipa; úteis em desenvolvimento mas **não são
entregáveis académicos**.

### ⚠️ Nunca remover

`apps/**`, `packages/**`, `prisma/**`, `package.json`, `pnpm-*.yaml`, `docker-compose.yml`,
`tsconfig*.json`, `scripts/**`, `teacher-documentation.pdf`, `media/**/.gitkeep`.

---

## 7. Checklist Final de Conformidade (Etapa 12)

- [x] API RESTful
- [x] Base de dados (PostgreSQL + Prisma)
- [x] Gestão de utilizadores + autenticação (JWT)
- [x] Gestão de permissões (papéis)
- [x] Registo de logs
- [x] Upload de conteúdos
- [x] Compressão automática (imagem + áudio + vídeo + Huffman)
- [x] Relatório comparativo (tamanho/ratio/tempo/qualidade)
- [x] Streaming VOD (HTTP Range)
- [x] Streaming ao vivo (HLS)
- [x] Controlos do player (play/pause/stop/seek/volume/progresso)
- [x] Download
- [x] Pesquisa + filtro
- [x] Cliente multiplataforma (Web + Desktop + Mobile)
- [x] Segurança básica da comunicação (JWT, bcrypt, helmet, cors, rate-limit, validação)
- [x] README (instalação/configuração/execução)
- [x] Relatório técnico
- [x] Manual de utilização
- [ ] 🟡 Gestão de perfil editável (opcional/importante — I-1)
- [ ] 🔴 Vídeo demonstrativo (5–10 min) — **gravar** (C-1)
- [ ] 🟡 Mobile testado em dispositivo (I-2)
- [ ] 🟢 Instalador Desktop (O-1)
