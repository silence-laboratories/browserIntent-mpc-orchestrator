import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import authRoutes from './routes/auth';
import { logger } from './middleware/logger';
import path from 'path';
import pairingRoutes from './routes/pairing';

const app = express();

// Configure CORS properly for credentials
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow localhost for development
      if (origin === 'http://localhost:8081' || 
          origin === 'http://127.0.0.1:8081' ||
          origin === 'http://localhost:3000' ||
          origin === 'http://127.0.0.1:3000') {
        return callback(null, true);
      }
      
      // Allow specific origins from config
      if (config.corsOrigin !== '*' && origin === config.corsOrigin) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

// Configure Helmet with CSP to allow Firebase scripts and inline scripts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://www.gstatic.com",
          "https://www.googleapis.com",
          "https://apis.google.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://www.googleapis.com", "https://identitytoolkit.googleapis.com"],
        frameSrc: ["'self'", "https://www.google.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    }
  })
);

app.use(compression());
app.use(express.json());
app.use(cookieParser());

app.use('/api', authRoutes);
app.use('/api', pairingRoutes);

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error(err);
  res.status(500).json({ error: 'internal_error' });
});

// Serve static files from the project root directory
app.use(express.static(path.join(__dirname, '..')));

app.listen(config.port, () => {
  logger.info(`Orchestrator running on port ${config.port}`);
});
