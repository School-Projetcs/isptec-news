# Guia de Gravação do Vídeo de Demonstração — ISPTEC News

> Como gravar o vídeo que apresenta a aplicação **de forma que se perceba tudo**: o que preparar
> **antes** de carregar em "gravar" (incluindo **conteúdos como vídeos**), as ferramentas, o guião
> cena a cena e a pós-produção. Complementa os [Key Points](07-key-points.md) e o guião de defesa do
> [manual](02-manual-utilizador.md#6-guião-sugerido-para-a-defesa-10-min).

---

## 1. Objetivo, duração e público

- **Público:** o professor (avaliador). Assume que **não conhece o código** — explica o **porquê**, não só o **quê**.
- **Duração-alvo:** **5–10 minutos**. Curto e denso vale mais do que longo e arrastado.
- **Meta:** que ao fim do vídeo fique claro que os **3 auto-fail** (compressão, streaming, cliente
  multiplataforma) estão **reais e a funcionar**, e que as funcionalidades + UX estão lá.
- **Regra de ouro:** **mostra, não contes**. Cada afirmação ("a compressão é real") tem de ter uma
  **prova no ecrã** (o relatório, o Modo Dev, o seek do vídeo, etc.).

---

## 2. ⭐ Preparar os conteúdos ANTES de gravar (o passo que todos saltam)

Gravar "ao vivo" tudo de uma vez corre quase sempre mal: uploads demoram, a câmara falha, esqueces um
passo. **Prepara primeiro todos os materiais e o ambiente** e só depois grava. Esta secção é o coração
deste guia.

### 2.1 Conteúdos multimédia a ter prontos (numa pasta `gravacao/`)

> Junta tudo numa pasta só (ex.: `Videos/isptec-news/gravacao/`) para não andares à procura durante a gravação.

| Conteúdo | Para quê | Sugestão |
|---|---|---|
| **1 vídeo curto (10–30 s)** para a fonte "**Ficheiro de vídeo**" da transmissão | Demonstrar **live HLS** sem depender de câmara | `.mp4` H.264 leve (ex.: um clip de telejornal/paisagem); evita ficheiros enormes |
| **1 vídeo** para **upload/compressão** | Mostrar o **relatório de compressão** de vídeo (H.264/H.265/VP9) | Pode ser o mesmo clip acima ou outro `.mov`/`.mp4` |
| **1 imagem grande** (ex.: foto 3–5 MB) | Compressão de imagem (WebP/JPEG) com **rácio** visível | Uma foto real, não um ícone pequeno |
| **1 ficheiro de áudio** (`.wav`/`.mp3`) | Compressão de áudio (MP3/AAC/OGG) | Um clip de voz ou música curto |
| **1 imagem de capa** + **2–3 imagens de galeria** | Criar uma **notícia nova** no vídeo | Fotos com boa relação 16:9 |
| **Texto da notícia de exemplo** (título, resumo, corpo) | Não escrever no momento (poupa tempo e gralhas) | Tê-lo num bloco de notas para copiar/colar |

> ⚠️ **Direitos de imagem:** usa conteúdo próprio, livre de direitos ou claramente de demonstração.
> Não uses material protegido sem permissão.

### 2.2 Dados da aplicação

- Corre **`pnpm db:seed`** para garantir o **acervo de demonstração** (7 notícias publicadas + 1 rascunho,
  com capas/galeria/áudio/vídeo **já comprimidos**). Assim o feed não aparece vazio no vídeo.
- Confirma as **contas demo**: `admin@isptec.local / admin123` (usa o admin — vê tudo), `editor`, `leitor`.

### 2.3 Ambiente técnico a deixar a correr

```bash
pnpm install
pnpm start:all          # API (3333) + Web (5173) + Desktop + Mobile
# OU, se fores transmitir a partir do telemóvel (câmara exige HTTPS):
pnpm start:all:tunnel   # igual + túnel público HTTPS (Cloudflare)
```

Antes de gravar, verifica que está tudo de pé:

- [ ] **Web** abre em `http://localhost:5173`.
- [ ] **API** responde: `http://localhost:3333/health` mostra a BD ligada.
- [ ] Janela do **Desktop** (Electron) abriu sozinha.
- [ ] Janela do **Mobile** (Expo/Metro) com o **QR Code**; telemóvel **carregado**, na **mesma rede Wi-Fi**, com **Expo Go** instalado.
- [ ] Se for transmitir do telemóvel: o **túnel** abriu e o QR de transmissão aponta para o URL HTTPS (não `localhost`).

### 2.4 "B-roll": gravar previamente as partes arriscadas

Algumas cenas dependem de hardware ou rede e podem falhar ao vivo. **Grava-as à parte, com calma, e
edita-as no vídeo final.** Não há problema em montar — o que conta é que o avaliador perceba tudo.

Bons candidatos a pré-gravar:
- **Telemóvel a transmitir** (câmara real → ● AO VIVO). Grava o ecrã do telemóvel e/ou filma o telemóvel.
- **Mobile a abrir e a navegar** (feed, detalhe, **offline**) — gravação do ecrã do telemóvel.
- **Desktop (Electron)** a arrancar — para a parte "multiplataforma".
- Qualquer **upload demorado** (vídeo grande a comprimir) — grava e depois **acelera (timelapse)** na edição.

### 2.5 Higiene do ecrã (antes de carregar em REC)

- [ ] **Fechar notificações** (Windows: Assistente de Foco / Não incomodar) e apps que possam saltar.
- [ ] **Zoom do browser a 100–110%** e fonte legível; fechar separadores/extensões a mais.
- [ ] Limpar a **barra de favoritos** e dados sensíveis do ecrã.
- [ ] Decidir o **tema** a mostrar (mostra o **escuro e o claro** uma vez para provar os 3 modos).
- [ ] **Resolução de gravação 1080p (1920×1080)**, 30 fps chega.
- [ ] Testar o **microfone** (10 s de teste) — som limpo, sem eco; de preferência com **auscultadores**.

---

## 3. Ferramentas de gravação

| Ferramenta | Quando |
|---|---|
| **OBS Studio** (grátis) | Recomendado: grava ecrã + microfone + permite **várias fontes/cenas** (ex.: ecrã + webcam ao canto). |
| **Xbox Game Bar** (`Win+G`, Windows) | Rápido para gravar uma janela, sem instalar nada. |
| **Gravador de ecrã do telemóvel** | Para o **Mobile** e para a **transmissão do telemóvel** (b-roll). |
| Edição: **CapCut / DaVinci Resolve / Clipchamp** | Cortar, acelerar uploads, juntar b-roll, legendas e setas. |

> Dica: no OBS cria **cenas** ("Web", "Modo Dev", "Mobile", "Transmissão") para alternar limpo durante a gravação.

---

## 4. Guião cena a cena (≈ 8 min)

> Alinhado com o [guião de defesa](02-manual-utilizador.md#6-guião-sugerido-para-a-defesa-10-min).
> A coluna **Mostrar** é o que aparece no ecrã; **Dizer** é a narração (resumida).

| # | Tempo | Cena | Mostrar | Dizer (essência) |
|---|---|---|---|---|
| 0 | 0:00–0:30 | **Abertura** | Título "ISPTEC News", nomes do Grupo 26, 1 frase do que é | "Plataforma de notícias multimédia cliente-servidor: criar, **comprimir**, **transmitir** e consumir notícias em **3 clientes** sobre uma API." |
| 1 | 0:30–1:30 | **Arquitetura** | Diagrama (3 clientes → API → BD) e `:3333/health` | "Uma só API REST; nenhum cliente toca na BD. Monorepo TS com tipos partilhados." |
| 2 | 1:30–2:30 | **Auth & papéis** | Login admin; abrir **dropdown de conta** (tema 3 modos); leitor a tentar ação de editor → **403** | "JWT + papéis ADMIN/EDITOR/READER; as permissões são reais." |
| 3 | 2:30–4:00 | **Compressão** 🔴 | **Media & Compressão** → upload **imagem** e **vídeo** → **relatório antes/depois**; ligar **Modo Programador** (pipeline ao vivo) | "Compressão **real**: codecs padrão **+ Huffman próprio**. As métricas (rácio, PSNR) e o Modo Dev provam-no." |
| 4 | 4:00–5:30 | **Streaming** 🔴 | Reproduzir vídeo + **arrastar a barra** (seek/Range `206`); **Iniciar transmissão → Ficheiro/Webcam** → **● AO VIVO** (HLS) | "VOD por HTTP Range (seek real) **e** live HLS capturado no browser → MediaRecorder→WebSocket→FFmpeg→HLS." |
| 5 | 5:30–7:00 | **Multiplataforma** 🔴 | Mesma conta na **Web**, no **Desktop** (Electron) e no **Mobile** (b-roll); no Mobile, **Guardar offline** | "Três clientes em **paridade**, mesma API. O Mobile até reproduz **offline**." |
| 6 | 7:00–7:45 | **Funcionalidades + UX** | Criar **notícia nova** por modal (capa+galeria); filtro de categorias; **"Ouvir" (TTS)**; **"Resumo do dia"**; tema claro↔escuro | "CMS multi-formato, TTS pt-PT, resumo do dia, tema 3 modos, dados reais nos widgets." |
| 7 | 7:45–8:00 | **Fecho** | Logs/`429` (rate-limit) rápido; ecrã final com nomes | "Segurança (rate-limit, validação), logs, e os **3 critérios de eliminação** cobertos. Obrigado." |

> Se o tempo apertar, **encurta o passo 6** — mas **nunca** os passos 3, 4 e 5 (os auto-fail).

---

## 5. Boas práticas durante a gravação

- **Fala devagar e descreve o que fazes** ("vou enviar esta imagem… repara no rácio de compressão").
- **Rato calmo:** move com intenção; usa o **zoom/realce** do gravador para apontar números importantes.
- **Uma ideia por cena.** Se erraste, **para, respira e regrava só essa cena** (juntas na edição).
- **Mostra os números:** o relatório de compressão e o seek do vídeo são o que mais convence.
- Se um upload demorar, **não esperes em silêncio** — narra o que está a acontecer ou **acelera na edição**.

---

## 6. Pós-produção

- **Cortar** silêncios e tentativas falhadas; **juntar** o b-roll (telemóvel, desktop) nos sítios certos.
- **Acelerar (2×–8×)** uploads/compressões longas, mantendo o resultado visível.
- **Legendas/títulos** por secção ("1. Arquitetura", "3. Compressão") ajudam o avaliador a seguir.
- **Setas/realces** sobre os números-chave (rácio, PSNR, `206`, ● AO VIVO, `403`/`429`).
- **Áudio:** normalizar o volume; se a narração ficou má, **regravar a voz por cima** (voice-over).
- **Exportar:** `.mp4` **1080p**, 30 fps. Confirma que o ficheiro **abre e tem som** antes de submeter.

---

## 7. Checklist final antes de submeter

- [ ] Os **3 auto-fail** aparecem **a funcionar** (compressão com relatório, streaming VOD+live, 3 clientes).
- [ ] **Áudio audível** e **texto do ecrã legível** (testar num telemóvel para confirmar).
- [ ] **Duração 5–10 min**; sem partes mortas longas.
- [ ] **Nomes do Grupo 26 + professor** no início ou no fim.
- [ ] Ficheiro exportado **abre noutro computador** e tem o nome certo (ex.: `ISPTEC-News-Grupo26-Demo.mp4`).
- [ ] (Opcional) Legendas e link para o repositório.

---

### Grupo 26 - Elementos
- **Dálcio Garcia:** 20170796
- **Osvaldo Marcolino:** 20210423

**Professor:** Bongo Cahisso

---
