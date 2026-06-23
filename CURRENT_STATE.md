# CURRENT_STATE — ISPTEC News

> Estado operacional atual (fonte de verdade para `status`, `continue`, `resume-work`).
> Atualizado: **2026-06-20** · branch `main` · **Fase 7 COMPLETA + refactor do início de transmissão**.

## ⭐ Refactor do início de transmissão (2026-06-20) — verificado em runtime

Reescrita completa do fluxo "Iniciar transmissão" para **simplicidade e zero apps externas**.

- **Bug corrigido:** a página `/ao-vivo` arrancava a transmissão automaticamente ao clicar; agora o
  botão **abre o `LiveModal`** (ponto de entrada único) e **nada arranca sem o utilizador confirmar**.
- **Modal com 3 fontes** (`components/LiveModal.tsx`), todas no browser, **sem instalar nada**:
  1. **Telemóvel** — QR (`window.location.origin/transmitir?key&t`) abre a página pública
     `pages/Broadcast.tsx`; pede câmara/mic, preview, iniciar/parar; autoriza-se com **token de broadcast**.
  2. **Webcam** — `getUserMedia` direto, preview + confirmar.
  3. **Ficheiro de Vídeo** (substitui "Transmissão Simulada" no modal) — drag&drop + seleção, validação
     de formato, preview, `video.captureStream()` como fonte.
- **Decisão técnica:** ingestão **MediaRecorder → WebSocket (`/stream/ingest`) → FFmpeg (`pipe:0`) → HLS**
  (preferida a WebRTC — ver [docs/04](docs/04-arquitetura-streaming.md) §2). Hook único `lib/useBroadcast.ts`
  reutilizado pelas 3 fontes. **RTMP** (`live/rtmp.ts`) **mantido como via legacy/opcional**, fora do modal.
- **Backend:** `live/ingest.ts` (servidor `ws`), `live/hls.ts` (FFmpeg→HLS + estado WS), `index.ts`
  (`http.Server` + `attachIngest`, bind `0.0.0.0`); rotas `POST /stream/broadcast-token` e `POST /stream/stop`;
  token de broadcast no `lib/jwt.ts`. Tipos `LiveStatus`/`LiveMode`/`IngestSource` em `@isptec/shared`.
- **Sem localhost hardcoded:** `WS_BASE` derivado em `lib/api.ts`; `vite.config.ts` com `API_PROXY_TARGET`
  por env, `ws:true`, `host:true`, `allowedHosts` (túnel). CORS de dev = `*`.
- **Exposição pública (dev):** `pnpm dev:tunnel` → **Cloudflare Quick Tunnel** (`scripts/dev-tunnel.mjs`,
  dep `cloudflared`): URL HTTPS efémero (necessário para a câmara do telemóvel = contexto seguro) + WSS.
- **Verificação:** typecheck API+Web+Mobile ✅, build Web ✅, e **smoke test em runtime** ✅
  (`/stream/live/status` nova forma; `/broadcast-token` autenticado emite token; upgrade WS 401/400 sem auth
  e **abre + arranca FFmpeg** com token válido). ⚠️ Falta validar o **vídeo ponta-a-ponta no browser**
  (webcam/telemóvel reais) — recomendado antes da defesa.
- **Limitação conhecida:** iOS Safari tem `MediaRecorder` limitado → fonte Telemóvel robusta em
  **Android + desktop** (feature-detection + mensagem).

## Resumo (3–5 linhas)

Monorepo pnpm/TypeScript a correr. **Fases 0–4 concluídas.** Os **três itens de reprovação
automática** estão cobertos e verificados: compressão (selftest passa), streaming (VOD Range +
live MJPEG) e **cliente multiplataforma** — existem agora **3 clientes**: Web (React), Desktop
(Electron) e **Mobile (Expo/React Native)**. Falta sobretudo polish de segurança (Fase 5) e os
entregáveis/documentação de defesa (Fase 6).

## Fase atual

**Fase 5 ✅ · Fase 6 quase ✅ · Fase 7 (feedback de produto) 🔵 em curso.** Segurança ✅; F5.3 ✅
polish UX Web; F6.3 ✅ seed rico (verificados no browser). Entregáveis: [relatório](docs/RELATORIO-TECNICO.md),
[manual](docs/02-manual-utilizador.md), [TEST_PLAN](TEST_PLAN.md), [auditoria](docs/AUDITORIA-FINAL.md), [defesa](docs/DEFESA.md).
**Fase 7 ✅ COMPLETA:** F7.1 streaming RTMP→HLS · F7.2 CMS multi-formato · F7.3 metadados · F7.4 Modo
Dev/Demo · F7.5 **redesign** · F7.6 auditoria de UX · F7.7 docs/conformidade · F7.8 TTS · F7.9 "Resumo do
dia" — todas ✅. Bónus B8 comentários ✅. Restam só tarefas manuais (VERIF-M, empacotar Desktop, vídeo).

