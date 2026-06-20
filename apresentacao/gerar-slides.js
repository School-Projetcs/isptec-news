const pptxgen = require('pptxgenjs');

// ── Paleta (informada pela própria app: navy editorial + vermelho-notícia) ──
const NAVY = '0B1F3A';   // dominante escuro (app --ink)
const NAVY2 = '14294D';  // cartões escuros
const RED = 'E02424';    // accent noticioso (app --accent)
const SLATE = '5B6472';  // texto atenuado
const ICE = 'EEF2F8';    // painel claro
const LINE = 'E2E8F0';   // bordas de cartão
const WHITE = 'FFFFFF';
const SKY = 'CADCFC';    // texto claro sobre escuro
const HEAD = 'Georgia';  // títulos (editorial)
const BODY = 'Calibri';  // corpo

const pres = new pptxgen();
pres.defineLayout({ name: 'W', width: 13.33, height: 7.5 });
pres.layout = 'W';
pres.author = 'Grupo 26 — ISPTEC News';
pres.title = 'ISPTEC News — Apresentação';

const W = 13.33, H = 7.5;
const shadow = () => ({ type: 'outer', color: '0B1F3A', blur: 9, offset: 3, angle: 90, opacity: 0.10 });

let pageNo = 0;
function footer(slide) {
  pageNo++;
  slide.addText('ISPTEC News · Grupo 26', { x: 0.6, y: 7.02, w: 6, h: 0.32, fontFace: BODY, fontSize: 9, color: SLATE, align: 'left', margin: 0 });
  slide.addText(String(pageNo).padStart(2, '0'), { x: 12.1, y: 7.02, w: 0.63, h: 0.32, fontFace: BODY, fontSize: 9, color: SLATE, align: 'right', margin: 0 });
}
function header(slide, kicker, title) {
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 0.66, w: 0.16, h: 0.16, fill: { color: RED } });
  slide.addText(kicker.toUpperCase(), { x: 0.86, y: 0.58, w: 11, h: 0.32, fontFace: BODY, fontSize: 11, bold: true, color: RED, charSpacing: 2, margin: 0 });
  slide.addText(title, { x: 0.57, y: 0.92, w: 12.2, h: 0.8, fontFace: HEAD, fontSize: 30, bold: true, color: NAVY, margin: 0 });
}
function content(kicker, title) {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  header(s, kicker, title);
  return s;
}
function card(slide, x, y, w, h, fill, withShadow) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.09,
    fill: { color: fill || WHITE },
    line: fill && fill !== WHITE ? { type: 'none' } : { color: LINE, width: 1 },
    shadow: withShadow ? shadow() : undefined,
  });
}
function circle(slide, x, y, d, fill, label, labelColor, fontSize) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill } });
  slide.addText(label, { x, y, w: d, h: d, align: 'center', valign: 'middle', fontFace: HEAD, fontSize: fontSize || 18, bold: true, color: labelColor || WHITE, margin: 0 });
}

// ════════════════════════ 1 · CAPA ════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  // motivo: bloco vermelho contido (sem barras/ribbons decorativas)
  s.addShape(pres.shapes.RECTANGLE, { x: 0.95, y: 1.55, w: 0.55, h: 0.55, fill: { color: RED } });
  s.addText('MULTIMÉDIA 2026 · PROJETO FINAL', { x: 0.95, y: 2.35, w: 11, h: 0.4, fontFace: BODY, fontSize: 14, bold: true, color: SKY, charSpacing: 3, margin: 0 });
  s.addText('ISPTEC News', { x: 0.9, y: 2.7, w: 11.5, h: 1.5, fontFace: HEAD, fontSize: 66, bold: true, color: WHITE, margin: 0 });
  s.addText('Plataforma de Notícias Multimédia', { x: 0.95, y: 4.15, w: 11, h: 0.7, fontFace: HEAD, fontSize: 26, italic: true, color: SKY, margin: 0 });
  s.addText('Criar · Comprimir · Transmitir · Consumir — em Web, Desktop e Mobile.', { x: 0.95, y: 4.85, w: 11.4, h: 0.45, fontFace: BODY, fontSize: 15, color: 'AEBBD6', margin: 0 });
  // rodapé da capa: equipa
  s.addShape(pres.shapes.LINE, { x: 0.97, y: 5.95, w: 4.2, h: 0, line: { color: '2A3F63', width: 1 } });
  s.addText([
    { text: 'Grupo 26   ', options: { bold: true, color: WHITE } },
    { text: 'Dálcio Garcia (20170796)  ·  Osvaldo Marcolino (20210423)', options: { color: SKY } },
  ], { x: 0.95, y: 6.1, w: 11.5, h: 0.4, fontFace: BODY, fontSize: 14, margin: 0 });
  s.addText('Docente: Bongo Cahisso', { x: 0.95, y: 6.5, w: 11, h: 0.4, fontFace: BODY, fontSize: 13, color: SLATE, margin: 0 });
})();

