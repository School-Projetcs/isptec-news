# Pack de Defesa — ISPTEC News (Grupo 26)

Cobre: apresentação (slides), guião do vídeo demonstrativo (5–10 min) e simulação de perguntas.
Alinhado com a estrutura oficial de defesa: Parte 1 (apresentação, 5 min), Parte 2 (demonstração,
10 min), Parte 3 (questionamento individual, 5 min/estudante).

---

# PARTE A — Apresentação (≈ 5 minutos, 10 slides)

> A estrutura reflete a aplicação real. Tempo total alvo: 5 min.

### Slide 1 — Capa
- **Objetivo:** identificar o projeto e a equipa.
- **Conteúdo:** "ISPTEC News — Plataforma de Notícias Multimédia". Grupo 26: Dálcio Garcia,
  Osvaldo Marcolino. Disciplina de Multimédia 2026.
- **Notas:** apresentação curta de cada elemento e do papel (Líder Técnico / Líder de Produto).
- **Tempo:** 20s.

### Slide 2 — Problema e Objetivos
- **Objetivo:** enquadrar o que o projeto resolve.
- **Conteúdo:** publicar e distribuir notícias com imagem/áudio/vídeo a partir de um servidor,
  com compressão eficiente, streaming e vários clientes.
- **Notas:** ligar aos requisitos da disciplina (compressão, streaming, cliente-servidor).
- **Tempo:** 30s.

### Slide 3 — Arquitetura geral
- **Objetivo:** mostrar a visão cliente-servidor.
- **Conteúdo:** diagrama (3 clientes → API REST → PostgreSQL + filesystem + ffmpeg/sharp).
- **Notas:** "um backend único serve Web, Desktop e Mobile por REST + JWT".
- **Tempo:** 45s.

### Slide 4 — Tecnologias
- **Objetivo:** justificar o stack.
- **Conteúdo:** Node/Express/Prisma/PostgreSQL · React/Electron/Expo · sharp/FFmpeg · HLS/Range.
- **Notas:** TypeScript ponta-a-ponta + monorepo pnpm + `@isptec/shared`.
- **Tempo:** 30s.

### Slide 5 — Compressão (núcleo 1)
- **Objetivo:** destacar o requisito de auto-fail.
- **Conteúdo:** imagem (WebP/JPEG + PSNR), áudio (MP3/AAC/OGG), vídeo (H.264/H.265/VP9) +
  **Huffman próprio**. Relatório comparativo (tamanho/taxa/tempo/qualidade).
- **Notas:** sublinhar o algoritmo próprio como prova de domínio.
- **Tempo:** 45s.

### Slide 6 — Streaming (núcleo 2)
- **Objetivo:** destacar o segundo auto-fail.
- **Conteúdo:** VOD por HTTP Range (seek real, 206) + ao vivo por HLS (browser/RTMP/simulado).
- **Notas:** controlos: play/pause/stop/avançar/retroceder/volume/progresso.
- **Tempo:** 40s.

### Slide 7 — Segurança (certificados / CA)
- **Objetivo:** mostrar a segurança da comunicação **e** a segurança por certificados.
- **Conteúdo:** **PKI com Autoridade Certificadora** — só dispositivos com certificado conectam
  (anti-pirataria/MITM); **não-repúdio** (conteúdo assinado, verificável); **separação de papéis**
  (Admin só gere contas/certificados). Base: JWT + bcrypt, zod, helmet/cors, rate-limit, logs.
- **Visual:** diagrama do handshake (desafio→assinatura→token) — o mesmo de `docs/SEGURANCA-PKI.md`.
- **Tempo:** 45s.

### Slide 8 — Cliente multiplataforma (auto-fail 3)
- **Objetivo:** provar os três clientes.
- **Conteúdo:** capturas Web, Desktop (Electron) e Mobile (Expo) sobre a mesma API.
- **Tempo:** 25s.

### Slide 9 — Funcionalidades específicas do tema
- **Objetivo:** valorizar o produto.
- **Conteúdo:** feed/categorias, pesquisa, comentários, guardados, TTS, "Resumo do dia", tema,
  widgets reais (tempo/mercados).
- **Tempo:** 25s.

### Slide 10 — Conclusão + divisão de trabalho
- **Objetivo:** fechar e mostrar contribuição individual.
- **Conteúdo:** estado (requisitos cumpridos), o que cada um fez (ambos programaram).
- **Tempo:** 20s.

---

# PARTE B — Guião do Vídeo Demonstrativo (5–10 min)

