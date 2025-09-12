import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3010,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3010',
  jwtSecret: process.env.JWT_SECRET!,
  jwtTtl: process.env.JWT_TTL || '24h', // Extended to 24 hours
};