// ════════════════════════ 2 · O DESAFIO ════════════════════════
(() => {
  const s = content('Contexto', 'O desafio');
  s.addText('Construir uma plataforma de notícias multimédia de raiz, com arquitetura cliente-servidor real, que cubra todo o ciclo do conteúdo — e funcione em vários dispositivos sobre uma única API.', {
    x: 0.7, y: 2.0, w: 6.0, h: 2.0, fontFace: BODY, fontSize: 17, color: NAVY, lineSpacingMultiple: 1.25, valign: 'top', margin: 0,
  });
  s.addText('Idioma do projeto: português. Demonstração principal local (a máquina como servidor).', {
    x: 0.7, y: 4.35, w: 6.0, h: 1.0, fontFace: BODY, fontSize: 13, italic: true, color: SLATE, valign: 'top', margin: 0,
  });
  // 2x2 verbos
  const verbs = [
    ['Criar', 'Texto, imagem, áudio e vídeo num CMS próprio.'],
    ['Comprimir', 'Codecs reais + algoritmo próprio, com métricas.'],
    ['Transmitir', 'VOD por streaming e emissão ao vivo.'],
    ['Consumir', 'Ler, ouvir, comentar, guardar e partilhar.'],
  ];
  const bx = 7.05, bw = 2.86, bh = 2.0, gap = 0.3, by = 2.0;
  verbs.forEach((v, i) => {
    const x = bx + (i % 2) * (bw + gap);
    const y = by + Math.floor(i / 2) * (bh + gap);
    card(s, x, y, bw, bh, WHITE, true);
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y + 0.28, w: 0.1, h: 0.5, fill: { color: RED } });
    s.addText(v[0], { x: x + 0.28, y: y + 0.26, w: bw - 0.5, h: 0.5, fontFace: HEAD, fontSize: 19, bold: true, color: NAVY, margin: 0 });
    s.addText(v[1], { x: x + 0.28, y: y + 0.86, w: bw - 0.5, h: 1.0, fontFace: BODY, fontSize: 12.5, color: SLATE, lineSpacingMultiple: 1.15, valign: 'top', margin: 0 });
  });
  footer(s);
})();

// ════════════════════════ 3 · A SOLUÇÃO EM NÚMEROS ════════════════════════
(() => {
  const s = content('Visão geral', 'A solução em números');
  const stats = [
    ['3', 'clientes', 'Web · Desktop · Mobile'],
    ['1', 'API REST', 'Node · Express · Prisma'],
    ['1', 'base de dados', 'PostgreSQL 16'],
    ['1', 'pacote partilhado', 'Tipos + validação (zod)'],
  ];
  const cw = 2.86, gap = 0.3, x0 = 0.7, y = 2.4, ch = 3.0;
  stats.forEach((st, i) => {
    const x = x0 + i * (cw + gap);
    card(s, x, y, cw, ch, i === 0 ? NAVY : WHITE, true);
    const num = i === 0 ? WHITE : RED;
    const lab = i === 0 ? WHITE : NAVY;
    const sub = i === 0 ? SKY : SLATE;
    s.addText(st[0], { x, y: y + 0.35, w: cw, h: 1.3, align: 'center', fontFace: HEAD, fontSize: 66, bold: true, color: num, margin: 0 });
    s.addText(st[1], { x, y: y + 1.75, w: cw, h: 0.5, align: 'center', fontFace: HEAD, fontSize: 18, bold: true, color: lab, margin: 0 });
    s.addText(st[2], { x: x + 0.15, y: y + 2.3, w: cw - 0.3, h: 0.55, align: 'center', fontFace: BODY, fontSize: 12, color: sub, margin: 0 });
  });
  s.addText('Monorepo em TypeScript — o mesmo modelo de dados e validação em toda a stack, sem duplicação.', {
    x: 0.7, y: 5.75, w: 11.9, h: 0.5, align: 'center', fontFace: BODY, fontSize: 14, italic: true, color: SLATE, margin: 0,
  });
  footer(s);
})();