> Segue a jornada natural da app e cobre todos os requisitos sem parecer uma checklist.
> Gravar com a app a correr (`pnpm start:all`), conta `admin@isptec.local` / `admin123`.

### Cena 1 — Abertura e visão geral (0:00–0:45)
- **Mostrar:** a Home (feed, hero, últimas, secção ao vivo, widgets).
- **Dizer:** "Esta é a ISPTEC News, uma plataforma de notícias multimédia cliente-servidor."
- **Requisito comprovado:** arquitetura cliente-servidor, consulta de conteúdos.

### Cena 2 — Autenticação (0:45–1:30)
- **Mostrar:** login como admin; referir registo e os papéis.
- **Dizer:** "A autenticação usa JWT; há três papéis com permissões diferentes."
- **Requisito:** gestão de utilizadores, autenticação, permissões.

### Cena 3 — Upload + compressão automática (1:30–3:15)
- **Mostrar:** criar notícia, fazer upload de uma imagem **e** de um vídeo; abrir o
  **relatório de compressão** (`/media/:id/report` ou MediaLab). Opcional: abrir o **Modo Dev**
  para ver o pipeline em tempo real (SSE).
- **Dizer:** "Ao enviar, a API comprime automaticamente — WebP/JPEG e PSNR para imagem;
  H.264/H.265/VP9 para vídeo — e ainda aplico Huffman próprio. Aqui está o relatório: tamanho
  original, comprimido, taxa, tempo e qualidade."
- **Requisito:** upload, **compressão (auto-fail)**, relatório comparativo.

### Cena 4 — Streaming sob demanda (VOD) (3:15–4:30)
- **Mostrar:** abrir o detalhe de uma notícia com vídeo; play, pause, **arrastar a barra de
  progresso** (seek), volume.
- **Dizer:** "O vídeo é servido por HTTP Range — o player pede intervalos de bytes, por isso o
  *seek* é real, sem descarregar tudo."
- **Requisito:** **streaming VOD (auto-fail)**, controlos do player.

### Cena 5 — Streaming ao vivo (4:30–5:45)
- **Mostrar:** iniciar transmissão (modal → webcam/ficheiro ou simulada); ver o card AO VIVO a
  reproduzir por HLS.
- **Dizer:** "A transmissão captura no browser, envia por WebSocket para o FFmpeg, que gera HLS
  distribuído por hls.js."
- **Requisito:** **streaming em tempo real**.

### Cena 6 — Download e pesquisa (5:45–6:45)
- **Mostrar:** descarregar um ficheiro; usar a **caixa de pesquisa** e o filtro por categoria.
- **Dizer:** "O conteúdo pode ser descarregado (original ou variante) e pesquisado por texto."
- **Requisito:** download, pesquisa.

### Cena 7 — Cliente multiplataforma (6:45–8:00)
- **Mostrar:** a app **Desktop** (Electron) e a **Mobile** (Expo) a consumir a mesma API —
  feed, reprodução, upload.
- **Dizer:** "O mesmo backend serve três clientes; o cliente multiplataforma é um requisito
  obrigatório."
- **Requisito:** **cliente multiplataforma (auto-fail)**.

### Cena 8 — Segurança por certificados (PKI / CA) (8:00–9:30) ⭐
> A cena mais importante para a nota de segurança. **Preparar antes de gravar:**
> `pnpm ca:init` e `pnpm cert:issue --user editor@isptec.local --label "PC do Editor"`,
> e pôr `PKI_ENFORCE="true"` em `apps/api/.env`. Ter o terminal visível ao lado da app.

- **Mostrar (sem certificado):** abrir a Web — as chamadas falham com *"Dispositivo não
  certificado"*. **Dizer:** *"Antes de mais: esta máquina não tem certificado, por isso o servidor
  recusa-a — nem sequer obtém uma sessão. É assim que evitamos pirataria e man-in-the-middle."*
- **Mostrar (importar certificado):** menu → **Dispositivo & Certificado** → importar o
  `.enrollment.json` → "sessão de dispositivo ativa"; a app passa a funcionar.
  **Dizer:** *"Quem emite os certificados é a Autoridade Certificadora, não o servidor. O servidor
  só tem a chave pública da CA e verifica. No login, o dispositivo prova que tem a chave privada
  assinando um desafio aleatório — apresentar o certificado não chega."*