## Concluído (Fases 0–3 + parte da 4)

- **Fase 0:** monorepo, Docker PostgreSQL, Prisma schema+migração+seed, `/health`, Web base.
- **Fase 1:** auth JWT (register/login/me), roles, CRUD notícias (draft/publish), categorias,
  utilizadores, logs; Web: feed, detalhe, login/registo, gestão, editor, admin.
- **Fase 2 🔴:** upload, media-engine (image/audio/video + **Huffman próprio**), `MediaVariant`,
  `GET /media/:id/report`; Web: MediaLab. **Verificado** via `selftest-compression.ts`.
- **Fase 3 🔴:** VOD por HTTP Range (`/media/:id/raw`, 206), download offline, live MJPEG
  (`/stream/live`); Web: player + página Live.
- **Fase 4.1 ✅ Desktop (Electron):** `apps/desktop` (main.cjs com modos dev/prod + protocolo
  `app://` com fallback SPA). Smoke test passou.
- **Fase 4.2 ✅ Mobile (Expo/React Native):** `apps/mobile` — login, feed (pull-to-refresh),
  detalhe, **player VOD** (expo-av, HTTP Range), **upload + relatório de compressão**
  (expo-image-picker) e **offline** (expo-file-system). Reutiliza tipos de `@isptec/shared`.
  Verificado: typecheck + **bundle Metro** (804 módulos) OK.
- **Fase 4.3 ✅ Config de ambiente:** `apps/web/src/lib/api.ts` exporta `API_BASE` (`VITE_API_URL`,
  fallback `/api`); mobile usa `EXPO_PUBLIC_API_URL`. `apps/web/.env.production` → `:3333`.
- **Fase 5.3 ✅ Polish de UX (Web):** `components/States.tsx` (`Loading`/`ErrorState` com retry);
  Feed e Manage tratam erros em vez de os engolir; capa renderizada no feed (thumbnail 16:9) e no
  detalhe (hero); `onError` no live MJPEG. **Verificado no browser** (incl. estado de erro real 404).
- **Fase 6.3 ✅ Seed de demonstração rico:** 7 notícias publicadas + 1 rascunho, vistas variadas,
  ordem cronológica determinística; 5 capas distintas + galeria de 3 imagens + áudio + vídeo, tudo
  comprimido pelo pipeline real. Seed **declarativo/idempotente** (`update` autoritário; media
  incremental por `originalName`). **Verificado no browser** (feed, detalhe, galeria, vídeo, live).
- **Correção:** `SyntaxError` (variável `raw` duplicada) no selftest — o script nunca tinha corrido.

## Próximo passo

**Fase 7 — Feedback de produto (Euronews-grade): ✅ COMPLETA.** Propostas/auditoria:
[redesign](docs/03-proposta-redesign.md) (implementado) · [streaming RTMP→HLS](docs/04-arquitetura-streaming.md) ·
[conformidade](docs/05-auditoria-conformidade.md) · [TEST_PLAN](TEST_PLAN.md).
**Próximas ações são manuais** (não-bloqueantes): VERIF-M (Mobile em dispositivo via Expo Go),
F4.4 (empacotar Desktop com electron-builder) e F6.2 (gravar vídeo de demonstração).

**F7.1 streaming ✅ · F7.2 CMS multi-formato/editar ✅ · F7.3 metadados ✅ · F7.4 Modo Dev/Demo ✅ ·
F7.6 auditoria de UX ✅ · F7.8 ouvir notícia (TTS) ✅ · F7.9 "Resumo do dia" ✅** (verificados no browser;
Mobile TTS via expo-speech por typecheck+bundle). O **Modo Dev** transmite por SSE os eventos do pipeline
(compressão imagem/áudio/vídeo + Huffman, HLS, RTMP, sistema) — prova ao vivo dos auto-fail. O **TTS** lê
o detalhe em voz pt-PT. O **"Resumo do dia"** (FAB) mostra o top 5 (`/news/digest`) e lê-o em voz alta.
A **F7.6** acrescentou filtro de categorias no feed (expõe `GET /news?category=`) e tornou o cabeçalho
responsivo (sem overflow a 375px). A **F7.7** atualizou o TEST_PLAN e reescreveu a auditoria de
conformidade ([docs/05](docs/05-auditoria-conformidade.md)) com um mapa de prontidão por critério/peso.
**Fase 7 completa, incluindo o redesign (F7.5).** Implementado também o bónus **B8 comentários**
(rotas + UI no detalhe nas duas plataformas).

