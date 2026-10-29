import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDatabase } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize database schema and seeds
initDatabase();

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// API Routes
app.use('/api', apiRouter);

// Set up Vite development server middleware or production static files
async function setupVite() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || hasDist;

  if (isProd && hasDist) {
    console.log('[Vibes Massage] Serving compiled production build from dist/');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Vibes Massage] Starting Vite dev middleware');
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Vibes Massage] Server listening on http://0.0.0.0:${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('[Vibes Massage] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Vibes Massage] Unhandled Rejection:', reason);
});

setupVite().catch((err) => {
  console.error('[Vibes Massage] Failed to start server:', err);
  process.exit(1);
});
