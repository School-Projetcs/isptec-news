import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
  ];
  for (const c of categorias) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const geral = await prisma.category.findUnique({ where: { slug: 'geral' } });

  // ---- Notícia inicial ----
  await prisma.news.upsert({
    where: { slug: 'bem-vindo-ao-isptec-news' },
    update: {},
    create: {
      title: 'Bem-vindo ao ISPTEC News',
      slug: 'bem-vindo-ao-isptec-news',
      summary: 'Primeira notícia de demonstração da plataforma.',
      body: 'Esta é a notícia inicial criada pelo seed. A plataforma suporta texto, imagem, áudio e vídeo, com compressão e streaming.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: adminId,
      categoryId: geral?.id,
    },
  });

  console.log('✅ Seed concluído: utilizadores (admin/editor/leitor), categorias e notícia inicial.');
  console.log('   Login admin → admin@isptec.local / admin123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erro no seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
