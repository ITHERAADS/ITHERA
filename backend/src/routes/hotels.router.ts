import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as HotelsService from '../domain/hotels/hotels.service';
import { HotelSearchParams } from '../domain/hotels/hotels.entity';

const router = Router();

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toChildrenAges(value: unknown): number[] | undefined {
  if (Array.isArray(value)) {
    return value.map(Number).filter(Number.isFinite);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => Number(item.trim())).filter(Number.isFinite);
  }
  return undefined;
}

router.post('/search', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<HotelSearchParams>;

    const hotels = await HotelsService.searchHotels({
      destination: body.destination,
      latitude: toNumber(body.latitude),
      longitude: toNumber(body.longitude),
      placeId: body.placeId,
      checkIn: String(body.checkIn ?? ''),
      checkOut: String(body.checkOut ?? ''),
      adults: toNumber(body.adults) ?? 1,
      childrenAges: toChildrenAges(body.childrenAges),
      rooms: toNumber(body.rooms) ?? 1,
      currency: body.currency ?? 'MXN',
      guestNationality: body.guestNationality ?? 'MX',
      countryCode: body.countryCode,
      radius: toNumber(body.radius),
      limit: toNumber(body.limit) ?? 12,
      minRating: toNumber(body.minRating),
    });

    res.status(200).json({ ok: true, data: hotels });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: 'Error al buscar hospedajes', details: msg });
  }
});

router.post('/prebook', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { offerId } = req.body as { offerId?: string };
    const prebook = await HotelsService.prebookHotel(String(offerId ?? ''));
    res.status(200).json({ ok: true, data: prebook.data ?? prebook });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: 'Error al crear prebook', details: msg });
  }
});

export default router;
