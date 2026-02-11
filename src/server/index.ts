/** ZARgusta — Augusta 2036 Bitcoin Investment Fund Tracker */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataManager } from './data-manager.js';
import { createRouter } from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3002;
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
      connectSrc: ["'self'", 'https://api.coingecko.com'],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Static files (browser-native ES modules)
app.use(express.static(join(__dirname, '..', '..', 'public')));

// API
const dm = new DataManager();
app.use('/api', createRouter(dm));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '..', '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🏌️ ZARgusta running on http://localhost:${PORT}`);
});

export { app };
