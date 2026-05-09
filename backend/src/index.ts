const express = require('express');
const cors = require('cors');
import { createServer } from 'http';

import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler.middleware';
import authRouter from './routes/auth.router';
import tripsRouter from './routes/trips.router';
import flightsRouter from './routes/flights.router';
import hotelsRouter from './routes/hotels.router';
import mapsRouter from './routes/maps.router';
import proposalsRouter from './routes/proposals.router';
import votesCommentsRouter from './routes/votesComments.router';
import budgetRouter from './routes/budget.router';
import notificationsRouter from './routes/notifications.router';
import documentsRouter from './routes/documents.router';
import checkoutRouter from './routes/checkout.router';
import { initSocketServer } from './infrastructure/sockets/socket.server';
import { startLockScheduler } from './infrastructure/sockets/lock.scheduler';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin: string | undefined, callback: any) => {
    if (!origin) {
      return callback(null, true);
    }

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app');

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

app.get('/health', (_req: any, res: any) => {
  res.status(200).json({
    ok: true,
    message: 'ITHERA backend funcionando',
    env: env.NODE_ENV
  });
});

app.use('/api/auth', authRouter);
app.use('/api/groups', tripsRouter);
app.use('/api/flights', flightsRouter);
app.use('/api/hotels', hotelsRouter);
app.use('/api/maps', mapsRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/proposals', votesCommentsRouter);
app.use('/api/budget', budgetRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/groups/:groupId/documents', documentsRouter);
app.use('/api/groups/:groupId/vault', documentsRouter);
app.use(errorHandler);

// ── Socket.IO + Scheduler ─────────────────────────────────────────
const io = initSocketServer(httpServer);
startLockScheduler(io);

// ── Arranque ──────────────────────────────────────────────────────
httpServer.listen(env.PORT, () => {
  console.log(`ITHERA backend corriendo en http://localhost:${env.PORT}`);
  console.log(`Entorno: ${env.NODE_ENV}`);
  console.log(`Socket.IO corriendo en el mismo puerto (${env.PORT})`);
});

export default app;
