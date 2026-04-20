const express = require('express');
const cors = require('cors');

import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler.middleware';
import authRouter from './routes/auth.router';
import tripsRouter from './routes/trips.router';
import flightsRouter from './routes/flights.router';
import hotelsRouter from './routes/hotels.router';
import mapsRouter from './routes/maps.router';
import proposalsRouter from './routes/proposals.router';
import votesCommentsRouter from './routes/votesComments.router';

const app = express();

app.use(cors({
  origin: env.FRONTEND_URL,
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

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`ITHERA backend corriendo en http://localhost:${env.PORT}`);
  console.log(`Entorno: ${env.NODE_ENV}`);
});

export default app;