import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from './logger';

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later'
    });
  }
});