# Proposta de Redesign — ISPTEC News (single-page, estilo Euronews)

> **Estado: PROPOSTA** — aguarda aprovação antes de qualquer alteração visual significativa
> (conforme pedido no feedback de produto, secção 1). Atualizado: **2026-06-06**.

## 1. Visão

Transformar o ISPTEC News numa **plataforma jornalística single-page**, clara e elegante,
inspirada na Euronews: **imagem grande, hierarquia editorial forte, acento de cor para "ao vivo" /
destaque**, e foco no conteúdo. Princípio condutor pedido: **"algo único e elegante"** — moderno,
mas sóbrio (sem neo-brutalismo nem "desenhos loucos").

## 2. Estrutura da página única (landing)

```
┌───────────────────────────────────────────────────────────────────┐
│  TOPO   📰 ISPTEC News   Notícias  Tecnologia  Campus  …   🔍  ◐  Entrar │
├───────────────────────────────────────────────────────────────────┤
│  HERO (split)                                                       │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐    │
│  │  ● AO VIVO                    │  │  🌤  Tempo · Luanda      │    │
│  │  [ player HLS — autoplay mute]│  │  28°C  parc. nublado     │    │
│  │  Título do programa / legenda │  ├──────────────────────────┤    │
│  │                               │  │  📈 Mercados (ticker)    │    │
│  └──────────────────────────────┘  │  AOA/USD · BVDA · …      │    │
│   (se offline → capa do destaque)   ├──────────────────────────┤    │
│                                     │  🕒 Últimas              │    │
│                                     └──────────────────────────┘    │
├───────────────────────────────────────────────────────────────────┤
│  DESTAQUE (grelha "bento")                                          │
│  ┌───────────────────────┐ ┌───────────┐ ┌───────────┐             │
│  │  CARD ESTENDIDO        │ │  card     │ │  card     │             │
│  │  (imagem grande+título)│ │  normal   │ │  normal   │             │
│  └───────────────────────┘ └───────────┘ └───────────┘             │
├───────────────────────────────────────────────────────────────────┤
│  POR CATEGORIA — Tecnologia · Campus · Cultura · Desporto …         │
│  [card] [card] [VÍDEO ▶ autoplay no card] [card] …                  │
├───────────────────────────────────────────────────────────────────┤
│  RODAPÉ — secções · sobre · ISPTEC · créditos          ┌──────────┐ │
│                                                        │🔊 Resumo │ │
│                                          (FAB flutuante)│  do dia ▴│ │
└────────────────────────────────────────────────────────└──────────┘─┘
```

> **FAB "Resumo do dia"** (canto inferior direito, em todas as páginas): abre um painel com as
> **≥3 notícias mais importantes do dia** (título + resumo + link) e um botão **"ouvir resumo"**
> que lê tudo em voz alta (TTS — ver §4). Em cada **página de notícia** há também um botão
> **"🔊 Ouvir"** para a ouvir na íntegra.

Páginas de detalhe (notícia, live em ecrã cheio, gestão/CMS, admin) mantêm-se como rotas,
com o mesmo sistema visual.

## 3. Linguagem visual (recomendada)

| Elemento | Decisão proposta |
|---|---|
| **Tema** | **Claro por defeito** + *toggle* claro/escuro (☾/☀) opcional |
| **Fundo** | `#ffffff` / superfícies `#f5f6f8` |
| **Texto** | tinta `#14181f`, "muted" `#5b6472` |
| **Acento (ao vivo / breaking / links)** | **vermelho noticioso `#e02424`** |
| **Tinta editorial (cabeçalhos/marca)** | navy `#0b1f3a` |
| **Tipografia** | *display* **grotesk** (ex.: Space Grotesk / Archivo) para títulos + **Inter** no corpo |
| **Cartões** | branco, borda subtil `#e6e8ec`, sombra leve, *image-forward*, *hover lift* |
| **Grelha** | *bento* assimétrica (1 card estendido + normais) |
| **Movimento** | subtil — *fade/slide* ao scroll, *hover* nos cards, autoplay nos vídeos; respeita `prefers-reduced-motion` |

