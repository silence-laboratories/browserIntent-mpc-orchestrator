import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../firebase/admin';
import { logger } from './logger';

export const requireFirebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  const idToken = 
    req.headers.authorization?.split(' ')[1] ||
    req.body.id_token ||
    req.query.id_token;

  if (!idToken) {
    logger.warn('Firebase auth middleware: missing ID token');
    return res.status(401).json({ error: 'missing_id_token' });
  }

  try {
    // Verify Firebase ID token directly
    const decoded = await firebaseAuth.verifyIdToken(idToken, true);
    
    logger.info({
      message: 'Firebase ID token verified successfully',
      userId: decoded.uid,
      email: decoded.email
    });

    // Set user_id from Firebase UID
    (req as any).user_id = decoded.uid;
    (req as any).user_email = decoded.email;
    
    return next();
  } catch (error) {
    logger.error({
      message: 'Firebase ID token verification failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      token: idToken ? `${idToken.substring(0, 20)}...` : 'null'
    });
    
    return res.status(401).json({ 
      error: 'invalid_id_token',
      message: 'Invalid or expired Firebase ID token'
    });
  }
};
