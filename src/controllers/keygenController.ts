import { Request, Response } from 'express';
import { firestore } from '../firebase/admin';
import { newSessionId } from '../utils/id';
import { minutes, now } from '../utils/time';
import { logger } from '../middleware/logger';

const SESSIONS = firestore.collection('sessions');
const KEYGEN_SESSIONS = firestore.collection('keygen_sessions');
const NOTIFICATIONS = firestore.collection('notifications');

// Legacy endpoint - kept for backward compatibility
export const startKeygen = async (req: Request, res: Response) => {
  const user_id = (req as any).user_id as string;
  const sessionId = newSessionId();

  logger.info({
    message: 'startKeygen endpoint called',
    userId: user_id,
    sessionId: sessionId,
    url: req.url,
    method: req.method,
    userAgent: req.headers['user-agent']
  });

  try {
    // Create a new keygen session
    await KEYGEN_SESSIONS.doc(sessionId).set({
      userId: user_id,
      status: 'PENDING',
      deviceId: null,
      createdAt: new Date(now()),
      expiresAt: new Date(now() + minutes(10)), // 10 minutes for keygen
      keygenData: null,
      completedAt: null,
    });

    // Create notification for phone
    await NOTIFICATIONS.add({
      userId: user_id,
      type: 'keygen_requested',
      sessionId: sessionId,
      message: 'Browser requested key generation',
      createdAt: new Date(now()),
      read: false,
      expiresAt: new Date(now() + minutes(10)),
    });

    logger.info({ sessionId, userId: user_id }, 'Keygen session started with notification');
    
    return res.json({ 
      sessionId, 
      status: 'PENDING',
      message: 'Keygen session created successfully',
      qrData: {
        session_id: sessionId,
        action: "keygen",
        server_url: process.env.SERVER_URL || "http://localhost:8080",
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error(error, 'Failed to start keygen session');
    return res.status(500).json({ error: 'failed_to_start_keygen' });
  }
};

// New endpoint: Complete keygen after pairing
export const keygenDone = async (req: Request, res: Response) => {
  const { sessionId, keyId, publicKey, address } = req.body;
  const user_id = (req as any).user_id as string;

  logger.info({
    message: 'keygenDone endpoint called',
    sessionId,
    keyId,
    publicKey: publicKey ? `${publicKey.substring(0, 20)}...` : 'null',
    address: address ? `${address.substring(0, 20)}...` : 'null',
    userId: user_id,
    url: req.url,
    method: req.method
  });

  try {
    // Find keygen session by sessionId (pairing session ID)
    const keygenQuery = await KEYGEN_SESSIONS
      .where('sessionId', '==', sessionId)
      .where('userId', '==', user_id)
      .where('status', '==', 'PENDING')
      .limit(1)
      .get();

    if (keygenQuery.empty) {
      return res.status(404).json({ error: 'keygen_session_not_found' });
    }

    const keygenDoc = keygenQuery.docs[0];
    const keygenData = keygenDoc.data();

    // Update keygen session with completion data
    await keygenDoc.ref.update({
      status: 'COMPLETED',
      keyId: keyId,
      publicKey: publicKey,
      address: address,
      completedAt: new Date(now()),
    });

    // Update pairing session status
    await SESSIONS.doc(sessionId).update({
      status: 'COMPLETE',
      keyId: keyId,
      publicKey: publicKey,
      address: address,
      completedAt: new Date(now()),
    });

    // Create wallet document in wallets collection
    await firestore.collection('wallets').doc(keyId).set({
      id: keyId,
      keyId: keyId,
      publicKey: publicKey,
      address: address,
      deviceId: keygenData.deviceId, // This is crucial for FCM notifications
      userId: user_id,
      name: `Wallet ${keyId.substring(0, 8)}`,
      description: 'Generated wallet',
      tags: ['generated'],
      createdAt: new Date(now()),
      updatedAt: new Date(now()),
    });

    logger.info({ sessionId, keyId, deviceId: keygenData.deviceId, userId: user_id }, 'Keygen completed and wallet created');
    
    return res.json({ 
      ok: true, 
      message: 'Key generation completed successfully',
      wallet: {
        id: keyId,
        keyId: keyId,
        publicKey: publicKey,
        address: address,
        deviceId: keygenData.deviceId
      }
    });
  } catch (error) {
    logger.error(error, 'Failed to complete keygen');
    return res.status(500).json({ error: 'failed_to_complete_keygen' });
  }
};

export const getKeygenSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const user_id = (req as any).user_id as string;

  try {
    // First try to find by keygen session ID
    let docRef = KEYGEN_SESSIONS.doc(sessionId);
    let docSnap = await docRef.get();

    // If not found, try to find by pairing session ID
    if (!docSnap.exists) {
      const keygenQuery = await KEYGEN_SESSIONS
        .where('sessionId', '==', sessionId)
        .where('userId', '==', user_id)
        .limit(1)
        .get();

      if (!keygenQuery.empty) {
        docSnap = keygenQuery.docs[0];
      }
    }

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'keygen_session_not_found' });
    }

    const data = docSnap.data()!;
    if (data.userId !== user_id) {
      return res.status(403).json({ error: 'owner_mismatch' });
    }

    return res.json({
      sessionId: docSnap.id,
      status: data.status,
      deviceId: data.deviceId,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      completedAt: data.completedAt,
      keyId: data.keyId,
      publicKey: data.publicKey,
    });
  } catch (error) {
    logger.error(error, 'Failed to get keygen session');
    return res.status(500).json({ error: 'failed_to_get_keygen_session' });
  }
};

