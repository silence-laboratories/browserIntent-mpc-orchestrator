import { Request, Response } from 'express';
import { firestore } from '../firebase/admin';
import { newSessionId, newNonce } from '../utils/id';
import { minutes, now } from '../utils/time';
import { logger } from '../middleware/logger';

const SESSIONS = firestore.collection('sessions');

export const startPairing = async (req: Request, res: Response) => {
  const user_id = (req as any).user_id as string;           // set by JWT middleware
  const sessionId = newSessionId();
  const nonce = newNonce();

  await SESSIONS.doc(sessionId).set({
    userId: user_id,
    nonce,
    status: 'PENDING',
    deviceId: null,
    createdAt: new Date(now()),
    expiresAt: new Date(now() + minutes(5)),
  });

  return res.json({ sessionId, nonce });
};

export const getSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const user_id = (req as any).user_id as string;

  const docRef = SESSIONS.doc(sessionId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return res.status(404).json({ error: 'session_not_found' });
  }

  const data = docSnap.data()!;
  if (data.userId !== user_id) {
    return res.status(403).json({ error: 'owner_mismatch' });
  }

  return res.json({
    sessionId,
    status: data.status,
    deviceId: data.deviceId,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
    boundAt: data.boundAt,
  });
};

export const claimSession = async (req: Request, res: Response) => {
  const { sessionId, nonce, deviceId } = req.body;
  const user_id = (req as any).user_id as string;

  const docRef = SESSIONS.doc(sessionId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return res.status(404).json({ error: 'session_not_found' });
  }

  const data = docSnap.data()!;
  if (data.userId !== user_id) {
    return res.status(403).json({ error: 'owner_mismatch' });
  }
  if (data.status !== 'PENDING') {
    return res.status(409).json({ error: 'already_claimed_or_expired' });
  }
  if (data.nonce !== nonce) {
    return res.status(400).json({ error: 'nonce_mismatch' });
  }

  // atomically update
  await docRef.update({
    status: 'BOUND',
    deviceId,
    boundAt: new Date(now()),
  });

  logger.info({ sessionId, deviceId }, 'session claimed');
  return res.json({ ok: true });
};
