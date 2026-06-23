import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { uploadPath, newId } from '../src/media-engine/storage';
import { processMedia } from '../src/media-engine/process';
import { prisma as enginePrisma } from '../src/lib/prisma';

const prisma = new PrismaClient();
const FF = ffmpegPath as string;
const escapeXml = (s: string) =>
  s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] ?? c);

async function main() {
  // ---- Utilizadores de demonstração (um por role) ----
  const users = [
    { name: 'Administrador', email: 'admin@isptec.local', password: 'admin123', role: Role.ADMIN },
    { name: 'Editor Demo', email: 'editor@isptec.local', password: 'editor123', role: Role.EDITOR },
    { name: 'Leitor Demo', email: 'leitor@isptec.local', password: 'reader123', role: Role.READER },
  ];

  let adminId = '';
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
    if (u.role === Role.ADMIN) adminId = created.id;
  }

  // ---- Categorias ----
  const categorias = [
    { name: 'Geral', slug: 'geral' },
    { name: 'Tecnologia', slug: 'tecnologia' },
    { name: 'Campus', slug: 'campus' },
    { name: 'Cultura', slug: 'cultura' },
    { name: 'Desporto', slug: 'desporto' },
    // Economia e setores produtivos
    { name: 'Economia', slug: 'economia' },
    { name: 'Finanças', slug: 'financas' },
    { name: 'Petróleo e Gás', slug: 'petroleo-gas' },
    { name: 'Energia', slug: 'energia' },
    { name: 'Mineração', slug: 'mineracao' },
    { name: 'Agricultura', slug: 'agricultura' },
    { name: 'Indústria', slug: 'industria' },
    { name: 'Construção', slug: 'construcao' },
    { name: 'Imobiliário', slug: 'imobiliario' },
    { name: 'Negócios', slug: 'negocios' },
    { name: 'Mercados', slug: 'mercados' },
    { name: 'Empreendedorismo', slug: 'empreendedorismo' },
    { name: 'Emprego', slug: 'emprego' },
    { name: 'Telecomunicações', slug: 'telecomunicacoes' },
    { name: 'Transportes', slug: 'transportes' },
    { name: 'Turismo', slug: 'turismo' },
    // Sociedade e conhecimento
    { name: 'Política', slug: 'politica' },
    { name: 'Internacional', slug: 'internacional' },
    { name: 'Ciência', slug: 'ciencia' },
    { name: 'Saúde', slug: 'saude' },
    { name: 'Educação', slug: 'educacao' },
    { name: 'Ambiente', slug: 'ambiente' },
    { name: 'Inovação', slug: 'inovacao' },
    { name: 'Opinião', slug: 'opiniao' },
    { name: 'Entretenimento', slug: 'entretenimento' },
  ];
  for (const c of categorias) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const catBySlug = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id]),
  );

  // ---- Notícias ----
  // Ordem do array = ordem cronológica no feed (1.ª entrada = mais recente). O seed é
  // declarativo: o bloco `update` garante que correr `db:seed` converge sempre para este
  // estado de demonstração (conteúdo, vistas e capa), mesmo sobre uma BD já populada.
  const noticias = [
    {
      slug: 'isptec-vence-hackathon-nacional',
      title: 'Equipa do ISPTEC vence hackathon nacional',
      summary: 'Estudantes de Engenharia conquistam o primeiro lugar com uma solução de mobilidade urbana.',
      body: 'Durante 48 horas, a equipa desenvolveu um protótipo que otimiza rotas de transporte público em Luanda.\nO júri destacou a qualidade técnica e o impacto social do projeto. O prémio inclui um estágio e financiamento para continuar o desenvolvimento.',
      category: 'tecnologia',
      status: 'PUBLISHED' as const,
      viewCount: 415,
    },
    {
      slug: 'isptec-inaugura-laboratorio-de-multimedia',
      title: 'ISPTEC inaugura laboratório de multimédia',
      summary: 'Novo espaço equipado para produção de conteúdos áudio e vídeo.',
      body: 'O laboratório permite aos estudantes produzir reportagens com qualidade profissional.\nEsta notícia inclui uma imagem de capa e um vídeo de demonstração, ambos comprimidos automaticamente pela plataforma (H.264/H.265/VP9) e servidos por streaming HTTP Range.',
      category: 'tecnologia',
      status: 'PUBLISHED' as const,
      viewCount: 342,
    },
    {
      slug: 'radio-do-campus-estreia-podcast',
      title: 'Rádio do campus estreia podcast semanal',
      summary: 'Episódios em áudio com compressão MP3/AAC/OGG e reprodução por streaming.',
      body: 'A rádio do campus lança o seu podcast semanal, com entrevistas, música e debate académico.\nEste artigo inclui um excerto de áudio servido por streaming (HTTP Range), comprimido em várias variantes para poupar dados móveis.',
      category: 'campus',
      status: 'PUBLISHED' as const,
      viewCount: 210,
    },
    {
      slug: 'galeria-novo-edificio',
      title: 'Galeria: o novo edifício do campus',
      summary: 'Reportagem fotográfica com variantes WebP/JPEG e Huffman próprio.',
      body: 'Uma visita guiada em imagens ao novo edifício do campus: a fachada principal, o átrio central e as novas salas de aula.\nCada fotografia é comprimida em várias variantes — o relatório de compressão mostra a poupança obtida face ao original.',
      category: 'cultura',
      status: 'PUBLISHED' as const,
      viewCount: 178,
    },
    {
      slug: 'bem-vindo-ao-isptec-news',
      title: 'Bem-vindo ao ISPTEC News',
      summary: 'A plataforma de notícias do campus — texto, imagem, áudio e vídeo num só lugar.',
      body: 'O ISPTEC News nasce para dar voz à comunidade académica. Tudo o que publicas é comprimido automaticamente pela plataforma e transmitido por streaming, do telemóvel ao computador.\nNesta primeira edição apresentamos as secções, os autores e o que aí vem nas próximas semanas.',
      category: 'geral',
      status: 'PUBLISHED' as const,
      viewCount: 128,
    },
    {
      slug: 'nova-biblioteca-digital',
      title: 'Biblioteca digital disponível para todos os estudantes',
      summary: 'Mais de dez mil títulos acessíveis a partir do telemóvel ou computador.',
      body: 'A nova biblioteca digital do ISPTEC reúne livros técnicos, revistas científicas e teses dos antigos estudantes.\nO acesso faz-se com as credenciais de estudante e está disponível também na aplicação móvel, com leitura offline.',
      category: 'geral',
      status: 'PUBLISHED' as const,
      viewCount: 96,
    },
    {
      slug: 'torneio-interno-de-futsal',
      title: 'Torneio interno de futsal arranca este fim de semana',
      summary: 'Doze equipas, seis cursos e uma taça em disputa no pavilhão do campus.',
      body: 'O tradicional torneio de futsal regressa com doze equipas inscritas, representando os vários cursos do instituto.\nOs jogos decorrem no pavilhão do campus e terão transmissão ao vivo na secção de streaming da plataforma.',
      category: 'desporto',
      status: 'PUBLISHED' as const,
      viewCount: 87,
    },
    {
      slug: 'rascunho-semana-academica',
      title: 'Rascunho: cobertura da semana académica',
      summary: 'Notícia ainda por publicar (demonstra o fluxo de rascunho/publicação).',
      body: 'Conteúdo em preparação para a cobertura da semana académica.',
      category: 'campus',
      status: 'DRAFT' as const,
      viewCount: 0,
    },
  ];

  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (let i = 0; i < noticias.length; i++) {
    const n = noticias[i];
    const publishedAt = n.status === 'PUBLISHED' ? new Date(now - i * DAY) : null;
    const fields = {
      title: n.title,
      summary: n.summary,
      body: n.body,
      status: n.status,
      viewCount: n.viewCount,
      publishedAt,
      categoryId: catBySlug[n.category],
    };
    await prisma.news.upsert({
      where: { slug: n.slug },
      update: fields,
      create: { slug: n.slug, authorId: adminId, ...fields },
    });
  }

  // ---- Media de demonstração (gerada + comprimida pelo pipeline real) ----
  await seedDemoMedia(adminId);

  console.log('✅ Seed concluído: utilizadores, categorias, notícias e media de demonstração.');
  console.log('   Login admin → admin@isptec.local / admin123');
}

