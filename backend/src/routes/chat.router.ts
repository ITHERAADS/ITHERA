import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as ChatService from '../domain/groups/chat.service';
import { getIO } from '../infrastructure/sockets/socket.server';

const router = Router({ mergeParams: true });

router.get('/messages', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const messages = await ChatService.listGroupMessages(req.user!.id, groupId, limit);

    res.status(200).json({ ok: true, messages });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.post('/messages', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;
    const { contenido } = req.body as { contenido?: string };

    if (typeof contenido !== 'string') {
      res.status(400).json({ ok: false, error: 'contenido es requerido' });
      return;
    }

    const message = await ChatService.createGroupMessageByAuthUser(req.user!.id, groupId, contenido);

    try {
      getIO().to(String(groupId)).emit('chat_message', message);
    } catch {
      // En tests o arranques parciales Socket.IO puede no estar inicializado.
    }

    res.status(201).json({ ok: true, message });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

export default router;
