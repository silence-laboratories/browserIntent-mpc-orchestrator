import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      return res.status(400).json({ error: 'Invalid payload', details: err });
    }
  };
