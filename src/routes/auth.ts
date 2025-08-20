import { Router } from 'express';
import { browserLogin, phoneLogin, refreshToken } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

router.post(
  '/auth/browser',
  authLimiter,
  validate(z.object({ id_token: z.string().min(10) })),
  browserLogin,
);

router.post(
  '/auth/phone',
  authLimiter,
  validate(z.object({ id_token: z.string().min(10) })),
  phoneLogin,
);

router.post('/auth/refresh', authLimiter, refreshToken);

export default router;
