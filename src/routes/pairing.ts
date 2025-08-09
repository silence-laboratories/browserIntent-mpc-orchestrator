import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { startPairing, claimSession, getSession } from '../controllers/pairingController';
import { requireBrowserJWT } from '../middleware/authJwt';
import { authLimiter } from '../middleware/rateLimit';

const r = Router();

// Browser → get sessionId + nonce
r.post('/start_pairing', requireBrowserJWT, authLimiter, startPairing);

// Get session details
r.get('/session/:sessionId', requireBrowserJWT, authLimiter, getSession);

// Phone → claim with nonce
r.post(
  '/claim_session',
  authLimiter,
  validate(
    z.object({
      sessionId: z.string().uuid(),
      nonce: z.string().min(20),
      deviceId: z.string().min(4),
    }),
  ),
  claimSession,
);

export default r;
