# TEST_PLAN — ISPTEC News

> Guia para um avaliador validar o projeto do início ao fim. Atualizado: **2026-06-07**
> (inclui dropdown de conta, modais de notícia/transmissão, tema 3 modos e interações de hover).
> Estado de cada fluxo: ✅ a passar hoje · 🟡 verificado por typecheck/bundle (falta dispositivo).
> Login de demonstração: **`admin@isptec.local` / `admin123`** (ADMIN).
> Outros: `editor@isptec.local` / `editor123` · `leitor@isptec.local` / `reader123`.

## 1. Pré-requisitos

- **Node ≥ 20** e **pnpm** (`npm i -g pnpm`).
- **Docker Desktop** (PostgreSQL em contentor).
- **FFmpeg**: incluído via `ffmpeg-static` (não é preciso instalar).
- Portas livres: **3333** (API), **5173** (Web), **8080** (Adminer), **1935** (RTMP, live real).

## 2. Instalação

```bash
pnpm install
pnpm db:up        # PostgreSQL (Docker)
pnpm db:migrate   # aplica migrações
pnpm db:seed      # dados de demonstração (notícias + media já comprimida)
```

## 3. Execução

```bash
pnpm start:all    # Zero-Fricção: liga DB, migra, e lança API, Web, Desktop e Mobile (injetando o IP LAN auto)
```

Abrir **http://localhost:5173**.

## 4. Fluxos de teste e resultados esperados

### 4.1 Autenticação

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Login | Entrar com `admin@isptec.local` / `admin123` | Sessão iniciada; dropdown de conta (canto sup. direito) mostra o nome + role | ✅ |
| Login inválido | Password errada | Mensagem de erro clara; sem sessão | ✅ |
| Registo | Criar conta nova | Conta criada (role READER) + sessão | ✅ |
| Logout | Dropdown → "Sair" | Sessão terminada; trigger volta a "Conta" / "Entrar" | ✅ |
| Rate-limit | >20 logins falhados em 15 min | HTTP 429 (anti força-bruta) | ✅ |

### 4.2 Dropdown de conta / configurações (centraliza tudo — sem página "Definições")

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Abrir | Clicar no avatar/nome (canto sup. direito) | Painel com header (nome) → **Tema** → (editor/admin) **Notícias** → (admin) **Administração** → Entrar/Sair | ✅ |
| Tema (3 modos) | Escolher **Sistema / Claro / Escuro** | Aplica de imediato e persiste; **Sistema** segue o SO (`prefers-color-scheme`) e reage em tempo real; tooltip explica cada opção | ✅ |
| Default do tema | Limpar `localStorage` + recarregar com SO escuro | App inicia em **escuro** (default = Sistema) sem flash | ✅ |
| Leitor não vê admin | Login `leitor@…` → abrir dropdown | Vê **só** Tema + Sair (sem Notícias/Administração/Dev) | ✅ |

### 4.3 Notícias — criação/edição por **modal** (sem mudar de página)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Abrir modal | Dropdown → "Adicionar notícia" (ou Gerir → "Adicionar notícia") | Abre **modal centralizado** com título, resumo, categoria, conteúdo, **capa**, vídeo e **pré-visualização** ao vivo | ✅ |
| Gate de média | Preencher título + conteúdo, **sem** capa nem vídeo | **"Publicar" fica desativado** + aviso: precisa de imagem de capa ou vídeo | ✅ |
| Publicar | Escolher capa (imagem) → "Publicar" | Cria rascunho → **comprime a capa** → liga capa → publica; modal fecha; notícia surge no feed | ✅ |
| Preview | Escrever título/escolher capa | A pré-visualização (lado direito) atualiza em direto | ✅ |
| Editar | Gerir → "Editar" numa linha | Abre o **mesmo modal** pré-preenchido (capa/vídeo atuais marcados) | ✅ |
| Publicar/Despublicar | Gerir → "Publicar"/"Despublicar" | Estado alterna; reflete no feed | ✅ |
| Remover | Gerir → "Eliminar" (autor/admin) | Notícia removida | ✅ |

> Média avançada (galeria com várias imagens / áudio) continua disponível na página de edição
> (`/gerir/editar/:id`), que serve de gestor de multimédia avançado.

### 4.4 Upload de média e compressão (admin)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Imagem | Dropdown (admin) → **Media & Compressão** → upload `.jpg/.png` | Variantes WebP/JPEG + relatório de compressão (rácio/PSNR/ms) | ✅ |
| Vídeo | Upload `.mp4` | Variantes H.264/H.265/VP9 + thumbnail + relatório | ✅ |
| Áudio | Upload `.wav/.mp3` | Variantes MP3/AAC/OGG + relatório | ✅ |