- **Mostrar (não-repúdio):** publicar/abrir uma notícia → clicar **"🔏 Verificar autenticidade"**
  → ✔ assinada por <Editor>, certificado <série>, emitido por ISPTEC-CA.
  **Dizer:** *"Esta é a resposta à pergunta 'como validam que foi este utilizador a colocar este
  conteúdo?': o conteúdo está assinado pela chave privada do dispositivo do autor; a assinatura é
  verificável por qualquer um e quebra se o conteúdo for alterado — isto é o não-repúdio."*
  (Opcional: alterar o texto na BD e verificar de novo → ✘ inválida.)
- **Mostrar (máquina sem certificado — exame):** no terminal `pnpm cert:bypass --label "Júri"` →
  colar o `deviceId` em **"Ligar sem certificado"** → conecta.
  **Dizer:** *"O administrador pode, à parte, autorizar uma máquina sem certificado — é uma exceção
  explícita e registada, controlada pelo servidor."*
- **Requisito:** **segurança (certificados/CA), não-repúdio, autorização de dispositivos**.

### Cena 9 — Administração, papéis e fecho (9:30–10:00)
- **Mostrar:** painel de Admin (utilizadores, **dispositivos/certificados**, logs). Referir que o
  **Admin não cria conteúdo** (separação de papéis) e o rate-limit/JWT de base.
- **Dizer:** *"O administrador só gere contas e certificados — não publica. Resumindo: compressão,
  streaming e clientes multiplataforma cumpridos, com segurança por certificados, não-repúdio e logs."*
- **Requisito:** permissões (separação de papéis), logs, segurança.

> **Dicas de gravação:** falar devagar e ligar cada ação a um **requisito** ("isto prova…"); ter os
> comandos prontos num bloco de notas para colar; se algo falhar, continuar e voltar atrás depois;
> gravar o ecrã a 1080p e o microfone perto. Manter o total **entre 5 e 10 min** (margem de 1 min).

---

# PARTE C — Simulação de Perguntas da Defesa (30+)

> Para cada estudante: saber explicar código, alterar funcionalidades, consultar a BD e
> justificar decisões. Respostas-modelo abaixo.

## Multimédia e Compressão

**1. O que é compressão com perdas vs. sem perdas?**
- *Resposta:* Com perdas (JPEG, MP3, H.264) descarta informação pouco percetível para reduzir
  mais o tamanho; sem perdas (Huffman, PNG) reconstrói o original exatamente.
- *Justificação:* No projeto uso ambas — codecs com perdas (sharp/FFmpeg) e Huffman sem perdas.
- *Derivadas:* "Onde usas cada uma?" "Porque o WebP é menor que o JPEG?"

**2. Como funciona o teu algoritmo de Huffman?**
- *Resposta:* Conta frequências dos bytes, constrói uma árvore binária juntando sempre os dois nós
  menos frequentes, atribui códigos mais curtos aos símbolos mais frequentes e empacota os bits.
  O cabeçalho guarda a tabela de frequências para reconstruir a árvore na descompressão.
- *Justificação:* `media-engine/huffman.ts`, implementado de raiz (encode + decode).
- *Derivadas:* "É ótimo?" (sim, para codificação por símbolo) "Porque aplicas aos pixels em bruto?"

**3. Porque aplicas o Huffman aos pixels em bruto e não ao ficheiro JPEG?**
- *Resposta:* Um JPEG já está comprimido; aplicar Huffman daria ~1×. Sobre os pixels RGB em bruto
  há redundância real, logo demonstra compressão efetiva e sem perdas.

**4. O que é o PSNR e como o calculas?**
- *Resposta:* Peak Signal-to-Noise Ratio — mede a qualidade da variante face ao original a partir
  do erro quadrático médio (MSE). Quanto maior (dB), mais próxima do original.
- *Justificação:* `computePSNR()` em `image.ts`. ∞/99 quando idênticos.

**5. Qual a diferença entre H.264, H.265 e VP9?**
- *Resposta:* H.265 e VP9 comprimem melhor que H.264 para a mesma qualidade, à custa de mais
  processamento; VP9 é aberto (Google), H.265 tem licenciamento.
- *Justificação:* `video.ts` gera os três (libx264/libx265/libvpx-vp9).

**6. Porque geras várias variantes por ficheiro?**
- *Resposta:* Para comparar codecs/qualidades no relatório e permitir escolher a melhor para cada
  rede/dispositivo (adaptação).

**7. Os teus codecs são reais ou simulados?**
- *Resposta:* Reais — via FFmpeg (ffmpeg-static) e sharp; o `selftest-compression.ts` prova-o.

## Streaming e Redes

