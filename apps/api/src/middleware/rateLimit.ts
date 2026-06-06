import rateLimit from 'express-rate-limit';

const FIFTEEN_MIN = 15 * 60 * 1000;

/**
 * Limitador geral da API (anti-abuso). Generoso para não estragar a demo, e ignora
 * rotas de streaming/entrega de media (Range gera muitos pedidos por reprodução) e o
 * health check.
 *
 * Nota produção: atrás de proxy/CDN, definir `app.set('trust proxy', 1)` para que o
 * IP do cliente (e não o do proxy) seja usado na contagem.
 */
export const apiLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados pedidos — tenta novamente daqui a pouco.' },
  skip: (req) =>
    req.path === '/health' ||
    req.path.startsWith('/media/') ||
    req.path.startsWith('/stream/'),
});

/**
 * Limitador estrito para autenticação (login/registo): trava ataques de força bruta
 * a palavras-passe. Conta tentativas falhadas e bem-sucedidas por IP.
 */
export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiadas tentativas de autenticação — tenta novamente mais tarde.' },
});
