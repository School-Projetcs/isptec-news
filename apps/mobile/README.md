# @isptec/mobile (Fase 4)

Cliente **Mobile** (Expo / React Native + TypeScript).
Satisfaz o requisito de **cliente multiplataforma** (Android/iOS).
Reutiliza os **tipos** de `@isptec/shared` (imports `type`, como na Web) e o mesmo
contrato/envelope da API REST.

## Funcionalidades

- **Login / Registo** (JWT, token guardado em AsyncStorage).
- **Feed** de notícias publicadas (pull-to-refresh) → **detalhe** do artigo.
- **Reprodução por streaming (VOD)**: imagem/áudio/vídeo servidos por `/media/:id/raw`
  (HTTP Range) via `expo-av`.
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

```bash
# 1) API a correr (noutro terminal, na raiz)
pnpm dev:api          # http://localhost:3333

# 2) Mobile
pnpm --filter @isptec/mobile start
# Lê o QR code com a app Expo Go (Android/iOS), ou tecla "a"/"i" para emulador.
```

## Notas

- **Live MJPEG** não está no mobile (o `<Image>` nativo não consome
  `multipart/x-mixed-replace`); o tempo-real é demonstrado na Web/Desktop.
- Monorepo pnpm: `metro.config.js` observa a raiz do workspace e resolve `node_modules`
  da app e da raiz (necessário para o symlink de `@isptec/shared`).

> Plano completo no [plano-mestre](../../docs/00-plano-mestre.md).