### 4.5 Streaming ao vivo — **modal de transmissão** (RTMP→HLS)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Abrir | Login editor/admin → Dropdown/Gerir → "Iniciar transmissão" | Modal pede para **escolher a fonte**; **não arranca sozinho** (sem fonte não há botão Iniciar) | ✅ |
| Fontes | Ver as opções | **Telemóvel (QR) · Webcam/OBS · Stream externo · Simulada** | ✅ |
| Telemóvel (QR) | Escolher "Telemóvel (QR)" | Mostra **QR Code** (codifica `rtmp://<host>:1935/live/isptec`) + servidor/chave + estado "À espera da ligação…" | ✅ |
| Telemóvel real | Ler o QR numa app RTMP (ex.: Larix) na mesma rede (abrir o painel pelo **IP LAN**, não `localhost`) | O telemóvel torna-se câmara; emissão entra no ar (RTMP→FFmpeg→HLS) | 🟡 (precisa de telemóvel; infra RTMP testada com OBS) |
| Simulada | Escolher "Simulada" → "Iniciar" | FFmpeg gera HLS (~2 s); modal passa a **"Transmissão no ar" ● AO VIVO** | ✅ |
| Encerrar | "Terminar transmissão" (simulada) ou parar na app (RTMP) | Estado passa a offline; live card volta a OFF AIR | ✅ |

### 4.6 Live card e página Ao Vivo (utilizador final — sem dados técnicos)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Card (offline) | Home, sem emissão | Card que **parece um player** (placeholder ▶) + badge **○ OFF AIR**; o card nunca desaparece | ✅ |
| Card (live) | Com emissão no ar | Badge **● AO VIVO**; **sem autoplay** — o vídeo só reproduz em **hover** no card | ✅ |
| Hover | Passar o rato no card | Overlay com **título amigável** + estado (sem jargão técnico) | ✅ |
| Página | Clicar no card → `/ao-vivo` | Player no topo → info → **notícias relacionadas** (cards verticais) | ✅ |

### 4.7 Home — hierarquia e filtros

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Hero | Abrir a página inicial | **1** card de destaque com **só o título** (+ kicker "Em destaque") + widgets Tempo/Mercados (reais) | ✅ |
| Últimas | Ver "Últimas notícias" | **Máx. 2 itens**, lista de texto (título + data + snippet), label discreta | ✅ |
| Ver mais | Clicar "Ver mais" | **Scroll suave** para a lista completa (`#todas-noticias`) | ✅ |
| Filtro "Todas" | Em "Todas as notícias", clicar **Todas** | **Mostra sempre todo o acervo** (nunca vazio se houver dados) | ✅ |
| Filtro categoria | Clicar uma categoria | Mostra só as dessa categoria; fallback repõe tudo se o filtro não casar | ✅ |

### 4.8 Interações de leitura (hover)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Zoom de imagem | Passar o rato num card com capa | Imagem faz **zoom suave** (scale-in ~1.05, transição leve), recortada pelo card | ✅ |
| Vídeo em card | Passar o rato num card de vídeo | Vídeo reproduz **só em hover** (sem autoplay global); pausa e volta ao início ao sair | ✅ |

### 4.9 Modo Dev/Demo — **só ADMIN** (separação técnica)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Ativar (admin) | Dropdown (admin) → "Modo Programador" | Painel fixo no canto; SSE liga; eventos do pipeline | ✅ |
| Compressão | Media → upload de imagem | Painel mostra `Imagem` (WebP/JPEG, rácio+PSNR+ms) e `Huffman` (sem perdas) ao vivo | ✅ |
| Streaming | Iniciar transmissão simulada | Painel mostra evento `HLS` em tempo real | ✅ |
| Não-admin | Login `editor`/`leitor` (ou anónimo) | **Não há** toggle de Modo Dev nem painel — opção técnica invisível | ✅ |

### 4.10 Ouvir notícia (TTS), Resumo do dia, Comentários

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Ouvir (TTS) | No detalhe, "🔊 Ouvir" | Lê título+resumo+corpo em pt-PT (Web Speech API); Ouvir/Pausar/Parar + velocidade | ✅ |
| Resumo do dia | FAB "🗞️ Resumo do dia" | Top 5 (vistas+recência via `/news/digest`); navegar fecha o painel; "Ouvir" lê o resumo | ✅ |
| Comentar | No detalhe (com sessão), "Comentar" | Comentário no topo; sem sessão → "Inicia sessão para comentar"; autor/admin eliminam | ✅ |

### 4.11 Clientes Desktop e Mobile (auto-fail: cliente multiplataforma)

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Desktop dev | `pnpm dev:desktop` | Janela Electron a apontar para o Vite | ✅ |
| Desktop prod | `pnpm desktop` | Build da Web embrulhada (`app://`) | ✅ |
| Mobile | `pnpm --filter @isptec/mobile start` + Expo Go | Login, feed, detalhe, **player VOD** (HTTP Range), upload+relatório, comentários, TTS, "Resumo do dia" | 🟡 (typecheck + bundle Metro; falta dispositivo) |

### 4.12 Responsividade

| Passo | Ação | Resultado esperado | Estado |
|---|---|---|---|
| Mobile-web | Reduzir a janela a ~375 px | Cabeçalho/nav e grelhas re-organizam-se sem scroll horizontal | ✅ |

## 5. Critério de aceitação

O projeto considera-se validado quando **todos os fluxos ✅ passam** no ambiente do avaliador, com
destaque para os três **auto-fail**: **compressão** (4.4 + Modo Dev), **streaming** (4.5/4.6) e
**cliente multiplataforma** (4.11). Os itens 🟡 (Mobile/telemóvel real) dependem de hardware e estão
verificados por typecheck + bundle; ver `CURRENT_STATE.md` para o estado vivo.

---

### Grupo 26 - Elementos
- **Dálcio Garcia:** 20170796
- **Osvaldo Marcolino:** 20210423

**Professor:** Bongo Cahisso

---