// ════════════════════════ 4 · ARQUITETURA ════════════════════════
(() => {
  const s = content('Pilar 1 — 25%', 'Arquitetura cliente-servidor');
  // clientes
  const clients = [
    ['Web', 'React + Vite'],
    ['Desktop', 'Electron'],
    ['Mobile', 'Expo / React Native'],
  ];
  const cyc = [2.15, 3.4, 4.65];
  clients.forEach((c, i) => {
    const y = cyc[i];
    card(s, 0.7, y, 2.8, 1.0, WHITE, true);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: y + 0.18, w: 0.1, h: 0.64, fill: { color: RED } });
    s.addText(c[0], { x: 0.95, y: y + 0.16, w: 2.4, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: NAVY, margin: 0 });
    s.addText(c[1], { x: 0.95, y: y + 0.56, w: 2.4, h: 0.35, fontFace: BODY, fontSize: 11.5, color: SLATE, margin: 0 });
  });
  // setas clientes -> API
  const arrow = (x, y, w, h, dbl) => s.addShape(pres.shapes.LINE, { x, y, w, h, line: { color: SLATE, width: 1.75, endArrowType: 'triangle', beginArrowType: dbl ? 'triangle' : 'none' } });
  arrow(3.5, 2.65, 1.9, 1.05);
  arrow(3.5, 3.9, 1.9, 0.0);
  arrow(3.5, 5.15, 1.9, -1.05);
  // API
  card(s, 5.5, 3.0, 3.0, 1.7, NAVY, true);
  s.addText('API REST', { x: 5.5, y: 3.25, w: 3.0, h: 0.5, align: 'center', fontFace: HEAD, fontSize: 22, bold: true, color: WHITE, margin: 0 });
  s.addText('Node · Express · Prisma', { x: 5.5, y: 3.8, w: 3.0, h: 0.4, align: 'center', fontFace: BODY, fontSize: 13, color: SKY, margin: 0 });
  s.addText('Auth · CMS · Compressão · Streaming', { x: 5.6, y: 4.2, w: 2.8, h: 0.4, align: 'center', fontFace: BODY, fontSize: 10.5, color: 'AEBBD6', margin: 0 });
  // seta API <-> DB
  arrow(8.5, 3.85, 1.35, 0.0, true);
  // DB
  card(s, 9.85, 3.05, 2.8, 1.6, ICE, false);
  s.addText('PostgreSQL 16', { x: 9.85, y: 3.35, w: 2.8, h: 0.5, align: 'center', fontFace: HEAD, fontSize: 18, bold: true, color: NAVY, margin: 0 });
  s.addText('via Docker (dev)', { x: 9.85, y: 3.9, w: 2.8, h: 0.4, align: 'center', fontFace: BODY, fontSize: 12, color: SLATE, margin: 0 });
  // nota inferior
  card(s, 0.7, 6.05, 11.93, 0.78, ICE, false);
  s.addText([
    { text: 'Nenhum cliente toca na base de dados. ', options: { bold: true, color: NAVY } },
    { text: 'packages/shared partilha tipos e validação (zod); a URL da API é configurável por variável de ambiente (local ou produção).', options: { color: SLATE } },
  ], { x: 0.95, y: 6.05, w: 11.5, h: 0.78, fontFace: BODY, fontSize: 12.5, valign: 'middle', margin: 0 });
  footer(s);
})();

// ════════════════════════ 5 · OS 3 AUTO-FAIL ════════════════════════
(() => {
  const s = content('Critérios de eliminação', 'Os três pilares obrigatórios');
  s.addText('Se faltar um destes, o projeto reprova. Por isso foram feitos cedo, a sério — e estão verificados.', {
    x: 0.7, y: 1.78, w: 11.9, h: 0.4, fontFace: BODY, fontSize: 14, italic: true, color: SLATE, margin: 0,
  });
  const items = [
    ['1', 'Compressão', 'Motor próprio: codecs reais + algoritmo Huffman implementado por nós, com métricas.'],
    ['2', 'Streaming', 'VOD por HTTP Range (seek real) e emissão ao vivo por HLS — nunca simulado.'],
    ['3', 'Cliente multiplataforma', 'Web, Desktop e Mobile em paridade, sobre a mesma API REST.'],
  ];
  const cw = 3.84, gap = 0.27, x0 = 0.7, y = 2.4, ch = 3.5;
  items.forEach((it, i) => {
    const x = x0 + i * (cw + gap);
    card(s, x, y, cw, ch, WHITE, true);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: 0.14, fill: { color: RED } });
    circle(s, x + 0.35, y + 0.45, 0.85, RED, it[0], WHITE, 30);
    s.addText(it[1], { x: x + 0.35, y: y + 1.5, w: cw - 0.7, h: 0.85, fontFace: HEAD, fontSize: 21, bold: true, color: NAVY, valign: 'top', margin: 0 });
    s.addText(it[2], { x: x + 0.35, y: y + 2.35, w: cw - 0.7, h: 1.0, fontFace: BODY, fontSize: 13, color: SLATE, lineSpacingMultiple: 1.2, valign: 'top', margin: 0 });
  });
  footer(s);
})();

