# @isptec/mobile (Fase 4)

Cliente **Mobile** (Expo / React Native + TypeScript) — **Expo SDK 54** (React Native 0.81, React 19).
Satisfaz o requisito de **cliente multiplataforma** (Android/iOS). Compatível com a versão mais recente
do **Expo Go** (que no iOS só suporta o SDK mais recente).
Reutiliza os **tipos** de `@isptec/shared` (imports `type`, como na Web) e o mesmo
contrato/envelope da API REST.

## Funcionalidades

- **Navegação por separadores** (bottom tabs): **Feed · Ao Vivo · Conta**; o detalhe do artigo
  e o Upload abrem em stack por cima das tabs.
- **Login / Registo** (JWT, token guardado em AsyncStorage).
- **Feed** de notícias publicadas (pull-to-refresh) → **detalhe** do artigo. Mostra um **card de
  "live"** no topo quando há emissão (toca para ir ao separador Ao Vivo).
- **Ao Vivo**: visualização da emissão **HLS** (`/stream/hls/:key/index.m3u8`) com `expo-video`
  (suporte HLS nativo), selo **AO VIVO** e cronómetro "no ar há…"; estado vazio claro quando não há
  emissão. **Só assistir** — transmitir do telemóvel faz-se pelo browser (página `/transmitir`, via QR).
- **Conta**: perfil (nome/email/papel), escolha de **tema** (Sistema/Claro/Escuro), atalho
  **Media · Compressão** (editor/admin) e **terminar sessão**.
- **Detalhe do artigo**: corpo, galeria multimédia, **TTS "Ouvir notícia"** (`expo-speech`) e
  **comentários**; **Resumo do dia** (FAB) no Feed.
- **Reprodução por streaming (VOD)**: imagem/áudio/vídeo servidos por `/media/:id/raw`
  (HTTP Range) via `expo-video` (vídeo) e `expo-audio` (áudio) — o antigo `expo-av` foi removido no SDK 54.
- **Upload** de media (`expo-image-picker`) → compressão automática na API →
  **relatório comparativo** (tamanho, taxa, poupança).
- **Offline**: botão "Guardar offline" (`expo-file-system`) que descarrega a variante e
  passa a reproduzir a partir do ficheiro local.

## Configuração

```bash
cp .env.example .env   # define EXPO_PUBLIC_API_URL
```

| Ambiente | `EXPO_PUBLIC_API_URL` |
|---|---|
| Emulador Android | `http://10.0.2.2:3333` |
| iOS Simulator | `http://localhost:3333` |
| Telemóvel físico (Expo Go) | `http://<IP-LAN-da-máquina>:3333` |

> `localhost` no telemóvel aponta para o próprio telemóvel — usa o IP da máquina na
> rede local (ex.: `http://192.168.x.x:3333`). A API tem `CORS_ORIGIN=*` em dev.

## Executar

Podes executar todo o ecossistema com zero-fricção através do comando na raiz do projeto:

```bash
pnpm start:all
```
*Isto irá lançar a API, a Web e abrir automaticamente o terminal do Mobile com o teu IP já injetado. Depois basta leres o QR code com a app Expo Go!*

Se precisares de rodar apenas o Mobile de forma isolada (assumindo que a API já corre):
```bash
pnpm dev:mobile
```

## Notas

- **Ao Vivo é só de visualização**: a emissão chega por **HLS** (`expo-video`). A captura/ingestão
  a partir do telemóvel continua a fazer-se no **browser** (página `/transmitir`, aberta por QR no
  painel da web) — evita reimplementar captura nativa e usa o mesmo pipeline WS → FFmpeg → HLS.
- **Navegação**: `@react-navigation/bottom-tabs` (tabs) dentro de um `native-stack` (root). O estado
  da emissão é sondado por `lib/useLiveStatus.ts` (usado pelo separador Ao Vivo e pelo card do Feed).
- Monorepo pnpm: `metro.config.js` observa a raiz do workspace e resolve `node_modules`
  da app e da raiz (necessário para o symlink de `@isptec/shared`).

> Detalhes no [relatório técnico](../../docs/RELATORIO-TECNICO.md).