**8. O que é um HTTP Range Request?**
- *Resposta:* O cliente pede um intervalo de bytes (`Range: bytes=start-end`) e o servidor responde
  `206 Partial Content` com `Content-Range`. Permite *seek* sem transferir o ficheiro todo.
- *Justificação:* `serveWithRange()` em `media-engine/serve.ts`.

**9. Como funciona o teu streaming ao vivo?**
- *Resposta:* O browser captura com `getUserMedia`/`captureStream`, grava com `MediaRecorder` e
  envia chunks por WebSocket; o servidor escreve no stdin de um FFmpeg que gera HLS (`.m3u8` + `.ts`),
  consumido por `hls.js`.

**10. O que é HLS e porque o usaste em vez de WebRTC?**
- *Resposta:* HLS (HTTP Live Streaming) segmenta o vídeo em `.ts` com um manifesto `.m3u8`; é simples,
  atravessa firewalls (HTTP) e tem boa compatibilidade. WebRTC é mais complexo (sinalização/ICE) e
  desnecessário para difusão um-para-muitos com latência tolerável.

**11. Qual a diferença entre VOD e streaming ao vivo?**
- *Resposta:* VOD = conteúdo já existente, o utilizador escolhe quando ver (Range). Ao vivo =
  gerado em tempo real e segmentado continuamente (HLS).

**12. O que é o RTMP e onde aparece?**
- *Resposta:* Protocolo de ingestão (ex.: OBS) sobre TCP 1935; o `node-media-server` recebe-o e o
  FFmpeg converte para HLS. Está como via opcional/legacy.

**13. Onde estão os controlos de play/pause/volume/seek?**
- *Resposta:* São os controlos nativos do `<video>`/`<audio>` HTML5 (Web) e `expo-video`/`expo-audio`
  (Mobile); o *seek* funciona porque o servidor suporta Range.

**14. Como garantes que o `.m3u8`/`.ts` não permite *path traversal*?**
- *Resposta:* `GET /stream/hls/:key/:file` valida `key` e `file` com regex (sem `..`/barras).

## APIs e Cliente-Servidor

**15. Porque uma API REST e não outra abordagem?**
- *Resposta:* REST é simples, sem estado e desacopla os clientes; um único backend serve os três.

**16. Como os clientes encontram a API?**
- *Resposta:* URL base por variável de ambiente (`VITE_API_URL` Web/Desktop, `EXPO_PUBLIC_API_URL`
  Mobile), com *fallback* resiliente em `lib/api.ts`.

**17. O que partilham os clientes?**
- *Resposta:* O pacote `@isptec/shared` (tipos + schemas zod), evitando divergência entre cliente
  e servidor.

**18. Como tratas erros na API?**
- *Resposta:* `asyncHandler` + middleware `errorHandler`/`notFound`; respostas no formato
  `{ ok, data | error }`.

## Segurança

**19. Como funciona a autenticação?**
- *Resposta:* Login valida com bcrypt e emite um JWT; o cliente envia-o em `Authorization: Bearer`;
  `requireAuth` valida e popula `req.user`.

**20. Porque bcrypt e não guardar a palavra-passe?**
- *Resposta:* bcrypt é *hash* lento com *salt*, resistente a *brute-force* e *rainbow tables*;
  nunca guardamos a palavra-passe em claro.

**21. Como controlas permissões? (separação de papéis)**
- *Resposta:* `requireRole(...)` por rota. **EDITOR** trata do conteúdo (notícias/media/streaming);
  **ADMIN** só faz gestão (contas, certificados, logs) e **não cria/publica conteúdo**; **READER**
  consome. A propriedade do autor é validada no DELETE.

### Segurança por certificados (PKI / CA) — ver `docs/SEGURANCA-PKI.md`

**21.1. Como funciona o vosso sistema de certificados?**
- *Resposta:* Uma **Autoridade Certificadora (CA)** emite, para cada dispositivo, um certificado
  (documento assinado pela CA que liga o dispositivo à sua chave pública). No arranque, o cliente
  faz um **handshake**: pede um desafio (nonce), assina-o com a **chave privada** e troca-o por um
  token de sessão. Sem certificado válido, o servidor recusa (`PKI_ENFORCE`).

**21.2. Quem gere os certificados — o servidor?**
- *Resposta:* Não. A **CA** emite (chave privada da CA isolada em `apps/api/.pki`, fora do git). O
  **servidor só tem a chave pública** da CA e **verifica**. Separar quem emite de quem serve dá mais
  segurança.

