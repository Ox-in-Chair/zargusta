/** ZARyder Cup — Augusta 2036 Bitcoin Investment Fund Tracker */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataManager } from './data-manager.js';
import { createRouter } from './routes.js';
import { createExtendedRouter } from './routes-extended.js';
import { createAdminRouter } from './routes-admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3030;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https://api.coingecko.com', 'https://open.er-api.com', 'https://api.alternative.me'],
      imgSrc: ["'self'", 'data:', 'https://assets.coingecko.com', 'https://coin-images.coingecko.com'],
      upgradeInsecureRequests: null,
    },
  },
}));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Rate limiting
app.use('/api', rateLimit({ windowMs: 60_000, max: 100 }));

// Static files (browser-native ES modules)
app.use(express.static(join(__dirname, '..', '..', 'public')));

// API
const dm = new DataManager();
app.use('/api', createRouter(dm));
app.use('/api', createExtendedRouter(dm));
app.use('/api', createAdminRouter(dm));

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  const filePath = join(__dirname, '..', '..', 'public', 'index.html');
  res.sendFile(filePath, (err) => {
    if (err) { res.status(404).json({ success: false, error: 'Not found' }); }
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    meta: { timestamp: new Date().toISOString(), version: '2.0.0' },
  });
});

const server = app.listen(PORT, () => {
  console.log(`🏌️ ZARyder Cup running on http://localhost:${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use`);
    process.exit(1);
  }
  throw err;
});

export { app };
