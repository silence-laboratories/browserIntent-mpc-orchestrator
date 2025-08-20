import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { startKeygen, getKeygenSession, completeKeygen, keygenDone, getNotifications, markNotificationRead } from '../controllers/keygenController';
import { requireBrowserJWT, requirePhoneJWT } from '../middleware/authJWT';
import { authLimiter } from '../middleware/rateLimit';

const r = Router();

// Browser → start keygen session (legacy)
r.post('/start_keygen', requireBrowserJWT, authLimiter, startKeygen);

// Phone → start keygen session (for backward compatibility)
r.post('/start_keygen_phone', requirePhoneJWT, authLimiter, startKeygen);

// Get keygen session status
r.get('/keygen/:sessionId', requireBrowserJWT, authLimiter, getKeygenSession);

// Phone → complete keygen (legacy)
r.post(
  '/complete_keygen',
  requirePhoneJWT,
  authLimiter,
  validate(
    z.object({
      sessionId: z.string().uuid(),
      keygenData: z.any(), // Flexible for different keygen data structures
    }),
  ),
  completeKeygen,
);

// Phone → complete keygen after pairing (new streamlined flow)
r.post(
  '/keygen_done',
  requirePhoneJWT,
  authLimiter,
  validate(
    z.object({
      sessionId: z.string().uuid(),
      keyId: z.string(),
      publicKey: z.string(),
    }),
  ),
  keygenDone,
);

// Phone → get notifications (for keygen requests)
r.get('/notifications', requirePhoneJWT, authLimiter, getNotifications);

// Phone → mark notification as read
r.post('/notifications/:notificationId/read', requirePhoneJWT, authLimiter, markNotificationRead);

export default r;