// helper para slides de detalhe (2 colunas)
function detail(kicker, title, lead, leadSub, cardTitle, bullets, strip) {
  const s = content(kicker, title);
  s.addText(lead, { x: 0.7, y: 2.1, w: 5.9, h: 1.6, fontFace: HEAD, fontSize: 22, bold: true, color: NAVY, lineSpacingMultiple: 1.1, valign: 'top', margin: 0 });
  s.addText(leadSub, { x: 0.7, y: 3.65, w: 5.9, h: 2.0, fontFace: BODY, fontSize: 15, color: SLATE, lineSpacingMultiple: 1.3, valign: 'top', margin: 0 });
  card(s, 6.95, 2.1, 5.68, 3.7, ICE, false);
  s.addText(cardTitle.toUpperCase(), { x: 7.3, y: 2.4, w: 5, h: 0.35, fontFace: BODY, fontSize: 12, bold: true, color: RED, charSpacing: 1.5, margin: 0 });
  s.addText(bullets.map((b, i) => ({ text: b, options: { bullet: { code: '2022', indent: 16 }, color: NAVY, breakLine: true, paraSpaceAfter: 9 } })),
    { x: 7.3, y: 2.85, w: 5.0, h: 2.8, fontFace: BODY, fontSize: 14, valign: 'top', margin: 0 });
  if (strip) {
    card(s, 0.7, 6.05, 11.93, 0.78, NAVY, false);
    s.addText(strip, { x: 0.95, y: 6.05, w: 11.5, h: 0.78, fontFace: BODY, fontSize: 13, color: WHITE, valign: 'middle', margin: 0 });
  }
  footer(s);
  return s;
}

// ════════════════════════ 6 · COMPRESSÃO ════════════════════════
detail('Pilar 2 — auto-fail · 10%', 'Compressão', 'Motor de compressão próprio.',
  'Além dos codecs padrão da indústria, implementámos um algoritmo Huffman — para demonstrar conhecimento, não apenas usar bibliotecas.',
  'O que comprimimos',
  ['Imagem — WebP / JPEG', 'Áudio — MP3 / AAC / OGG', 'Vídeo — H.264 / H.265 / VP9', 'Algoritmo Huffman próprio (núcleo do JPEG)'],
  'Cada ficheiro gera variantes com rácio, PSNR (qualidade) e tempo — visível ao vivo no Modo Programador.');

// ════════════════════════ 7 · STREAMING ════════════════════════
detail('Pilar 2 — auto-fail · 15%', 'Streaming', 'Streaming real, nunca simulado.',
  'Vídeo a pedido (VOD) servido por HTTP Range — o player faz seek real (resposta 206) — e emissão ao vivo por HLS.',
  'Emissão ao vivo (3 fontes)',
  ['Captura no browser → MediaRecorder', '→ WebSocket → FFmpeg → HLS → hls.js', 'Fontes: Telemóvel (QR) · Webcam · Ficheiro', 'Sem instalar nada; nada arranca sem confirmar'],
  'O pipeline corre todo no browser e na nossa API — sem aplicações externas.');

// ════════════════════════ 8 · MULTIPLATAFORMA ════════════════════════
detail('Pilar 3 — auto-fail · arquitetura', 'Cliente multiplataforma', 'Três clientes, uma só API.',
  'A mesma conta e os mesmos dados em Web, Desktop e Mobile. A URL da API muda com uma única variável de ambiente.',
  'Os três clientes',
  ['Web — React + Vite (app principal)', 'Desktop — Electron (embrulha a Web)', 'Mobile — Expo / React Native', 'Mobile reproduz media offline'],
  'Em paridade de funcionalidades: feed, detalhe, comentários, TTS, resumo do dia, partilhar e guardar.');

