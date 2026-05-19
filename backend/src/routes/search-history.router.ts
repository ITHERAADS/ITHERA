import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as SearchHistoryService from '../domain/search-history/search-history.service';
import { CreateSearchHistoryPayload } from '../domain/search-history/search-history.entity';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const grupoId = String(req.query.grupoId ?? '').trim();

    if (!grupoId) {
      res.status(400).json({ ok: false, error: 'grupoId es requerido' });
      return;
    }

    const history = await SearchHistoryService.listSearchHistoryByGroup(req.user!.id, grupoId);
    res.status(200).json({ ok: true, data: history });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateSearchHistoryPayload;

    if (!body.grupoId || !body.tipo || !body.fuente || !body.titulo) {
      res.status(400).json({
        ok: false,
        error: 'Faltan campos obligatorios para registrar historial de búsqueda',
      });
      return;
    }

    if (body.tipo !== 'vuelo' && body.tipo !== 'hospedaje') {
      res.status(400).json({ ok: false, error: 'tipo debe ser vuelo u hospedaje' });
      return;
    }

    const saved = await SearchHistoryService.createSearchHistoryEntry(req.user!.id, body);
    res.status(201).json({
      ok: true,
      message: 'Historial de búsqueda guardado correctamente',
      data: saved,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

export default router;
