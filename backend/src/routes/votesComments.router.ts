import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as VotesCommentsService from '../domain/votes-comments/votesComments.service';
import {
  CreateCommentPayload,
  UpdateCommentPayload,
} from '../domain/votes-comments/votesComments.entity';

const router = Router();

router.post('/:proposalId/votes', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    if (Number.isNaN(proposalId)) {
      res.status(400).json({ ok: false, error: 'proposalId inválido' });
      return;
    }

    const summary = await VotesCommentsService.voteProposal(proposalId, req.user!.id);
    res.status(201).json({ ok: true, message: 'Voto registrado correctamente', data: summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/:proposalId/votes/summary', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    if (Number.isNaN(proposalId)) {
      res.status(400).json({ ok: false, error: 'proposalId inválido' });
      return;
    }

    const summary = await VotesCommentsService.getVoteSummary(proposalId, req.user!.id);
    res.status(200).json({ ok: true, data: summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/:proposalId/comments', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    if (Number.isNaN(proposalId)) {
      res.status(400).json({ ok: false, error: 'proposalId inválido' });
      return;
    }

    const comments = await VotesCommentsService.listCommentsByProposal(proposalId, req.user!.id);
    res.status(200).json({ ok: true, data: comments });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.post('/:proposalId/comments', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    if (Number.isNaN(proposalId)) {
      res.status(400).json({ ok: false, error: 'proposalId inválido' });
      return;
    }

    const { contenido } = req.body as CreateCommentPayload;
    if (!contenido || !contenido.trim()) {
      res.status(400).json({ ok: false, error: 'contenido es requerido' });
      return;
    }

    const comment = await VotesCommentsService.createComment(proposalId, req.user!.id, { contenido });
    res.status(201).json({ ok: true, message: 'Comentario creado correctamente', data: comment });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.put('/:proposalId/comments/:commentId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    const commentId = Number(req.params.commentId);

    if (Number.isNaN(proposalId) || Number.isNaN(commentId)) {
      res.status(400).json({ ok: false, error: 'proposalId o commentId inválido' });
      return;
    }

    const { contenido } = req.body as UpdateCommentPayload;
    if (!contenido || !contenido.trim()) {
      res.status(400).json({ ok: false, error: 'contenido es requerido' });
      return;
    }

    const comment = await VotesCommentsService.updateComment(proposalId, commentId, req.user!.id, { contenido });
    res.status(200).json({ ok: true, message: 'Comentario actualizado correctamente', data: comment });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.delete('/:proposalId/comments/:commentId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    const commentId = Number(req.params.commentId);

    if (Number.isNaN(proposalId) || Number.isNaN(commentId)) {
      res.status(400).json({ ok: false, error: 'proposalId o commentId inválido' });
      return;
    }

    await VotesCommentsService.deleteComment(proposalId, commentId, req.user!.id);
    res.status(200).json({ ok: true, message: 'Comentario eliminado correctamente' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

export default router;
