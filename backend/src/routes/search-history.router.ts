import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as SearchHistoryService from '../domain/search-history/searchHistory.service';
import { CreateSearchHistoryPayload } from '../domain/search-history/searchHistory.entity';

export const searchHistoryRouter = Router();

const getStatusCode = (err: unknown): number => {
  const code = (err as { statusCode?: number })?.statusCode;
  return typeof code === 'number' ? code : 500;
};

const getErrorCode = (err: unknown): string | undefined => {
  return (err as { code?: string })?.code;
};

// GET /api/search-history
searchHistoryRouter.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuarioId = req.user!.id;
      const items = await SearchHistoryService.listByUser(usuarioId);
      res.json({ ok: true, data: items });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/search-history
searchHistoryRouter.post(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuarioId = req.user!.id;
      const body = req.body as Omit<CreateSearchHistoryPayload, 'usuario_id'>;

      if (!body.tipo || !body.parametros || !body.resultado_cache || !body.expires_at) {
        res.status(400).json({
          ok: false,
          error: 'Faltan campos obligatorios: tipo, parametros, resultado_cache, expires_at',
        });
        return;
      }

      const entry = await SearchHistoryService.createEntry({
        ...body,
        usuario_id: usuarioId,
      });
      res.status(201).json({ ok: true, data: entry });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/search-history  (limpiar todo)
searchHistoryRouter.delete(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuarioId = req.user!.id;
      await SearchHistoryService.clearHistory(usuarioId);
      res.json({ ok: true, data: null });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/search-history/:id
searchHistoryRouter.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuarioId = req.user!.id;
      const { id } = req.params;
      await SearchHistoryService.deleteEntry(id, usuarioId);
      res.json({ ok: true, data: null });
    } catch (err) {
      const status = getStatusCode(err);
      if (status === 404) {
        res.status(404).json({ ok: false, error: 'Registro no encontrado', code: 'ERR-73-002' });
        return;
      }
      next(err);
    }
  }
);

// POST /api/search-history/:id/recover
searchHistoryRouter.post(
  '/:id/recover',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuarioId = req.user!.id;
      const { id } = req.params;
      const { grupoId } = req.body as { grupoId?: string };

      if (!grupoId) {
        res.status(400).json({ ok: false, error: 'grupoId es requerido', code: 'ERR-74-002' });
        return;
      }

      const proposal = await SearchHistoryService.recoverAsProposalTypeB({
        historialId: id,
        grupoId,
        usuarioId,
      });
      res.status(201).json({ ok: true, data: proposal });
    } catch (err) {
      const status = getStatusCode(err);
      const code = getErrorCode(err);
      const message = err instanceof Error ? err.message : 'Error desconocido';

      if (status === 410 || status === 404) {
        res.status(status).json({ ok: false, error: message, code: code ?? 'ERR-74-001' });
        return;
      }
      next(err);
    }
  }
);
