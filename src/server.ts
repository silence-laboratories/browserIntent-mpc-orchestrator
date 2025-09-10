import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { config } from './config';
import authRoutes from './routes/auth';
import { logger } from './middleware/logger';
import path from 'path';
import pairingRoutes from './routes/pairing';
import keygenRoutes from './routes/keygen';
import transactionRoutes from './routes/transaction';
import notificationRoutes from './routes/notification';

const app = express();

// Configure CORS properly for credentials and React Native
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow any localhost for development (including React Native Metro bundler)
      if (origin.startsWith('http://localhost:') || 
          origin.startsWith('http://127.0.0.1:') ||
          origin === 'http://10.0.2.2:8080' || // Android emulator
          origin === 'http://10.0.3.2:8080' || // Genymotion
          origin.startsWith('http://192.168.') || // Local network for physical devices
          origin.startsWith('http://10.0.') || // Local network ranges
          origin.startsWith('http://172.') || // Local network ranges
          origin.startsWith('http://169.254.') || // Link-local addresses
          origin === 'null') { // Some React Native environments
        return callback(null, true);
      }
      
      // Allow specific origins from config
      if (config.corsOrigin !== '*' && origin === config.corsOrigin) {
        return callback(null, true);
      }
      
      // For development, allow all origins if CORS_ORIGIN is set to '*'
      if (config.corsOrigin === '*') {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    corsOrigin: config.corsOrigin 
  });
});

app.use('/api', authRoutes);
app.use('/api', pairingRoutes);
app.use('/api', keygenRoutes);
app.use('/api', transactionRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, _next: any) => {
  logger.error({
    err,
    message: 'Request error',
    url: req.url,
    method: req.method,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']
  });
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'cors_error', 
      message: 'CORS policy violation',
      origin: req.headers.origin 
    });
  }
  
  res.status(500).json({ error: 'internal_error' });
});

// Serve static files from the project root directory
app.use(express.static(path.join(__dirname, '..')));

// Create HTTP server
const server = createServer(app);

server.listen(config.port, () => {
  logger.info(`Orchestrator running on port ${config.port}`);
});
