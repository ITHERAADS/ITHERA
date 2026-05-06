import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as FlightsService from '../domain/flights/flights.service';
import * as AirportsService from '../domain/flights/airports.service';
import { CabinClass } from '../domain/flights/flights.entity';

const router = Router();

function toNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function normalizeCabinClass(value: unknown): CabinClass {
  const raw = String(value ?? 'economy');
  if (['economy', 'premium_economy', 'business', 'first'].includes(raw)) {
    return raw as CabinClass;
  }
  return 'economy';
}

function getStatusCode(err: unknown): number {
  const statusCode = (err as { statusCode?: number })?.statusCode;
  return typeof statusCode === 'number' ? statusCode : 500;
}


function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

router.get('/airports/search', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, latitude, longitude, max } = req.query;

    const airports = AirportsService.searchAirports({
      query: q ? String(q) : undefined,
      latitude: toOptionalNumber(latitude),
      longitude: toOptionalNumber(longitude),
      max: toNumber(max, 8),
    });

    res.status(200).json({ ok: true, data: airports });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: 'Error al buscar aeropuertos', details: msg });
  }
});

router.get('/airports/resolve', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, latitude, longitude, max } = req.query;

    const airport = await AirportsService.resolveAirport({
      query: q ? String(q) : undefined,
      latitude: toOptionalNumber(latitude),
      longitude: toOptionalNumber(longitude),
      max: toNumber(max, 8),
    });

    if (!airport) {
      res.status(404).json({ ok: false, error: 'No se encontró un aeropuerto cercano para ese destino' });
      return;
    }

    res.status(200).json({ ok: true, data: airport });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: 'Error al resolver aeropuerto', details: msg });
  }
});

router.get('/search', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults,
      children,
      infantsWithoutSeat,
      cabinClass,
      max,
    } = req.query;

    if (!origin || !destination || !departureDate) {
      res.status(400).json({ ok: false, error: 'origin, destination y departureDate son requeridos' });
      return;
    }

    const flights = await FlightsService.searchFlights({
      origin: String(origin),
      destination: String(destination),
      departureDate: String(departureDate),
      returnDate: normalizeDate(returnDate),
      adults: toNumber(adults, 1),
      children: toNumber(children, 0),
      infantsWithoutSeat: toNumber(infantsWithoutSeat, 0),
      cabinClass: normalizeCabinClass(cabinClass),
      max: toNumber(max, 20),
    });

    res.status(200).json({ ok: true, data: flights });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: 'Error al buscar vuelos', details: msg });
  }
});

export default router;