**21.3. Como impede pirataria e man-in-the-middle?**
- *Resposta:* Só máquinas com certificado da CA entram (pirataria). E apresentar o certificado **não
  chega** — é preciso **assinar o desafio** com a chave privada, que nunca circula; quem estiver pelo
  meio não a tem, logo não obtém sessão (MITM).

**21.4. Como validam que foi este utilizador a colocar este conteúdo? (não-repúdio)**
- *Resposta:* O conteúdo é **assinado** pela chave privada do dispositivo do autor (`POST
  /news/:id/sign`). Qualquer um pode revalidar (`GET /news/:id/signature`): só aquela chave privada,
  certificada pela CA a esse utilizador, poderia ter produzido a assinatura, e ela **quebra** se o
  conteúdo mudar. Botão "Verificar autenticidade" na app.

**21.5. Como adicionam uma máquina SEM certificado?** *(pergunta provável do exame)*
- *Resposta:* Com o comando do servidor `pnpm cert:bypass --label "<nome>"`, que regista o dispositivo
  numa **lista de exceção** (estado `BYPASS`). A máquina liga-se só com o `deviceId` — é uma exceção
  explícita e auditável, controlada pelo administrador.

**21.6. Que algoritmo usam e porquê ao nível da aplicação?**
- *Resposta:* **ECDSA P-256 + SHA-256**, nativo no Node e na Web Crypto (sem bibliotecas). Fizemos a
  PKI ao nível da aplicação (e não TLS de transporte) para funcionar igual em Web, Desktop e Mobile
  sem instalar certificados no sistema operativo — os conceitos (CA, certificado, prova de posse,
  não-repúdio) são os mesmos.

**22. O que é o rate-limiting e onde está?**
- *Resposta:* Limita pedidos por IP/janela; global + estrito em login/registo (anti força-bruta),
  em `middleware/rateLimit.ts`.

**23. Para que serve a validação com zod?**
- *Resposta:* Garante que o corpo dos pedidos tem o formato esperado antes de tocar na BD,
  prevenindo dados inválidos.

**24. A comunicação é segura sem HTTPS em dev?**
- *Resposta:* Em dev é local; para acesso externo uso um túnel Cloudflare (HTTPS/WSS). Em produção
  define-se TLS no proxy/CDN.

## Base de Dados

**25. Mostra o modelo de dados.**
- *Resposta:* User → News → Media → MediaVariant; mais Category, Comment, SavedNews, Log
  (`prisma/schema.prisma`). *(Saber fazer uma query Prisma/SQL ao vivo.)*

**26. Como guardas as métricas de compressão?**
- *Resposta:* Cada `MediaVariant` guarda `size`, `compressionRatio`, `processingMs`, `qualityScore`;
  o relatório agrega-as.

**27. Porque PostgreSQL e Prisma?**
- *Resposta:* Modelo relacional bem definido; Prisma dá migrações versionadas e tipos TypeScript.

**28. Como fazer uma consulta na BD ao vivo?**
- *Resposta:* `pnpm db:studio` (Prisma Studio) ou SQL via Adminer/psql — ex.: contar notícias
  publicadas, listar variantes de uma media.

## Arquitetura, Tecnologias e Engenharia

**29. Porquê monorepo?**
- *Resposta:* Partilhar tipos/configuração e desenvolver os clientes e a API em conjunto, com um
  único `pnpm install`.

**30. Como passas de desenvolvimento para produção?**
- *Resposta:* Muda-se `DATABASE_URL` (API) e `VITE_API_URL`/`EXPO_PUBLIC_API_URL` (clientes);
  o servidor escuta em `0.0.0.0`.

**31. Que parte do código escreveste tu? (questão individual)**
- *Resposta:* Cada elemento deve indicar módulos concretos (ex.: media-engine/streaming vs.
  clientes/UI/BD) — ambos programaram, como exige o enunciado.

**32. Se eu pedir para mudar uma funcionalidade agora, como farias?**
- *Resposta:* Exemplo: adicionar uma nova variante de áudio = acrescentar um item a `AUDIO_VARIANTS`
  em `audio.ts`; mudar a porta = `PORT` no `.env`. Saber localizar e editar ao vivo.

**33. Qual foi a maior dificuldade técnica?**
- *Resposta (exemplo):* fazer a ingestão de vídeo do browser chegar ao FFmpeg em tempo real
  (MediaRecorder → WebSocket → stdin do FFmpeg) e gerar HLS de forma estável.

**34. O que melhorarias com mais tempo?**
- *Resposta:* Gestão de perfil editável, instalador Desktop, testes automatizados E2E e
  reprodução adaptativa (ABR) no HLS.
