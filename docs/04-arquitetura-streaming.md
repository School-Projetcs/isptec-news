# Arquitetura de Streaming ao Vivo — ISPTEC News (RTMP → HLS)

> Resposta ao feedback de produto, secção 4 ("streaming real"). Atualizado: **2026-06-06**.
> Estado: **✅ IMPLEMENTADO E VERIFICADO** (F7.1). O MJPEG sintético foi rebaixado a
> pré-visualização legacy.
>
> **Nota de implementação:** o `node-media-server` **v4** já não faz HLS nativo (só RTMP/FLV).
> Por isso usa-se o NMS **apenas para a ingestão RTMP** e, em cada publicação (`postPublish`),
> arranca-se um **FFmpeg** que lê o RTMP e gera o HLS — exatamente o encadeamento
> **RTMP + FFmpeg + HLS** do enunciado. Código: `apps/api/src/live/hls.ts` + `live/rtmp.ts`.

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

## 2. Decisão técnica

**`node-media-server` (RTMP em Node puro) + FFmpeg (`ffmpeg-static`) → HLS + `hls.js` no cliente.**

Porquê (critério pedido: *o mais simples que cumpre o requisito do professor*):
- **Real** (aceita RTMP de OBS/telemóvel) e usa exatamente o stack do enunciado: **RTMP + FFmpeg + HLS**.
- **Simples**: é **um pacote npm**, sem binário externo a instalar/gerir (vs. MediaMTX/nginx-rtmp).
- **Integra** no monorepo Node existente e reaproveita o `ffmpeg-static` já usado pela media-engine.

## 3. Fluxo de dados (duas vias de ingestão)

```
                         ┌────────────────────────────────────────────┐
 (A) OBS/telemóvel ─RTMP→│  node-media-server  :1935  /live/<key>      │
                         │        └─ FFmpeg transmux → HLS             │──┐
 (B) "Transmissão        │                                            │  │
     simulada" (FFmpeg) ─┤  spawn FFmpeg: fonte→HLS direto p/ disco   │  │  /media/live/<key>/
     a partir da API     └────────────────────────────────────────────┘  │   index.m3u8 + *.ts
                                                                          ▼
                                          Express estático  /stream/hls/<key>/index.m3u8
                                                                          │
                                                                          ▼
                                                hls.js  →  <video autoplay muted>
```

- **Via A — ingestão real:** o jornalista publica para `rtmp://<host>:1935/live/<stream-key>`.
  O `node-media-server` recebe e o FFmpeg transmuxa para HLS na pasta de media.
- **Via B — ingestão simulada (para a demo sem câmara):** endpoint autenticado que faz *spawn* de
  FFmpeg lendo uma fonte (vídeo de demonstração / `testsrc`) e escrevendo HLS **diretamente para
  disco**. Não depende do transmux do NMS → **caminho à prova de falhas para a defesa**.

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
- **Mobile (Expo):** `expo-av` reproduz HLS nativamente (iOS/Android) — só muda a fonte para o `.m3u8`.

## 8. Estado & eventos (liga ao Modo Dev — req. 5)

- `GET /stream/live/status` → `{ live, key, startedAt, segments }` (verifica frescura do `index.m3u8`).
- Eventos do `node-media-server` (`prePublish`/`donePublish`) → `writeLog` → visíveis no painel do **Modo Dev**.

## 9. Limitações académicas & alternativas

- **Latência HLS** ~ 4–10 s (segmentos de 2 s). Aceitável para a demo; **LL-HLS/WebRTC** ficam
  fora de escopo (complexidade desproporcional).
- **Alternativas documentadas** (caso se queira mais robustez): **MediaMTX** (binário único,
  RTMP/HLS/WebRTC) ou **nginx-rtmp**. Trocáveis sem mexer no player (continua HLS).
- **Windows:** `node-media-server` + `ffmpeg-static` testado; se o transmux do NMS falhar, a **Via B**
  (FFmpeg→HLS direto) garante a demo.

## 10. Segurança

- `POST /stream/simulate/*` exige `requireAuth` + `requireRole('EDITOR','ADMIN')`.
- Chave de stream simples para a demo; em produção, validar a chave no evento `prePublish` do NMS.


--
Grupo 26 - Elementos
Dálcio Garcia	20170796
Osvaldo Marcolino	20210423
--
professor: Bongo Cahisso

