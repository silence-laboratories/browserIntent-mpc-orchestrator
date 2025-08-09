import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { firebaseAuth } from '../firebase/admin';
import { config } from '../config';
import { logger } from '../middleware/logger';

export const browserLogin = async (req: Request, res: Response) => {
  const { id_token } = req.body;

  try {
    const decoded = await firebaseAuth.verifyIdToken(id_token, true);
    const user_id = decoded.uid;

   // Replace the problematic jwt.sign() call with:
   const browserJWT = jwt.sign(
    { user_id, aud: 'browser-wallet' }, 
    config.jwtSecret,
    { 
    algorithm: 'HS256',
    expiresIn: config.jwtTtl 
    } as jwt.SignOptions  // Explicit type casting
);

                
    // -- Safer delivery: HttpOnly cookie --
    res.cookie('browserJWT', browserJWT, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ ok: true });
  } catch (err) {
    logger.warn(err, 'Invalid id_token');
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