/**
 * Gera imagem/áudio/vídeo, processa-os pelo pipeline real e liga-os às notícias.
 * Idempotente e incremental: cada media é identificada por `originalName`; se já
 * existir, é reutilizada (não regenera), senão é criada — pelo que correr o seed
 * várias vezes não duplica nem deixa notícias sem capa.
 */
async function seedDemoMedia(adminId: string) {
  if (!FF) {
    console.log('   ⚠️ ffmpeg-static indisponível — a saltar áudio/vídeo de demonstração.');
  }

  const tmp = mkdtempSync(join(tmpdir(), 'isptec-seed-'));
  try {
    // --- Capas (uma imagem distinta por notícia; coverMediaId é @unique) ---
    const capaBemVindo = await ensureMedia(
      'IMAGE', 'image/png', 'png', 'demo-capa-bem-vindo.png', adminId,
      () => makeImageBuffer('Bem-vindo ao ISPTEC News', 'A plataforma de notícias do campus', 210),
    );
    const capaLab = await ensureMedia(
      'IMAGE', 'image/png', 'png', 'demo-capa-laboratorio.png', adminId,
      () => makeImageBuffer('Laboratório de Multimédia', 'Produção áudio e vídeo no campus', 265),
    );
    const capaHackathon = await ensureMedia(
      'IMAGE', 'image/png', 'png', 'demo-capa-hackathon.png', adminId,
      () => makeImageBuffer('Hackathon Nacional', 'Primeiro lugar para o ISPTEC', 25),
    );
    const capaBiblioteca = await ensureMedia(
      'IMAGE', 'image/png', 'png', 'demo-capa-biblioteca.png', adminId,
      () => makeImageBuffer('Biblioteca Digital', 'Mais de 10 000 títulos ao teu alcance', 150),
    );
    const capaFutsal = await ensureMedia(
      'IMAGE', 'image/png', 'png', 'demo-capa-futsal.png', adminId,
      () => makeImageBuffer('Torneio de Futsal', 'Doze equipas, uma taça', 110),
    );

    // --- Galeria (várias imagens ligadas à mesma notícia, como news.media) ---
    const galeriaImgs = [
      await ensureMedia('IMAGE', 'image/png', 'png', 'demo-galeria-fachada.png', adminId,
        () => makeImageBuffer('Fachada principal', 'O novo edifício do campus', 205)),
      await ensureMedia('IMAGE', 'image/png', 'png', 'demo-galeria-atrio.png', adminId,
        () => makeImageBuffer('Átrio central', 'Espaço de convívio e estudo', 230)),
      await ensureMedia('IMAGE', 'image/png', 'png', 'demo-galeria-salas.png', adminId,
        () => makeImageBuffer('Novas salas de aula', 'Equipadas para o ensino prático', 190)),
    ];

    // --- Áudio (podcast) e Vídeo (reportagem), só se houver ffmpeg ---
    let audioId: string | null = null;
    let videoId: string | null = null;
    if (FF) {
      audioId = await ensureMedia('AUDIO', 'audio/wav', 'wav', 'demo-podcast.wav', adminId, () => {
        const wav = join(tmp, 'a.wav');
        execFileSync(FF, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-ar', '44100', wav], { stdio: 'ignore' });
        return readFileSync(wav);
      });
      videoId = await ensureMedia('VIDEO', 'video/mp4', 'mp4', 'demo-reportagem.mp4', adminId, () => {
        const mp4 = join(tmp, 'v.mp4');
        execFileSync(FF, ['-y', '-f', 'lavfi', '-i', 'testsrc=duration=6:size=1280x720:rate=24', '-crf', '20', '-pix_fmt', 'yuv420p', mp4], { stdio: 'ignore' });
        return readFileSync(mp4);
      });
    }

    // --- Ligações: capas, galeria, áudio e vídeo às notícias ---
    await setCover('bem-vindo-ao-isptec-news', capaBemVindo);
    await setCover('isptec-inaugura-laboratorio-de-multimedia', capaLab);
    await setCover('isptec-vence-hackathon-nacional', capaHackathon);
    await setCover('nova-biblioteca-digital', capaBiblioteca);
    await setCover('torneio-interno-de-futsal', capaFutsal);

    await attachMediaToNews('galeria-novo-edificio', galeriaImgs);
    if (videoId) await attachMediaToNews('isptec-inaugura-laboratorio-de-multimedia', [videoId]);
    if (audioId) await attachMediaToNews('radio-do-campus-estreia-podcast', [audioId]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Liga uma media como CAPA de uma notícia (idempotente). */
async function setCover(slug: string, mediaId: string) {
  const news = await prisma.news.findUnique({ where: { slug } });
  if (news) await prisma.news.update({ where: { id: news.id }, data: { coverMediaId: mediaId } });
}

/** Liga uma ou mais media a uma notícia como conteúdo (news.media), idempotente. */
async function attachMediaToNews(slug: string, mediaIds: string[]) {
  const news = await prisma.news.findUnique({ where: { slug } });
  if (!news) return;
  for (const id of mediaIds) {
    await prisma.media.update({ where: { id }, data: { newsId: news.id } });
  }
}

/**
 * Devolve o id de uma media identificada por `originalName`, reutilizando-a se já
 * existir; caso contrário gera o buffer (factory), grava-o e processa-o pelo pipeline.
 */
async function ensureMedia(
  type: 'IMAGE' | 'AUDIO' | 'VIDEO',
  mime: string,
  ext: string,
  originalName: string,
  ownerId: string,
  makeBuffer: () => Buffer | Promise<Buffer>,
): Promise<string> {
  const existing = await prisma.media.findFirst({ where: { originalName } });
  if (existing) return existing.id;

  const buffer = await makeBuffer();
  const id = newId();
  const originalPath = `${id}.${ext}`;
  writeFileSync(uploadPath(originalPath), buffer);
  await prisma.media.create({
    data: { id, type, originalName, originalPath, originalSize: buffer.length, mimeType: mime, status: 'PROCESSING', ownerId },
  });
  await processMedia({ id, type, originalName, originalPath, originalSize: buffer.length }, buffer);
  console.log(`   • media ${type} processada: ${originalName}`);
  return id;
}

async function makeImageBuffer(title: string, subtitle: string, hue: number): Promise<Buffer> {
  const svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},60%,32%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 40) % 360},60%,16%)"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="64" y="380" font-size="66" fill="#ffffff" font-family="sans-serif" font-weight="bold">${escapeXml(title)}</text>
    <text x="64" y="450" font-size="30" fill="#cdd6ea" font-family="sans-serif">${escapeXml(subtitle)}</text>
    <text x="64" y="660" font-size="22" fill="#9fb0d0" font-family="sans-serif">ISPTEC News · imagem de demonstração</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await enginePrisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erro no seed:', e);
    await prisma.$disconnect();
    await enginePrisma.$disconnect();
    process.exit(1);
  });
