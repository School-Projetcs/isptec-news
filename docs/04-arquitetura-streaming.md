# Arquitetura de Streaming ao Vivo — ISPTEC News

> Resposta ao feedback de produto, secção 4 ("streaming real"). Atualizado: **2026-06-20**.
> Estado: **✅ IMPLEMENTADO E VERIFICADO**.
>
> **Via principal (browser, sem apps externas):** `getUserMedia`/`captureStream` → **MediaRecorder**
> → **WebSocket** (`/stream/ingest`) → **FFmpeg** (`pipe:0`) → **HLS** → `hls.js`. Cobre as três fontes
> do modal: **Telemóvel**, **Webcam** e **Ficheiro de Vídeo**, todas no próprio browser, sem instalar nada.
> Código: `apps/api/src/live/ingest.ts` + `live/hls.ts`; cliente `apps/web/src/lib/useBroadcast.ts`.
>
> **Via opcional (legacy, fora do modal):** ingestão **RTMP** via `node-media-server` v4 + FFmpeg → HLS,
> mantida para encoders externos (OBS) e para preservar o encadeamento **RTMP + FFmpeg + HLS**.
> Código: `apps/api/src/live/rtmp.ts` + `live/hls.ts`. O MJPEG sintético continua como pré-visualização legacy.

## 1. Cenário-alvo (do enunciado/feedback)

```
Jornalista (OBS / telemóvel / câmara)
        │  publica vídeo via RTMP
        ▼
  Servidor de ingestão (RTMP)  ──FFmpeg──►  HLS (.m3u8 + .ts)
        │                                        │
        │                                        ▼
        └──────────────►  Distribuição HTTP  ──►  Utilizadores (player HLS no browser)
```

## 2. Decisão técnica — ingestão a partir do browser (sem apps externas)

**Captura no browser com `MediaRecorder` + transporte por `WebSocket` → `FFmpeg (pipe:0)` → HLS + `hls.js`.**

Requisito do produto: o utilizador final **não instala nenhuma aplicação** (nem DroidCam/Iriun/OBS).
Como o browser **não consegue produzir RTMP**, é preciso uma via browser→servidor. Avaliámos duas:

| Critério | **MediaRecorder + WS → FFmpeg → HLS** (escolhida) | WebRTC (SFU/WHIP) |
|---|---|---|
| Cliente | 100% nativo (`getUserMedia`/`captureStream` + `MediaRecorder` + `WebSocket`) | `RTCPeerConnection` + sinalização |
| Servidor | 1 dep leve (`ws`) + FFmpeg já existente | media server (mediasoup/werift/Pion) + ICE/STUN/TURN |
| Reutilização | **Reutiliza 100% a distribuição HLS atual** | exige ainda WebRTC→FFmpeg p/ HLS |
| Deploy | HTTP/WSS — passa por qualquer túnel/CDN, **sem porta RTMP** | precisa de UDP/TURN |
| Latência | ~4–8 s (HLS) | ~1 s |

**Decisão:** a opção A é a mais simples e robusta para o alvo real da defesa (Android + desktop),
adiciona apenas a lib `ws` e reaproveita todo o caminho HLS. O WebRTC traria latência menor à custa de
dependências pesadas e frágeis — desproporcional ao requisito. As **três fontes do modal** (telemóvel,
webcam, ficheiro) convergem para **o mesmo pipeline** (só muda a origem do `MediaStream`).

> **Via RTMP (legacy/opcional):** mantida em paralelo via `node-media-server` (1 pacote npm) + FFmpeg,
> para encoders externos e para preservar o encadeamento clássico **RTMP + FFmpeg + HLS**. Não aparece no modal.

## 3. Fluxo de dados (vias de ingestão)

```
 (A) Browser  ─getUserMedia/captureStream─► MediaRecorder ─WS binário─► /stream/ingest
     telemóvel/webcam/ficheiro                                     └─ FFmpeg (pipe:0) → HLS ─┐
                                                                                              │
 (B) "Simulada" (FFmpeg: demo/testsrc → HLS direto p/ disco)  ────────────────────────────── ┤  /media/live/<key>/
                                                                                              │   index.m3u8 + *.ts
 (C) OBS/encoder ─RTMP→ node-media-server :1935 ─postPublish─► FFmpeg → HLS  (legacy) ─────── ┘
                                                                                              ▼
                                          Express  GET /stream/hls/<key>/index.m3u8
                                                                                              │
                                                                                              ▼
                                                hls.js  →  <video> (player único: LiveCard)
```

- **Via A — browser (principal, sem apps):** o cliente captura (câmara via `getUserMedia`, ficheiro via
  `video.captureStream()`), grava com `MediaRecorder` (WebM/VP8+Opus) e envia chunks por **WebSocket**
  para `/stream/ingest`. O servidor escreve-os no **stdin de um FFmpeg** que segmenta em HLS.
  O **telemóvel** usa a página pública `/transmitir` (aberta por QR), autorizada por um **token de
  broadcast** de curta duração; a **webcam/ficheiro** correm no browser do jornalista autenticado.
- **Via B — simulada (demo sem dispositivo):** `spawn` de FFmpeg lendo vídeo de demonstração / `testsrc`
  → HLS direto para disco. Caminho à prova de falhas; fora do modal.
