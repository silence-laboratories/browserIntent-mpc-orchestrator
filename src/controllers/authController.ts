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
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    });

    return res.json({ ok: true });
  } catch (err: any) {
    logger.warn(err, 'Invalid id_token');
    
    // Provide more specific error messages
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'token_expired', 
        message: 'Google ID token has expired. Please sign in again.' 
      });
    } else if (err.code === 'auth/invalid-id-token') {
      return res.status(401).json({ 
        error: 'invalid_token', 
        message: 'Invalid Google ID token. Please sign in again.' 
      });
    } else if (err.code === 'auth/internal-error') {
      return res.status(401).json({ 
        error: 'auth_error', 
        message: 'Authentication error. Please try signing in again.' 
      });
    }
    
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const phoneLogin = async (req: Request, res: Response) => {
  const { id_token } = req.body;

  try {
    const decoded = await firebaseAuth.verifyIdToken(id_token, true);
    const user_id = decoded.uid;

    // Create JWT for phone with different audience
    const phoneJWT = jwt.sign(
      { user_id, aud: 'phone-wallet' }, 
      config.jwtSecret,
      { 
        algorithm: 'HS256',
        expiresIn: config.jwtTtl 
      } as jwt.SignOptions
    );

    // Return JWT token for phone (not cookie since phones handle tokens differently)
    return res.json({ 
      ok: true, 
      token: phoneJWT,
      user_id: user_id,
      expiresIn: config.jwtTtl
    });
  } catch (err: any) {
    logger.warn(err, 'Invalid id_token for phone');
    
    // Provide more specific error messages
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'token_expired', 
        message: 'Google ID token has expired. Please sign in again.' 
      });
    } else if (err.code === 'auth/invalid-id-token') {
      return res.status(401).json({ 
        error: 'invalid_token', 
        message: 'Invalid Google ID token. Please sign in again.' 
      });
    } else if (err.code === 'auth/internal-error') {
      return res.status(401).json({ 
        error: 'auth_error', 
        message: 'Authentication error. Please try signing in again.' 
      });
    }
    
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// New endpoint to refresh backend JWT tokens
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Get current user from existing JWT
    const currentToken = req.cookies.browserJWT || req.headers.authorization?.split(' ')[1];
    
    if (!currentToken) {
      return res.status(401).json({ error: 'no_token_provided' });
    }

    // Verify current token
    const decoded = jwt.verify(currentToken, config.jwtSecret) as { user_id: string; aud: string };
    
    // Create new token with extended expiry
    const newToken = jwt.sign(
      { user_id: decoded.user_id, aud: decoded.aud }, 
      config.jwtSecret,
      { 
        algorithm: 'HS256',
        expiresIn: config.jwtTtl 
      } as jwt.SignOptions
    );

    // Set new cookie
    if (decoded.aud === 'browser-wallet') {
      res.cookie('browserJWT', newToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    return res.json({ 
      ok: true, 
      token: decoded.aud === 'phone-wallet' ? newToken : undefined,
      expiresIn: config.jwtTtl
    });
  } catch (err: any) {
    logger.warn(err, 'Token refresh failed');
    return res.status(401).json({ error: 'invalid_token' });
  }
};
