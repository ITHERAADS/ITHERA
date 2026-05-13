import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as ExportService from '../domain/export/export.service';

export const exportRouter = Router();

exportRouter.post('/pdf', requireAuth, async (req: any, res: any) => {
  const { grupoId } = req.body as { grupoId?: string };

  if (!grupoId) {
    return res.status(400).json({ ok: false, error: 'grupoId es requerido' });
  }

  try {
    await ExportService.validateConsolidated(grupoId);
    const data = await ExportService.getItineraryData(grupoId);
    const html = ExportService.generateHTMLForPDF(data);
    return res.json({ ok: true, data: { html } });
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({
      ok: false,
      error: err.message,
      code: err.code ?? 'ERR-75-002',
    });
  }
});

exportRouter.post('/png', requireAuth, async (req: any, res: any) => {
  const { grupoId } = req.body as { grupoId?: string };

  if (!grupoId) {
    return res.status(400).json({ ok: false, error: 'grupoId es requerido' });
  }

  try {
    await ExportService.validateConsolidated(grupoId);
    const data = await ExportService.getItineraryData(grupoId);
    const html = ExportService.generateHTMLForPDF(data);
    return res.json({ ok: true, data: { html } });
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({
      ok: false,
      error: err.message,
      code: err.code ?? 'ERR-75-002',
    });
  }
});

exportRouter.get('/share-link/:grupoId', requireAuth, async (req: any, res: any) => {
  const { grupoId } = req.params as { grupoId: string };

  try {
    let token = await ExportService.getShareLink(grupoId);
    if (!token) {
      token = await ExportService.createShareLink(grupoId, req.user!.id);
    }
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const shareUrl = `${frontendUrl}/shared/${token}`;
    return res.json({ ok: true, data: { shareUrl, token } });
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({
      ok: false,
      error: err.message,
      code: err.code ?? 'ERR-75-002',
    });
  }
});
