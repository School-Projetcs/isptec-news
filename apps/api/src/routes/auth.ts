import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema, registerSchema, updateProfileSchema, changePasswordSchema } from '@isptec/shared';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { ah } from '../lib/asyncHandler';
import { validateBody } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { writeLog } from '../lib/logService';

export const authRouter = Router();

type DbUser = { id: string; name: string; email: string; role: string; createdAt: Date };
const publicUser = (u: DbUser) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  createdAt: u.createdAt,
});

authRouter.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  ah(async (req, res) => {
    const { name, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ ok: false, error: 'Email já registado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'READER' },
    });
    await writeLog({ action: 'auth.register', userId: user.id, ip: req.ip, method: req.method, path: req.originalUrl });

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ ok: true, data: { token, user: publicUser(user) } });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  ah(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      await writeLog({ action: 'auth.login.fail', level: 'warn', ip: req.ip, message: email });
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    }
    await writeLog({ action: 'auth.login', userId: user.id, ip: req.ip });

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ ok: true, data: { token, user: publicUser(user) } });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ ok: false, error: 'Utilizador não encontrado' });
    res.json({ ok: true, data: publicUser(user) });
  }),
);

// Atualizar o próprio perfil (nome/email)
authRouter.patch(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  ah(async (req, res) => {
    const { name, email } = req.body;
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id: req.user!.id } },
    });
    if (taken) return res.status(409).json({ ok: false, error: 'Email já está em uso' });

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, email },
    });
    await writeLog({ action: 'auth.profile.update', userId: user.id, ip: req.ip });
    res.json({ ok: true, data: publicUser(user) });
  }),
);

// Alterar a própria palavra-passe (exige a atual)
authRouter.post(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  ah(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ ok: false, error: 'Utilizador não encontrado' });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ ok: false, error: 'Palavra-passe atual incorreta' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await writeLog({ action: 'auth.password.change', userId: user.id, ip: req.ip });
    res.json({ ok: true, data: { changed: true } });
  }),
);
