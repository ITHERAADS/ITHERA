import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as NotificationsService from '../domain/notifications/notifications.service';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUserId = req.user!.id;
    const notifications = await NotificationsService.getNotifications(authUserId);
    res.json({ ok: true, notifications });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUserId = req.user!.id;
    const count = await NotificationsService.getUnreadCount(authUserId);
    res.json({ ok: true, count });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUserId = req.user!.id;
    const notificationId = parseInt(req.params.id, 10);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ ok: false, error: 'ID de notificación inválido' });
    }

    await NotificationsService.markAsRead(authUserId, notificationId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUserId = req.user!.id;
    await NotificationsService.markAllAsRead(authUserId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/preferences
router.get('/preferences', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUserId = req.user!.id;
    const preferences = await NotificationsService.getPreferences(authUserId);
    res.json({ ok: true, preferences });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/preferences
router.patch('/preferences', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUserId = req.user!.id;
    const payload = req.body;
    
    // Filtramos para solo permitir keys correctas
    const validKeys = [
      'notificaciones_correo',
      'notificaciones_grupo',
      'notificaciones_votos',
      'notificaciones_comentarios',
      'notificaciones_invitaciones'
    ];
    
    const updatePayload: any = {};
    for (const key of validKeys) {
      if (payload[key] !== undefined) {
        updatePayload[key] = Boolean(payload[key]);
      }
    }

    const preferences = await NotificationsService.updatePreferences(authUserId, updatePayload);
    res.json({ ok: true, preferences });
  } catch (error) {
    next(error);
  }
});

export default router;
