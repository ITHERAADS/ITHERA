import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as HotelsService from '../domain/hotels/hotels.service';

const router = Router();

router.get('/search', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { cityCode } = req.query;
    if (!cityCode) {
      res.status(400).json({ ok: false, error: 'cityCode es requerido' });
      return;
    }

    const hotels = await HotelsService.searchHotelsByCity({ cityCode: String(cityCode).toUpperCase() });
    res.status(200).json({ ok: true, data: hotels });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al buscar hoteles', details: msg });
  }
});

router.get('/offers', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelIds, checkIn, checkOut, adults } = req.query;
    if (!hotelIds) {
      res.status(400).json({ ok: false, error: 'hotelIds es requerido' });
      return;
    }

    const offers = await HotelsService.getHotelOffers({
      hotelIds: String(hotelIds),
      checkIn: checkIn ? String(checkIn) : undefined,
      checkOut: checkOut ? String(checkOut) : undefined,
      adults: adults ? Number(adults) : 1,
    });

    res.status(200).json({ ok: true, data: offers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al consultar ofertas de hotel', details: msg });
  }
});

export default router;