## 4. Componentes novos (Web)

- `HeroLive` — player HLS (hls.js), autoplay *muted* por defeito, badge "● AO VIVO" + fallback p/ capa do destaque quando offline.
- `WeatherWidget` — tempo de **Luanda** (Open-Meteo, sem chave de API).
- `MarketsWidget` — *ticker* de mercados/câmbios (ver §5).
- `LatestList` — mini-lista "Últimas".
- `FeaturedGrid` — grelha bento (card estendido + normais).
- `VideoCard` — card cujo media é vídeo: **autoplay *muted* in-card** ao entrar em viewport/hover (usa a variante `h264-720p`); pausa fora de vista.
- `CategoryRow` — secção por categoria.
- `ThemeToggle` — claro/escuro (persistido em `localStorage`).
- `ReadAloud` — botão **"🔊 Ouvir"** que lê a notícia em voz alta via **Web Speech API**
  (`window.speechSynthesis`, voz pt-PT) na Web/Desktop e `expo-speech` no Mobile; controlos
  play/pausa/parar + velocidade. **APIs de áudio padrão, sem chave nem dependências externas.**
- `DailyDigestFab` — **botão flutuante** "Resumo do dia" → painel com as **≥3 notícias mais
  importantes do dia** (título + resumo + link) e botão **"ouvir resumo"** (reutiliza `ReadAloud`).

## 5. Dados dos widgets

- **Tempo:** [Open-Meteo](https://open-meteo.com/) — gratuito, **sem chave**, lat/lon de Luanda. Dados reais.
- **Mercados/Finanças:** sem fonte gratuita fiável sem chave. Proposta: **ticker ilustrativo**
  (câmbios AOA/USD/EUR + um índice fictício "BVDA"), com **rótulo "dados ilustrativos"** visível no
  **Modo Dev**. Alternativa: integrar uma API gratuita com chave, se preferires dados reais.
- **Resumo do dia (FAB):** `GET /news/digest` devolve as notícias publicadas ordenadas por
  **importância = vistas + recência** (top N, ≥3). O "resumo" usa o campo `summary` editorial de
  cada notícia (sem necessidade de LLM); o botão "ouvir" concatena os resumos e lê-os via TTS.
- **Leitura em voz alta (TTS):** **Web Speech API** (`speechSynthesis`) — nativa do browser, sem
  chave; voz pt-PT/pt-BR conforme disponível. Mobile: `expo-speech`.

## 6. Acessibilidade & responsividade

- *Mobile-first*: hero empilha (player em cima, widgets por baixo); grelha bento colapsa para 1 coluna.
- Autoplay sempre **`muted` + `playsInline`** (políticas dos browsers/iOS).
- Contraste AA, foco visível, navegação por teclado, `alt` nas imagens, `prefers-reduced-motion`.

## 7. Faseamento da implementação (após aprovação)

1. **Tokens & tema** (CSS variables claro/escuro, tipografia, `ThemeToggle`).
2. **Layout & Hero** (top bar nova, `HeroLive` + rail de widgets).
3. **Widgets** (`WeatherWidget`, `MarketsWidget`, `LatestList`).
4. **Grelha** (`FeaturedGrid` bento) + **`VideoCard`** autoplay.
5. **Detalhe** de notícia repaginado (metadados editoriais — ver req. 2).
6. **Polish**, responsividade e acessibilidade.

## 8. Decisões a confirmar (rápido)

1. **Estética**: confirmas o "editorial moderno" (grotesk + vermelho), ou preferes display *serif*
   (mais clássico/elegante, ex.: Fraunces)?
2. **Toggle escuro**: incluir (recomendado) ou só claro?
3. **Finanças**: *ticker* ilustrativo (recomendado p/ demo) ou ligar a API real com chave?

> Assim que aprovares (ou ajustares) estes 3 pontos, avanço para a implementação pela ordem de §7.