// Legacy endpoint - kept for backward compatibility
export const completeKeygen = async (req: Request, res: Response) => {
  const { sessionId, keygenData } = req.body;
  const user_id = (req as any).user_id as string;

  logger.info({
    message: 'completeKeygen endpoint called',
    sessionId,
    keygenData: keygenData ? 'present' : 'null',
    userId: user_id,
    url: req.url,
    method: req.method
  });

  try {
    const docRef = KEYGEN_SESSIONS.doc(sessionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'keygen_session_not_found' });
    }

    const data = docSnap.data()!;
    if (data.userId !== user_id) {
      return res.status(403).json({ error: 'owner_mismatch' });
    }

    if (data.status !== 'PENDING') {
      return res.status(409).json({ error: 'keygen_already_completed_or_expired' });
    }

    // Update session with keygen data
    await docRef.update({
      status: 'COMPLETED',
      keygenData: keygenData,
      completedAt: new Date(now()),
    });

    // Mark notification as read
    const notificationsQuery = await NOTIFICATIONS
      .where('userId', '==', user_id)
      .where('sessionId', '==', sessionId)
      .where('type', '==', 'keygen_requested')
      .get();

    notificationsQuery.forEach(doc => {
      doc.ref.update({ read: true });
    });

    logger.info({ sessionId, userId: user_id }, 'Keygen completed');
    return res.json({ ok: true, message: 'Keygen completed successfully' });
  } catch (error) {
    logger.error(error, 'Failed to complete keygen');
    return res.status(500).json({ error: 'failed_to_complete_keygen' });
  }
};

// New endpoint: Get notifications for phone
export const getNotifications = async (req: Request, res: Response) => {
  const user_id = (req as any).user_id as string;

  try {
    const notificationsQuery = await NOTIFICATIONS
      .where('userId', '==', user_id)
      .where('read', '==', false)
      .where('expiresAt', '>', new Date())
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const notifications = notificationsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.json({ notifications });
  } catch (error) {
    logger.error(error, 'Failed to get notifications');
    return res.status(500).json({ error: 'failed_to_get_notifications' });
  }
};

// New endpoint: Mark notification as read
export const markNotificationRead = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const user_id = (req as any).user_id as string;

  try {
    const docRef = NOTIFICATIONS.doc(notificationId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'notification_not_found' });
    }

    const data = docSnap.data()!;
    if (data.userId !== user_id) {
      return res.status(403).json({ error: 'owner_mismatch' });
    }

    await docRef.update({ read: true });

    return res.json({ ok: true });
  } catch (error) {
    logger.error(error, 'Failed to mark notification as read');
    return res.status(500).json({ error: 'failed_to_mark_notification_read' });
  }
};
