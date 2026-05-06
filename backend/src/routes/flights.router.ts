import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as FlightsService from '../domain/flights/flights.service';

const router = Router();

router.get('/search', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin, destination, departureDate, adults, max } = req.query;

    if (!origin || !destination || !departureDate) {
      res.status(400).json({ ok: false, error: 'origin, destination y departureDate son requeridos' });
      return;
    }

    const flights = await FlightsService.searchFlights({
      origin: String(origin).toUpperCase(),
      destination: String(destination).toUpperCase(),
      departureDate: String(departureDate),
      adults: adults ? Number(adults) : 1,
      max: max ? Number(max) : 5,
    });

    res.status(200).json({ ok: true, data: flights });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al buscar vuelos', details: msg });
  }
});

export default router;