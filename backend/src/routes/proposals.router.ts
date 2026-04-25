import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as ProposalsService from '../domain/proposals/proposals.service';
import {
  SaveFlightProposalPayload,
  SaveHotelProposalPayload,
  UpdateProposalPayload,
} from '../domain/proposals/proposals.entity';

const router = Router();

const getStatusCode = (err: unknown): number => {
  const statusCode = (err as { statusCode?: number })?.statusCode;
  if (typeof statusCode === 'number') return statusCode;
  return 500;
};

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
    const groupId = req.params.groupId;

    if (!groupId) {
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

// POST /api/proposals/groups/:tripId/:proposalId/vote
router.post('/groups/:tripId/:proposalId/vote', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, proposalId } = req.params as { tripId: string; proposalId: string };

    const result = await ProposalsService.castSingleVote(req.user!.id, tripId, proposalId, {});
    res.status(200).json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: msg });
  }
});

// GET /api/proposals/groups/:tripId/vote-results
router.get('/groups/:tripId/vote-results', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params as { tripId: string };
    const result = await ProposalsService.getProposalVoteResults(req.user!.id, tripId);
    res.status(200).json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: msg });
  }
});

// POST /api/proposals/groups/:tripId/:proposalId/comments
router.post('/groups/:tripId/:proposalId/comments', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, proposalId } = req.params as { tripId: string; proposalId: string };
    const { contenido } = req.body as { contenido?: string };

    if (!contenido) {
      res.status(400).json({ ok: false, error: 'contenido es requerido' });
      return;
    }

    const comment = await ProposalsService.createComment(req.user!.id, tripId, proposalId, { contenido });
    res.status(201).json({ ok: true, message: 'Comentario creado correctamente', comment });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: msg });
  }
});

// GET /api/proposals/groups/:tripId/:proposalId/comments
router.get('/groups/:tripId/:proposalId/comments', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, proposalId } = req.params as { tripId: string; proposalId: string };

    const comments = await ProposalsService.listComments(req.user!.id, tripId, proposalId);
    res.status(200).json({ ok: true, comments });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: msg });
  }
});

// PATCH /api/proposals/groups/:tripId/:proposalId/comments/:commentId
router.patch('/groups/:tripId/:proposalId/comments/:commentId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, proposalId, commentId } = req.params as {
      tripId: string;
      proposalId: string;
      commentId: string;
    };
    const { contenido } = req.body as { contenido?: string };

    if (!contenido) {
      res.status(400).json({ ok: false, error: 'contenido es requerido' });
      return;
    }

    const comment = await ProposalsService.updateComment(req.user!.id, tripId, proposalId, commentId, { contenido });
    res.status(200).json({ ok: true, message: 'Comentario actualizado correctamente', comment });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: msg });
  }
});

// DELETE /api/proposals/groups/:tripId/:proposalId/comments/:commentId
router.delete('/groups/:tripId/:proposalId/comments/:commentId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, proposalId, commentId } = req.params as {
      tripId: string;
      proposalId: string;
      commentId: string;
    };

    const result = await ProposalsService.deleteComment(req.user!.id, tripId, proposalId, commentId);
    res.status(200).json({ ok: true, message: 'Comentario eliminado correctamente', ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: msg });
  }
});

export default router;