**Revisão de fluxos da Home (2026-06-07):** landing reestruturada para hierarquia clara e sem
duplicação — Hero (1 destaque + widgets) → **Últimas (carrossel)** → **Ao Vivo** (secção própria,
fonte única `/stream/live/status`) → **Todas as notícias** (consolidadas, filtráveis); grelha bento
removida. **Mercados com dados REAIS** (open.er-api.com + CoinGecko; sem mocks). Navegação agrupada
(menu **Gestão**). **README** reescrito (autossuficiente: setup→run→build→instalador→arquitetura).
**electron-builder** configurado em `apps/desktop` (instalar a pedido; `dist`/`dist:dir`) — build local
de instalador bloqueado só por lock do Windows Defender (config correta e standard).
**Paridade do Mobile (Expo):** o app passou a ter **comentários, filtro de categorias e "Resumo do dia"**
(além do TTS já existente) — só o Modo Dev fica de fora (painel SSE de bastidores, sem sentido no telemóvel).
Verificado por typecheck + bundle Metro (808 mód.); falta correr em dispositivo (VERIF-M).
Pendentes anteriores (opcionais): vídeo de demo (F6.2), VERIF-M, empacotar Desktop (F4.4).

**Revisão Final de UX da Home (2026-06-07):** seis ajustes implementados e **verificados no browser**
(API+Web a correr, dados reais):
1. **Tema com 3 modos** — `system` (default, segue `prefers-color-scheme` e reage em tempo real),
   `light`, `dark`; escolha manual sobrepõe-se e persiste. Refeito `lib/theme.tsx` (`choice`/`theme`/
   `setChoice`/`cycle`), script de pré-pintura em `index.html`, `ThemeToggle` cicla os 3, e seletor
   segmentado nas **Definições**. (Verificado: utilizador novo com SO escuro → dark; override Claro
   persiste; cabeçalho cicla sistema→claro→escuro.)
2. **Hero** — 1 único card; label "Em destaque" reposicionada como **kicker discreta** no canto sup.
   esq. (consistente com badges de live/vídeo), removida de cima do título → menos ruído.
3. **Últimas notícias** — carrossel substituído por **lista minimalista escaneável** (só título + data
   + snippet curto de 1 linha; sem imagens/vídeos; label discreta).
4. **Live** — componente **base único** `components/LiveCard.tsx` (`useLiveStatus` + `LiveCard`) usado
   pela secção da Home **e** pela página `/ao-vivo`; o card nunca desaparece (estado base "BREVEMENTE").
5. **Página Ao Vivo** — player no topo (LiveCard) → info → **notícias relacionadas** em cards verticais
   (grelha, sem carrossel).
6. **Definições** minimalistas (Tema + Modo Dev) e **Mercados/Tempo** confirmados com **dados reais**
   (sem mocks). Web typecheck + build de produção passam.

**Paridade de Tema no Mobile (2026-06-07):** o cliente Expo passou a ter o **mesmo sistema de 3 modos**
da Web (regra obrigatória §6). `apps/mobile/src/lib/theme.ts` virou **`theme.tsx`** com paleta `light`
(valores originais) + paleta `dark` (espelha `:root[data-theme="dark"]` da Web) e um `ThemeProvider` +
`useTheme()` que resolve `system` via `useColorScheme()` do React Native; a escolha `system|light|dark`
persiste em **AsyncStorage** (`isptec_theme`, mesmo padrão do `tokenStore`), com `system` como default.
Todas as telas/componentes que liam o objeto estático `theme` passaram a consumir `useTheme()` (estilos
via fábrica `makeStyles(theme)`). Novo `components/ThemeToggle.tsx` (cicla sistema→claro→escuro) no
**cabeçalho do Feed**; `App.tsx` envolve tudo no `ThemeProvider`, deriva o tema do React Navigation e a
`StatusBar` do tema efetivo. `fmtBytes()` mantido. **Verificado:** `tsc --noEmit` limpo + **bundle Metro
(811 mód.)** OK; falta confirmar o dark em dispositivo (parte do VERIF-M).

**Reestruturação Home/Live/Conta (2026-06-07):** ronda de UX **verificada no browser** (API+Web,
dados reais, sessões admin e anónima):
1. **Últimas notícias** — máx. **2 itens** (texto leve) + link **"Ver mais"** que faz *scroll suave*
   para a lista completa (`#todas-noticias`).
