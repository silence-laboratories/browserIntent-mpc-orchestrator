import * as dotenv from 'dotenv-safe';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 8080,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  jwtSecret: process.env.JWT_SECRET!,
  jwtTtl: '15m',
};
