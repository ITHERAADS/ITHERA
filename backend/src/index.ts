const express = require('express');
const cors = require('cors');

import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler.middleware';
import authRouter from './routes/auth.router';
import tripsRouter from './routes/trips.router';

const app = express();

// ── Middlewares globales ──────────────────────────────────────────
app.use(cors({
  origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req: any, res: any) => {
  res.status(200).json({
    ok: true,
    message: 'ITHERA backend funcionando',
    env: env.NODE_ENV
  });
});

// ── Rutas ─────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/groups', tripsRouter);

// ── Error handler global ──────────────────────────────────────────
app.use(errorHandler);

// ── Arranque ──────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`ITHERA backend corriendo en http://localhost:${env.PORT}`);
  console.log(`Entorno: ${env.NODE_ENV}`);
});

export default app;