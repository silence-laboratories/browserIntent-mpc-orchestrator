import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const requireBrowserJWT = (req: Request, res: Response, next: NextFunction) => {
  const token =
    req.cookies.browserJWT ||
    req.headers.authorization?.split(' ')[1] ||
    req.body.browserJWT;

  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { user_id: string; aud: string };
    if (decoded.aud !== 'browser-wallet') throw new Error('aud_mismatch');
    (req as any).user_id = decoded.user_id;
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
};