// ════════════════════════ 9 · FUNCIONALIDADES ════════════════════════
(() => {
  const s = content('Funcionalidades — 25%', 'O que a plataforma faz');
  const feats = [
    ['Autenticação & papéis', 'JWT + bcrypt; ADMIN, EDITOR e LEITOR com permissões reais.'],
    ['CMS multi-formato', 'Notícias com texto, imagem, áudio e vídeo; rascunho/publicado.'],
    ['Categorias, filtro & pesquisa', 'Feed filtrável por categoria e pesquisa por título/resumo.'],
    ['Comentários', 'Comentar nas notícias; eliminar pelo autor ou admin.'],
    ['Ouvir & Resumo do dia', 'Leitura em voz alta (TTS pt-PT) e top de notícias do dia.'],
    ['Partilhar & Guardar', 'Partilha (respeita o túnel) e notícias guardadas por conta.'],
  ];
  const cw = 3.84, gap = 0.27, ch = 1.95, x0 = 0.7, y0 = 2.1, vgap = 0.3;
  feats.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (cw + gap), y = y0 + row * (ch + vgap);
    card(s, x, y, cw, ch, WHITE, true);
    circle(s, x + 0.3, y + 0.32, 0.42, NAVY, String(i + 1), WHITE, 15);
    s.addText(f[0], { x: x + 0.85, y: y + 0.28, w: cw - 1.1, h: 0.6, fontFace: HEAD, fontSize: 15.5, bold: true, color: NAVY, valign: 'middle', margin: 0 });
    s.addText(f[1], { x: x + 0.3, y: y + 0.95, w: cw - 0.6, h: 0.9, fontFace: BODY, fontSize: 12, color: SLATE, lineSpacingMultiple: 1.18, valign: 'top', margin: 0 });
  });
  footer(s);
})();

// ════════════════════════ 10 · UX ════════════════════════
(() => {
  const s = content('Experiência — 10%', 'Uma experiência editorial');
  const ux = [
    ['Tema com 3 modos', 'Sistema, claro e escuro — o modo Sistema segue o SO em tempo real.'],
    ['Dados reais', 'Widgets de Tempo e Mercados com dados em direto, sem simulações.'],
    ['Responsivo', 'Do telemóvel ao desktop, sem quebras de layout.'],
    ['Robusto', 'Estados de carregamento e erro tratados, com repetição.'],
  ];
  const cw = 5.85, gap = 0.3, ch = 1.95, x0 = 0.7, y0 = 2.2;
  ux.forEach((u, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = x0 + col * (cw + gap), y = y0 + row * (ch + gap);
    card(s, x, y, cw, ch, WHITE, true);
    s.addShape(pres.shapes.RECTANGLE, { x, y: y + 0.3, w: 0.1, h: 1.35, fill: { color: RED } });
    s.addText(u[0], { x: x + 0.35, y: y + 0.3, w: cw - 0.6, h: 0.5, fontFace: HEAD, fontSize: 18, bold: true, color: NAVY, margin: 0 });
    s.addText(u[1], { x: x + 0.35, y: y + 0.9, w: cw - 0.7, h: 0.9, fontFace: BODY, fontSize: 13.5, color: SLATE, lineSpacingMultiple: 1.2, valign: 'top', margin: 0 });
  });
  footer(s);
})();