- **Via C — RTMP (legacy/opcional):** publicação `rtmp://<host>:1935/live/<key>` → `node-media-server`
  → FFmpeg → HLS. Para encoders externos (OBS); fora do modal.

## 4. Ingestão real (OBS Studio)

| Definição OBS | Valor |
|---|---|
| Serviço | Personalizado |
| Servidor | `rtmp://localhost:1935/live` |
| Chave de transmissão | `isptec` (ou a chave do jornalista) |

Telemóvel: qualquer app "RTMP/IRL streamer" com os mesmos dados.

## 5. Ingestão simulada (demo sem câmara)

- `POST /stream/simulate/start` (🔒 EDITOR/ADMIN) → arranca FFmpeg:
  `ffmpeg -re -stream_loop -1 -i <demo.mp4> -c:v libx264 -preset veryfast -g 48 -f hls
   -hls_time 2 -hls_list_size 6 -hls_flags delete_segments /media/live/demo/index.m3u8`
- `POST /stream/simulate/stop` (🔒) → mata o processo.
- Fonte: o vídeo de demonstração já gerado pelo seed (ou `testsrc` se ausente).

## 6. Distribuição (HTTP)

- Express serve `/stream/hls/<key>/*` a partir de `MEDIA_DIR/live/<key>` com mimes corretos
  (`application/vnd.apple.mpegurl` p/ `.m3u8`, `video/mp2t` p/ `.ts`), `Cache-Control: no-cache`
  no manifesto e CORS aberto (já garantido pelo `helmet crossOriginResourcePolicy: cross-origin`).
- O rate-limit global **ignora** `/stream/*` (já configurado).

## 7. Player (Web / Desktop / Mobile)

- **Web/Desktop:** `hls.js` (Safari usa HLS nativo). `<video autoplay muted playsInline>` no hero,
  badge "● AO VIVO", botão "ativar som". Fallback "offline" quando o `.m3u8` não existe/!fresco.
- **Mobile (Expo SDK 54):** `expo-video` reproduz HLS nativamente (iOS/Android) — só muda a fonte para o `.m3u8`.

## 8. Estado & eventos (liga ao Modo Dev — req. 5)

- `GET /stream/live/status` → `{ live, key, mode, source, startedAt, hlsUrl }` (tipo `LiveStatus` em
  `@isptec/shared`). `mode ∈ camera|file|simulated|rtmp|offline`. `live=true` só quando há segmentos
  frescos; um processo a arrancar é reportado como **preparação** (`live=false` + `mode` definido).
- Eventos da ingestão (`hls.ingest.start/stop/exit`) e do RTMP (`rtmp.publish/done`) → `emitDev`/`writeLog`
  → visíveis no painel do **Modo Dev** (SSE).

## 9. Exposição pública para dev (multi-dispositivo)

- `getUserMedia` exige **contexto seguro** (HTTPS ou `localhost`). Num telemóvel a aceder por `http://IP-LAN`
  a câmara é **bloqueada** — por isso o desenvolvimento multi-dispositivo usa um **túnel HTTPS**.
- `pnpm dev:tunnel` arranca um **Cloudflare Quick Tunnel** (`scripts/dev-tunnel.mjs`, dep `cloudflared`):
  URL público HTTPS efémero, sem conta, com suporte a **WebSocket** (a ingestão passa em WSS). O QR do
  modal deriva de `window.location.origin`, logo fica correto ao abrir a app pelo URL do túnel.
- O Vite escuta em `0.0.0.0` (`server.host`) e aceita os hosts do túnel (`allowedHosts`); o proxy `/api`
  tem `ws:true` para encaminhar o upgrade do WebSocket de ingestão.

## 10. Limitações académicas & alternativas

- **Latência HLS** ~ 4–8 s (segmentos de 2 s). Aceitável para emissão; **LL-HLS/WebRTC** ficam fora de
  escopo (complexidade desproporcional — ver decisão na §2).
- **iOS Safari:** suporte a `MediaRecorder`/WebM limitado — a fonte **Telemóvel** é robusta em **Android +
  desktop**; o cliente faz *feature-detection* (`MediaRecorder.isTypeSupported`) e degrada com mensagem clara.
- **Windows:** `ffmpeg-static` testado; a **Via B** (FFmpeg→HLS direto) garante a demo sem dispositivo.

## 11. Segurança

- **Ingestão WS** (`/stream/ingest`): autoriza no *upgrade* com um **token de broadcast** (escopo
  `broadcast`, validade 2 h, emitido por `POST /stream/broadcast-token` a EDITOR/ADMIN) **ou** um JWT
  normal de EDITOR/ADMIN (webcam/ficheiro do próprio jornalista). Chave validada por regex (sem travessia).
- `POST /stream/simulate/*`, `/stream/broadcast-token` e `/stream/stop` exigem `requireAuth` +
  `requireRole('EDITOR','ADMIN')`. O túnel é **só para dev** (URL efémero; não deixar a correr).

---

### Grupo 26 - Elementos
- **Dálcio Garcia:** 20170796
- **Osvaldo Marcolino:** 20210423

**Professor:** Bongo Cahisso

---
