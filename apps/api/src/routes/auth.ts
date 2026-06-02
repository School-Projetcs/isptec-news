import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema, registerSchema } from '@isptec/shared';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { ah } from '../lib/asyncHandler';
import { validateBody } from '../middleware/validate';
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