2. **Filtro de categorias** — corrigido: **"Todas" mostra sempre todo o acervo** (nunca vazio se houver
   dados); fallback repõe a lista completa se o filtro não casar nada. (Verificado: Todas=6 → Tecnologia=2
   → Todas=6.)
3. **Live** — `LiveCard` redesenhado: parece **sempre um player** (placeholder de vídeo + ▶ quando
   offline; HLS quando ativo), badge flutuante **AO VIVO / OFF AIR**, overlay de **hover com título
   amigável** (sem jargão); na Home é *preview clicável* (sem controlos) e em `/ao-vivo` é *player com
   controlos*. Removido o título de secção "Ao Vivo" e **todo o texto técnico** da área de utilizador.
4. **Hero** — mostra **só o título** (+ kicker "Em destaque"); removidas descrição/metadata → foco único.
5. **User dropdown** (`components/UserMenu.tsx`) no canto sup. direito centraliza **Tema (3 modos)** +
   **Definições** (todos) e, **só para ADMIN**, **Modo Programador** + **Utilizadores e logs** + Entrar/Sair.
   Removidos o `ThemeToggle` do cabeçalho (apagado) e o link "Definições" da nav.
6. **Separação técnica** — o `DevPanel` e o toggle de Modo Dev só existem para **ADMIN autenticado**
   (Layout: `devMode && role==='ADMIN'`); confirmado que utilizador anónimo (mesmo com flag forçada) **não**
   vê painel/toggle/admin. O lab **Media & Compressão** mantém-se atrás do menu Gestão (editor/admin),
   pois demonstra a compressão (auto-fail). Web `tsc` + build de produção passam.

**Centralização admin + modais (2026-06-07):** reestruturação **faseada e verificada no browser** (E2E
com API+Web, dados reais). Decisões prévias do utilizador: **fonte de live = RTMP+QR (infra atual)** e
**âmbito = tudo, faseado**.
1. **Dropdown único** (§1) — removida a página/opção **Definições** (apagada `Settings.tsx`); o
   `UserMenu` passa a ter header com o nome + **Tema** (tooltips, sem descrições permanentes) +
   **Notícias** (Adicionar/Gerir/Iniciar transmissão, editor/admin) + **Administração** (Modo Programador,
   Media&Compressão, Utilizadores — só ADMIN). Removido o `ManageMenu` da nav (apagado). (Verificado.)
2. **Criação de notícias por modal** (§2/§7) — `components/{Modal,NewsModal}.tsx` + contexto global
   `lib/ui.tsx` (`UIProvider`/`useUI`, evento `isptec:news-changed`). Campos: título, resumo, categoria,
   conteúdo, **capa (obrigatória)**, vídeo opcional e **pré-visualização** ao vivo. **Gate**: não publica
   sem média. `Manage` ganhou **Adicionar/Iniciar transmissão** e edição rápida via modal. **E2E
   verificado**: injetei capa real → Publicar → notícia PUBLISHED com cover IMAGE comprimida (e limpei-a).
3. **Transmissão por modal multi-fonte** (§3) — `components/LiveModal.tsx`: escolher fonte (**telemóvel
   QR**, **webcam/OBS**, **externo**, **simulada**) — **nunca arranca sozinho**. QR (dep nova `qrcode`)
   codifica `rtmp://<host>:1935/live/isptec`. **Verificado**: 4 fontes, QR data-URL + campos RTMP,
   simulada **start→AO VIVO→stop**.
4. **Live card** (§4) — `LiveCard`: estados **LIVE/PREPARAÇÃO/OFF**, **sem autoplay** — o vídeo só
   reproduz em **hover** (pausa ao sair). Corrigido `HlsPlayer` para preferir **hls.js** (Chrome/Firefox)
   e cair para HLS nativo só no Safari — fix de reprodução real. (Verificado: sem autoplay; readyState 4.)
5. **Interações** (§5) — `VideoCard` reproduz só em **hover** (sem IntersectionObserver); imagens dos
   cards com **zoom suave** (scale 1.05, transição 0.35s) ao hover. (Verificado: regras CSS aplicadas.)
6. **Media & Compressão** (§6) — reposicionada como **ferramenta de admin** (link só na secção
   Administração do dropdown). Notas: rotas `/gerir/nova|editar` (Editor) ficam como **gestão avançada**
   de galeria/áudio (não removidas para não perder capacidade). Web `tsc` + build passam; consola limpa.

