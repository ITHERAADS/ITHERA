import { Router, Request, Response } from 'express';
<<<<<<< HEAD
import { lockPropuesta, unlockPropuesta } from '../domain/proposals/proposals.service';

const router = Router();

// POST /propuestas/bloquear
router.post('/bloquear', async (req: Request, res: Response) => {
  try {
    const { id_propuesta, id_usuario } = req.body;
    const { data, error } = await lockPropuesta({ id_propuesta, id_usuario });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(409).json({ error: err.message });
  }
});

// POST /propuestas/liberar
router.post('/liberar', async (req: Request, res: Response) => {
  try {
    const { id_propuesta, id_usuario } = req.body;
    const { data, error } = await unlockPropuesta(id_propuesta, id_usuario);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
=======
import { requireAuth } from '../middlewares/auth.middleware';
import * as ProposalsService from '../domain/proposals/proposals.service';
import {
  SaveFlightProposalPayload,
  SaveHotelProposalPayload,
  UpdateProposalPayload,
} from '../domain/proposals/proposals.entity';

const router = Router();

router.post('/flights', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as SaveFlightProposalPayload;

    if (!body.grupoId || !body.fuente || !body.titulo || !body.vuelo) {
      res.status(400).json({ ok: false, error: 'Faltan campos obligatorios para guardar la propuesta de vuelo' });
      return;
    }

    const saved = await ProposalsService.createFlightProposal(req.user!.id, body);
    res.status(201).json({ ok: true, message: 'Propuesta de vuelo guardada correctamente', data: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.post('/hotels', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as SaveHotelProposalPayload;

    if (!body.grupoId || !body.fuente || !body.titulo || !body.hospedaje) {
      res.status(400).json({ ok: false, error: 'Faltan campos obligatorios para guardar la propuesta de hospedaje' });
      return;
    }

    const saved = await ProposalsService.createHotelProposal(req.user!.id, body);
    res.status(201).json({ ok: true, message: 'Propuesta de hospedaje guardada correctamente', data: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/groups/:groupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.groupId);
    if (Number.isNaN(groupId)) {
      res.status(400).json({ ok: false, error: 'groupId inválido' });
      return;
    }

    const proposals = await ProposalsService.listGroupProposals(groupId, req.user!.id);
    res.status(200).json({ ok: true, data: proposals });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/:proposalId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    if (Number.isNaN(proposalId)) {
      res.status(400).json({ ok: false, error: 'proposalId inválido' });
      return;
    }

    const proposal = await ProposalsService.getProposalById(proposalId, req.user!.id);
    res.status(200).json({ ok: true, data: proposal });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.put('/:proposalId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    if (Number.isNaN(proposalId)) {
      res.status(400).json({ ok: false, error: 'proposalId inválido' });
      return;
    }

    const body = req.body as UpdateProposalPayload;
    const hasProposalData =
      body.titulo !== undefined ||
      body.descripcion !== undefined ||
      body.estado !== undefined ||
      body.payload !== undefined;
    const hasDetailData = !!body.detalle && Object.keys(body.detalle).length > 0;

    if (!hasProposalData && !hasDetailData) {
      res.status(400).json({ ok: false, error: 'No se enviaron campos para actualizar' });
      return;
    }

    const updated = await ProposalsService.updateProposal(proposalId, req.user!.id, body);
    res.status(200).json({ ok: true, message: 'Propuesta actualizada correctamente', data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.delete('/:proposalId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    if (Number.isNaN(proposalId)) {
      res.status(400).json({ ok: false, error: 'proposalId inválido' });
      return;
    }

    await ProposalsService.deleteProposal(proposalId, req.user!.id);
    res.status(200).json({ ok: true, message: 'Propuesta eliminada correctamente' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

export default router;
>>>>>>> origin/develop