// ════════════════════════ 11 · MAPA DE AVALIAÇÃO ════════════════════════
(() => {
  const s = content('Avaliação', 'Onde somamos pontos');
  s.addChart(pres.charts.BAR, [{
    name: 'Peso (%)',
    labels: ['Arquitetura', 'Funcional.', 'Streaming', 'Compressão', 'UX', 'Defesa', 'Docs'],
    values: [25, 25, 15, 10, 10, 10, 5],
  }], {
    x: 0.6, y: 2.05, w: 8.2, h: 4.55, barDir: 'col',
    chartColors: [NAVY],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: NAVY, dataLabelFontFace: BODY, dataLabelFontSize: 12, dataLabelFontBold: true,
    catAxisLabelColor: SLATE, catAxisLabelFontFace: BODY, catAxisLabelFontSize: 11,
    valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: false, showTitle: false, barGapWidthPct: 45,
  });
  // destaque auto-fail
  card(s, 9.15, 2.2, 3.5, 4.2, NAVY, true);
  s.addText('Eliminação — cobertos', { x: 9.4, y: 2.5, w: 3.0, h: 0.5, fontFace: HEAD, fontSize: 16, bold: true, color: WHITE, margin: 0 });
  [['Compressão', 'motor próprio + selftest'], ['Streaming', 'VOD Range + HLS ao vivo'], ['Multiplataforma', 'Web · Desktop · Mobile']].forEach((r, i) => {
    const y = 3.15 + i * 1.02;
    s.addText('✓', { x: 9.4, y, w: 0.4, h: 0.4, fontFace: BODY, fontSize: 18, bold: true, color: RED, margin: 0 });
    s.addText(r[0], { x: 9.8, y: y - 0.02, w: 2.7, h: 0.4, fontFace: BODY, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    s.addText(r[1], { x: 9.8, y: y + 0.35, w: 2.7, h: 0.4, fontFace: BODY, fontSize: 11, color: SKY, margin: 0 });
  });
  footer(s);
})();

// ════════════════════════ 12 · DEMONSTRAÇÃO ════════════════════════
(() => {
  const s = content('Demonstração', 'O percurso da demo');
  const steps = [
    ['1', 'Arquitetura', 'GET /health liga à base de dados; os 3 clientes na mesma API.'],
    ['2', 'Auth & papéis', 'Login; um leitor a tentar ação de editor recebe 403.'],
    ['3', 'Compressão', 'Upload → relatório antes/depois; Modo Programador ao vivo.'],
    ['4', 'Streaming', 'Seek num vídeo (Range) e “Iniciar transmissão” → AO VIVO (HLS).'],
    ['5', 'Multiplataforma', 'A mesma conta na Web, Desktop e Mobile; offline no Mobile.'],
    ['6', 'Segurança & logs', 'Repetir login → 429 (rate-limit); ecrã de logs no admin.'],
  ];
  const x0 = 0.7, y0 = 2.05, rh = 0.78, gap = 0.04, w = 11.93;
  steps.forEach((st, i) => {
    const y = y0 + i * (rh + gap);
    card(s, x0, y, w, rh, i % 2 === 0 ? WHITE : ICE, false);
    circle(s, x0 + 0.18, y + 0.14, 0.5, RED, st[0], WHITE, 17);
    s.addText(st[1], { x: x0 + 0.95, y, w: 3.0, h: rh, fontFace: HEAD, fontSize: 16, bold: true, color: NAVY, valign: 'middle', margin: 0 });
    s.addText(st[2], { x: x0 + 4.0, y, w: w - 4.3, h: rh, fontFace: BODY, fontSize: 13, color: SLATE, valign: 'middle', margin: 0 });
  });
  footer(s);
})();

// ════════════════════════ 13 · OBRIGADO ════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addShape(pres.shapes.RECTANGLE, { x: 0.95, y: 1.5, w: 0.55, h: 0.55, fill: { color: RED } });
  s.addText('Obrigado', { x: 0.9, y: 2.25, w: 11.5, h: 1.3, fontFace: HEAD, fontSize: 56, bold: true, color: WHITE, margin: 0 });
  s.addText('ISPTEC News — Plataforma de Notícias Multimédia', { x: 0.95, y: 3.55, w: 11.5, h: 0.6, fontFace: HEAD, fontSize: 22, italic: true, color: SKY, margin: 0 });
  s.addShape(pres.shapes.LINE, { x: 0.97, y: 4.6, w: 4.2, h: 0, line: { color: '2A3F63', width: 1 } });
  s.addText('Grupo 26', { x: 0.95, y: 4.8, w: 11, h: 0.4, fontFace: BODY, fontSize: 15, bold: true, color: WHITE, margin: 0 });
  s.addText([
    { text: 'Dálcio Garcia', options: { color: WHITE } },
    { text: '  ·  20170796', options: { color: SLATE } },
  ], { x: 0.95, y: 5.2, w: 11, h: 0.4, fontFace: BODY, fontSize: 14, margin: 0 });
  s.addText([
    { text: 'Osvaldo Marcolino', options: { color: WHITE } },
    { text: '  ·  20210423', options: { color: SLATE } },
  ], { x: 0.95, y: 5.6, w: 11, h: 0.4, fontFace: BODY, fontSize: 14, margin: 0 });
  s.addText('Docente: Bongo Cahisso', { x: 0.95, y: 6.15, w: 11, h: 0.4, fontFace: BODY, fontSize: 13, color: SKY, margin: 0 });
})();

const out = 'C:/Users/dalci/Videos/isptec-news/apresentacao/ISPTEC-News-Apresentacao.pptx';
pres.writeFile({ fileName: out }).then((f) => console.log('OK:', f));
