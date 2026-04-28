import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as ItineraryService from '../domain/itinerary/itinerary.service';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;

    if (!groupId) {
      res.status(400).json({ ok: false, error: 'groupId inválido' });
      return;
    }

    const result = await ItineraryService.getGroupItinerary(req.user!.id, groupId);

    res.status(200).json({
      ok: true,
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;

    res.status(status).json({
      ok: false,
      error: msg,
    });
  }
});

export default router;