**Documentação (2026-06-07):** **`TEST_PLAN.md` reescrito** para o estado atual; **novo guia de
deploy zero-cost** [`docs/06-deploy-zero-cost.md`](docs/06-deploy-zero-cost.md) (Neon + Fly.io/Render +
Vercel, com Dockerfile/fly.toml e restrições de free tier — live RTMP precisa de TCP 1935 → Fly; media
efémera sem volume). **Sincronizados também:** `docs/02-manual-utilizador.md` (fluxos por dropdown/
modais/tema/hover), `ARCHITECTURE.md` (nova §9 — UI: UIProvider/UserMenu/News·LiveModal/LiveCard) e
`DIRECTORY_MAP.md` (componentes/páginas atuais; ficheiros removidos).

**Auditoria de fluxos (2026-06-07):** corrigido o único fluxo **órfão** — a página de **edição
avançada** (`/gerir/editar/:id`, gestão de **galeria/áudio/remover média**) deixara de ter link após os
modais; o `NewsModal` em modo edição passa a ligar para ela ("gestão avançada de multimédia →").
Limitações **conhecidas e por desenho** (não bugs): live "Webcam/Externo" usa RTMP (sem captura WebRTC
no browser); o modal de notícia cria com capa+vídeo (galeria/áudio só na edição avançada); **Mobile**
continua tema claro-único e sem os modais admin (cliente leitor/upload). **Falta (opcional/bónus):**
executar o deploy, VERIF-M (Mobile em dispositivo), empacotar Desktop (F4.4, config pronta), vídeo de
demo (F6.2).

**Upgrade Mobile Expo SDK 52 → 54 (2026-06-07):** o Expo Go (iOS) só suporta o SDK mais recente, pelo
que a app (SDK 52) deixou de abrir. **Atualizada para SDK 54** (React 19.1, React Native 0.81.5).
Versões alinhadas por `expo install --fix` (escritas à mão por causa do lock do prisma generate no
`postinstall`; instalado com `pnpm install --ignore-scripts`). **Migração de código** (breaking changes
do SDK 54): `expo-av` **removido** → `expo-video` (`useVideoPlayer`/`VideoView`) + `expo-audio`
(`useAudioPlayer`) em `MediaPlayer.tsx`; `expo-file-system` → import `/legacy` (documentDirectory/
downloadAsync); `ImagePicker.MediaTypeOptions.All` → `mediaTypes: ['images','videos']`; removido o
plugin `expo-av` do `app.json`. **Verificado:** `tsc --noEmit` (Mobile **e** Web) OK + **bundle Metro
(iOS, 865 módulos)** OK.
⚠️ **`@types/react` do Mobile fica em `^18.3.18`** (não 19) **de propósito**: a Web usa React 18 e, num
monorepo pnpm, ter `@types/react@19` como dep **direta** do Mobile faz o tipo 19 vazar para o typecheck
da Web (erro "Routes cannot be used as a JSX component"). Com o Mobile a declarar 18, o 19 fica só como
peer **transitivo** do react-native 0.81 (ignorado por `skipLibCheck`) e ambos os typechecks passam.
**Não voltar a pôr `@types/react@19` no Mobile.**
⚠️ O `postinstall` (`prisma generate`) falha com **EPERM** (lock do Windows Defender) se houver um
processo Node a usar o engine — fechar a API/Defender e repetir, ou usar `pnpm install --ignore-scripts`.

> Nota: para obter o seed rico numa BD já populada, basta `pnpm db:seed` — o seed é declarativo
> (o bloco `update` faz convergir o conteúdo/vistas/capa para o estado de demonstração).

## Como arrancar (Zero Fricção)

```bash
pnpm install
pnpm start:all   # Inicia tudo: Docker, BD, API, Web, Desktop e Mobile (com IP auto-injetado)
```
Login demo: `admin@isptec.local` / `admin123`.

## Riscos / bloqueios

- ✅ **ffmpeg**: RESOLVIDO/VERIFICADO — `selftest-compression.ts` processa imagem, áudio e vídeo
  (H.264/H.265/VP9) com sucesso.
- ⚠️ **Mobile não foi corrido em dispositivo/emulador** neste ambiente — verificado só por
  typecheck + bundle Metro. **Antes da defesa:** abrir com Expo Go e definir `EXPO_PUBLIC_API_URL`
  para o **IP LAN** da máquina (não `localhost`).
- ⚠️ **Porta 3333** (não 3000) — 3000 ocupada por outra app local ("Mirantes 2.0").
- ⚠️ **Empacotamento Desktop**: `start`/`desktop` abrem a app real, mas instaladores
  (electron-builder) ainda não estão configurados.

---

### Grupo 26 - Elementos
- **Dálcio Garcia:** 20170796
- **Osvaldo Marcolino:** 20210423

**Professor:** Bongo Cahisso

---
