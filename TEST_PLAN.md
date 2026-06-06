# TEST_PLAN — ISPTEC News

> Guia para um avaliador validar o projeto do início ao fim. Atualizado: **2026-06-06** (F7.4/F7.6/F7.8/F7.9 + B8 ✅).
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
| Editar | Gestão → "Editar" → alterar → "Guardar alterações" | Alterações persistidas | ✅ |
| Publicar | Despublicada → "Publicar" | Passa a PUBLISHED; aparece no feed | ✅ |
| Remover | "Eliminar" (autor ou admin) | Notícia removida | ✅ |
| Multi-formato | Editar → "Carregar capa" + "Adicionar multimédia" (imagem/áudio/vídeo) | Capa + galeria comprimidas; surgem no detalhe | ✅ |

### 4.3 Upload de média

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Imagem | Media → upload `.jpg/.png` | Variantes WebP/JPEG + relatório de compressão | ✅ |
| Vídeo | Media → upload `.mp4` | Variantes H.264/H.265/VP9 + thumbnail + relatório | ✅ |
| Áudio | Media → upload `.wav/.mp3` | Variantes MP3/AAC/OGG + relatório | ✅ |

### 4.4 Reprodução

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Ver notícia | Abrir do feed | Capa, **metadados (categoria · autor · data às hora · tempo de leitura · vistas)**, badge "Recente", corpo, multimédia | ✅ |
| Vídeo (VOD) | Play/seek no player | Reprodução + seek por HTTP Range (206) | ✅ |
| Offline | "Descarregar" variante | Ficheiro guardado localmente | ✅ |

### 4.5 Streaming ao vivo

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Iniciar (simulada) | Login editor/admin → "Ao Vivo" → "Iniciar transmissão" | FFmpeg gera HLS; player mostra o vivo em ~2 s | ✅ |
| Iniciar (real) | OBS → `rtmp://localhost:1935/live` (chave `test`/`isptec`) | Stream ingerido (RTMP→FFmpeg→HLS) e visível na Web | ✅ |
| Ver | Abrir "Ao Vivo" | Player HLS com badge ● AO VIVO (autoplay mudo) | ✅ |
| Encerrar | Parar OBS / "Parar transmissão" | Estado passa a offline (~12 s); player mostra fallback | ✅ |

### 4.6 Modo Dev/Demo

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Ativar | Definições → "Modo Programador / Demo" | Painel fixo no canto; indicador verde na nav; SSE liga (ponto "ligado") | ✅ |
| Compressão | Login editor/admin → Media → upload de imagem | Painel mostra, ao vivo, `Imagem` (variantes WebP/JPEG c/ rácio+PSNR+ms) e `Huffman` (rácio sem perdas) | ✅ |
| Streaming | "Ao Vivo" → "Iniciar transmissão" | Painel mostra evento `HLS` (transmissão simulada → HLS) em tempo real | ✅ |
| Filtros | Clicar num separador de canal (ex.: Imagem) | Lista filtra só esse canal; contadores por canal corretos | ✅ |
| Sem sessão | Ativar sem login | Painel pede sessão de editor/admin (SSE exige JWT) | ✅ |
| Desativar | Desligar o toggle (ou ✕ no painel) | App normal, sem painel nem elementos técnicos | ✅ |

### 4.7 Ouvir notícia (TTS — APIs de áudio padrão)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Ouvir | No detalhe, clicar "🔊 Ouvir" | O browser lê título+resumo+corpo em voz (pt-PT) via Web Speech API | ✅ |
| Pausa/parar | Pausar/retomar e parar a leitura | Botão alterna Ouvir↔Pausar/Retomar↔Parar; estado reflete `speechSynthesis` | ✅ |
| Velocidade | Mudar o seletor (0.8/1/1.25/1.5×) | A leitura continua à nova velocidade a partir do ponto atual | ✅ |
| Mobile | Abrir notícia no Expo → "Ouvir"/"Parar" | `expo-speech` (pt-PT) lê em voz alta | 🟡 (typecheck + bundle Metro 808 mód.; falta dispositivo) |

### 4.8 Resumo do dia (FAB flutuante)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Abrir | Clicar no FAB "🗞️ Resumo do dia" (canto inf. esquerdo) | Painel com **top 5 notícias** (ranking vistas+recência via `/news/digest`), numeradas, com resumo, categoria·data·vistas e badge "Recente" | ✅ |
| Navegar | Clicar numa notícia do resumo | Abre a notícia e fecha o painel | ✅ |
| Ouvir resumo | "🔊 Ouvir" no painel | TTS lê "Resumo do dia" + os títulos/resumos em sequência (reutiliza F7.8) | ✅ |

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

### 4.11 Navegação e responsividade (F7.6)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Filtrar por categoria | No feed, clicar num chip (ex.: "Tecnologia") | Mostra só as notícias dessa categoria; chip realçado; "Todas" limpa | ✅ |
| Pesquisa + categoria | Pesquisar e depois filtrar | Os dois filtros combinam-se (`/news?search=&category=`) | ✅ |
| Mobile-web | Reduzir a janela a ~375 px | Cabeçalho/nav re-organiza-se sem scroll horizontal | ✅ |

### 4.12 Comentários (B8)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Comentar | No detalhe (com sessão), escrever e "Comentar" | Comentário aparece no topo da lista; contador atualiza | ✅ |
| Sem sessão | Abrir detalhe sem login | Em vez do formulário, "Inicia sessão para comentar" | ✅ |
| Eliminar | Autor (ou admin) clica "Eliminar" | Comentário removido; só o autor/admin vê o botão | ✅ |

## 5. Critério de aceitação

O projeto considera-se validado quando **todos os fluxos ✅/⏳ desta lista passam** no ambiente do
avaliador, com destaque para os três auto-fail: **compressão**, **streaming** e **cliente
multiplataforma**.
