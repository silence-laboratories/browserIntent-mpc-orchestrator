import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { startPairing, claimSession, getSession } from '../controllers/pairingController';
import { requireBrowserJWT, requirePhoneJWT } from '../middleware/authJWT';
import { authLimiter } from '../middleware/rateLimit';

const r = Router();

// Browser → get sessionId + nonce
r.post('/start_pairing', requireBrowserJWT, authLimiter, startPairing);

// Get session details (browser)
r.get('/session/:sessionId', requireBrowserJWT, authLimiter, getSession);

// Get session details (phone - for status checking)
r.get('/session/:sessionId/status', requirePhoneJWT, authLimiter, getSession);

// Phone → claim with nonce (NOW REQUIRES AUTHENTICATION!)
r.post(
  '/claim_session',
  requirePhoneJWT,  // ✅ Phone must be authenticated
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
