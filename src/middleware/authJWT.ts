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

export const requirePhoneJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  const logger = require('./logger').logger;

  logger.info({
    message: 'Phone JWT middleware called',
    url: req.url,
    method: req.method,
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    authorizationHeader: req.headers.authorization ? 'present' : 'missing'
  });

  if (!token) {
    logger.warn('Phone JWT middleware: missing token');
    return res.status(401).json({ error: 'missing_token' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { user_id: string; aud: string };
    
    logger.info({
      message: 'Phone JWT decoded successfully',
      userId: decoded.user_id,
      audience: decoded.aud,
      expectedAudience: 'phone-wallet'
    });

    if (decoded.aud !== 'phone-wallet') {
      logger.warn({
        message: 'Phone JWT audience mismatch',
        receivedAudience: decoded.aud,
        expectedAudience: 'phone-wallet'
      });
      throw new Error('aud_mismatch');
    }
    
    (req as any).user_id = decoded.user_id;
    logger.info('Phone JWT middleware: authentication successful');
    return next();
  } catch (error) {
    logger.error({
      message: 'Phone JWT middleware: token verification failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      token: token ? `${token.substring(0, 20)}...` : 'null'
    });
    return res.status(401).json({ error: 'invalid_token' });
  }
};
