import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as MapsService from '../domain/maps/maps.service';

const router = Router();

router.get('/geocoding/search', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.query;
    if (!address) {
      res.status(400).json({ ok: false, error: 'address es requerido' });
      return;
    }

    const result = await MapsService.geocodeAddress(String(address));
    res.status(200).json({ ok: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al geocodificar dirección', details: msg });
  }
});

router.post('/routes/compute', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { originLat, originLng, destinationLat, destinationLng, travelMode } = req.body as Record<string, unknown>;

    if ([originLat, originLng, destinationLat, destinationLng].some((value) => value === undefined || value === null)) {
      res.status(400).json({ ok: false, error: 'originLat, originLng, destinationLat y destinationLng son requeridos' });
      return;
    }

    const route = await MapsService.computeRoute({
      originLat: Number(originLat),
      originLng: Number(originLng),
      destinationLat: Number(destinationLat),
      destinationLng: Number(destinationLng),
      travelMode: travelMode as 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT' | undefined,
    });

    res.status(200).json({ ok: true, data: route });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al calcular ruta', details: msg });
  }
});

router.get('/places/autocomplete', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { input } = req.query;

    if (!input) {
      res.status(400).json({ ok: false, error: 'input es requerido' });
      return;
    }

    const results = await MapsService.autocompletePlaces(String(input));

    res.status(200).json({ ok: true, data: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al autocompletar lugares', details: msg });
  }
});

router.get('/places/details/:placeId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      res.status(400).json({ ok: false, error: 'placeId es requerido' });
      return;
    }

    const result = await MapsService.getPlaceDetails(placeId);

    res.status(200).json({ ok: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al obtener detalle del lugar', details: msg });
  }
});

router.post('/places/text-search', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { textQuery, latitude, longitude, radius, maxResultCount } = req.body as Record<string, unknown>;

    if (!textQuery) {
      res.status(400).json({ ok: false, error: 'textQuery es requerido' });
      return;
    }

    const results = await MapsService.searchPlacesByText({
      textQuery: String(textQuery),
      latitude: latitude !== undefined && latitude !== null ? Number(latitude) : undefined,
      longitude: longitude !== undefined && longitude !== null ? Number(longitude) : undefined,
      radius: radius ? Number(radius) : 5000,
      maxResultCount: maxResultCount ? Number(maxResultCount) : 8,
    });

    res.status(200).json({ ok: true, data: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al buscar lugares', details: msg });
  }
});

router.post('/places/nearby', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, radius, includedTypes, maxResultCount } = req.body as Record<string, unknown>;

    if (latitude === undefined || longitude === undefined || radius === undefined || !Array.isArray(includedTypes) || includedTypes.length === 0) {
      res.status(400).json({ ok: false, error: 'latitude, longitude, radius e includedTypes son requeridos' });
      return;
    }

    const places = await MapsService.searchNearbyPlaces({
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius: Number(radius),
      includedTypes: includedTypes.map(String),
      maxResultCount: maxResultCount ? Number(maxResultCount) : 5,
    });

    res.status(200).json({ ok: true, data: places });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al buscar lugares cercanos', details: msg });
  }
});


router.get('/weather', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude } = req.query;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ ok: false, error: 'latitude y longitude son requeridos' });
      return;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ ok: false, error: 'latitude y longitude deben ser números válidos' });
      return;
    }

    const weather = await MapsService.getWeather(lat, lng);
    res.status(200).json({ ok: true, data: weather });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al obtener clima', details: msg });
  }
});

export default router;