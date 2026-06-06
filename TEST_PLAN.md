# TEST_PLAN — ISPTEC News

> Guia para um avaliador validar o projeto do início ao fim. Atualizado: **2026-06-06**.
> Estado de cada fluxo: ✅ a passar hoje · ⏳ depende de feature em desenvolvimento.
> Login de demonstração: **`admin@isptec.local` / `admin123`** (ADMIN).
> Outros: `editor@isptec.local` / `editor123` · `leitor@isptec.local` / `reader123`.

## 1. Pré-requisitos

- **Node ≥ 20** e **pnpm** (`npm i -g pnpm`).
- **Docker Desktop** (PostgreSQL em contentor).
- **FFmpeg**: incluído via `ffmpeg-static` (não é preciso instalar).
- Portas livres: **3333** (API), **5173** (Web), **1935** (RTMP, quando o streaming real entrar).

## 2. Instalação

```bash
pnpm install
pnpm db:up        # PostgreSQL (Docker)
pnpm db:migrate   # aplica migrações
pnpm db:seed      # dados de demonstração (notícias + media já comprimida)
```

## 3. Execução

```bash
pnpm dev          # API :3333  +  Web :5173   (em paralelo)
# Desktop (Electron):  pnpm dev:desktop   (requer 'pnpm dev' a correr)
# Mobile (Expo):       pnpm --filter @isptec/mobile start   (EXPO_PUBLIC_API_URL = IP LAN)
```

Abrir **http://localhost:5173**.

## 4. Fluxos de teste e resultados esperados

### 4.1 Autenticação

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Login | Entrar com `admin@isptec.local` / `admin123` | Sessão iniciada; nav mostra nome + role; links de gestão visíveis | ✅ |
| Login inválido | Password errada | Mensagem de erro clara; sem sessão | ✅ |
| Registo | Criar conta nova | Conta criada (role READER) + sessão | ✅ |
| Logout | "Sair" | Sessão terminada; volta a "Entrar" | ✅ |
| Rate-limit | >20 logins falhados em 15 min | HTTP 429 (anti força-bruta) | ✅ |

### 4.2 Notícias (CMS)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Criar | Gerir → Nova notícia → guardar rascunho | Notícia criada como DRAFT | ✅ |
| Editar | Abrir notícia existente → alterar → guardar | Alterações persistidas | ⏳ (UI de editar a implementar) |
| Publicar | Despublicada → "Publicar" | Passa a PUBLISHED; aparece no feed | ✅ |
| Remover | "Eliminar" (autor ou admin) | Notícia removida | ✅ |
| Multi-formato | Anexar imagem + vídeo a uma notícia | Aparecem no detalhe (galeria + player) | ⏳ (anexar no Editor a implementar) |

### 4.3 Upload de média

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Imagem | Media → upload `.jpg/.png` | Variantes WebP/JPEG + relatório de compressão | ✅ |
| Vídeo | Media → upload `.mp4` | Variantes H.264/H.265/VP9 + thumbnail + relatório | ✅ |
| Áudio | Media → upload `.wav/.mp3` | Variantes MP3/AAC/OGG + relatório | ✅ |

### 4.4 Reprodução

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Ver notícia | Abrir do feed | Capa, metadados, corpo, multimédia | ✅ |
| Vídeo (VOD) | Play/seek no player | Reprodução + seek por HTTP Range (206) | ✅ |
| Offline | "Descarregar" variante | Ficheiro guardado localmente | ✅ |

### 4.5 Streaming ao vivo

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Iniciar (simulada) | Login editor/admin → "Ao Vivo" → "Iniciar transmissão" | FFmpeg gera HLS; player mostra o vivo em ~2 s | ✅ |
| Iniciar (real) | OBS → `rtmp://localhost:1935/live` (chave `test`/`isptec`) | Stream ingerido (RTMP→FFmpeg→HLS) e visível na Web | ✅ |
| Ver | Abrir "Ao Vivo" | Player HLS com badge ● AO VIVO (autoplay mudo) | ✅ |
| Encerrar | Parar OBS / "Parar transmissão" | Estado passa a offline (~12 s); player mostra fallback | ✅ |

### 4.6 Modo Dev

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Ativar | Definições → Developer Mode | Surgem painéis (pipeline FFmpeg, Huffman, HLS, eventos) | ⏳ |
| Validar | Fazer upload / iniciar stream | Painéis mostram passos em tempo real | ⏳ |
| Desativar | Desligar o toggle | App normal, sem elementos técnicos | ⏳ |

### 4.7 Ouvir notícia (TTS — APIs de áudio padrão)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Ouvir | No detalhe, clicar "🔊 Ouvir" | O browser lê o título+corpo em voz (pt) via Web Speech API | ⏳ |
| Pausa/parar | Pausar e parar a leitura | Leitura pausa/retoma/termina; botão reflete o estado | ⏳ |
| Mobile | Abrir notícia no Expo → "Ouvir" | `expo-speech` lê em voz alta | ⏳ |

### 4.8 Resumo do dia (FAB flutuante)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Abrir | Clicar no FAB "Resumo do dia" | Painel com **≥3 notícias mais importantes** (título+resumo+link) | ⏳ |
| Navegar | Clicar numa do resumo | Abre a notícia correspondente | ⏳ |
| Ouvir resumo | "Ouvir resumo" | TTS lê os 3 resumos em sequência | ⏳ |

### 4.9 Desktop (Electron)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Dev | `pnpm dev:desktop` | Janela Electron a apontar para o Vite | ✅ |
| Produção | `pnpm desktop` | Build da Web embrulhada (`app://`) | ✅ |

### 4.10 Mobile (Expo)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Arranque | `pnpm --filter @isptec/mobile start` + Expo Go | App abre; login; feed | 🟡 (typecheck+bundle ok; falta dispositivo) |
| VOD | Abrir notícia com vídeo | Player reproduz (HTTP Range) | 🟡 |

## 5. Critério de aceitação

O projeto considera-se validado quando **todos os fluxos ✅/⏳ desta lista passam** no ambiente do
avaliador, com destaque para os três auto-fail: **compressão**, **streaming** e **cliente
multiplataforma**.
