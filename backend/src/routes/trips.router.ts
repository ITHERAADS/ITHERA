import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { requireAuth } from '../middlewares/auth.middleware';
import * as GroupsService from '../domain/groups/groups.service';
import { MemberRole } from '../domain/groups/groups.entity';
import itineraryRouter from './itinerary.router';
import chatRouter from './chat.router';
import budgetRouter from './budget.router';

const router = Router();

router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      descripcion,
      destino,
      destino_latitud,
      destino_longitud,
      destino_place_id,
      destino_formatted_address,
      fecha_inicio,
      fecha_fin,
      maximo_miembros,
      presupuesto_total,
    } = req.body as {
      nombre?: string;
      descripcion?: string;
      destino?: string;
      destino_latitud?: number | null;
      destino_longitud?: number | null;
      destino_place_id?: string | null;
      destino_formatted_address?: string | null;
      fecha_inicio?: string;
      fecha_fin?: string;
      maximo_miembros?: number;
      presupuesto_total?: number;
    };

    if (!nombre || !nombre.trim()) {
      res.status(400).json({ ok: false, error: 'ERR-23-001: El nombre del grupo es requerido' });
      return;
    }

    if (nombre.trim().length > 60) {
      res.status(400).json({ ok: false, error: 'ERR-23-001: El nombre del grupo permite máximo 60 caracteres' });
      return;
    }

    if (descripcion && descripcion.trim().length > 300) {
      res.status(400).json({ ok: false, error: 'ERR-23-001: La descripción permite máximo 300 caracteres' });
      return;
    }

    if (!Number.isFinite(Number(presupuesto_total)) || Number(presupuesto_total) <= 0) {
      res.status(400).json({ ok: false, error: 'ERR-23-004: El monto del presupuesto debe ser un número positivo mayor a cero' });
      return;
    }

    if (maximo_miembros !== undefined) {
      const parsedMaxMembers = Number(maximo_miembros);
      if (!Number.isInteger(parsedMaxMembers) || parsedMaxMembers < 1 || parsedMaxMembers > 50) {
        res.status(400).json({
          ok: false,
          error: 'ERR-23-001: El máximo de miembros debe estar entre 1 y 50',
        });
        return;
      }
    }

    const grupo = await GroupsService.createGroup(req.user!.id, {
      nombre,
      descripcion,
      destino,
      destino_latitud,
      destino_longitud,
      destino_place_id,
      destino_formatted_address,
      fecha_inicio,
      fecha_fin,
      maximo_miembros,
      presupuesto_total: Number(presupuesto_total),
    });

    res.status(201).json({ ok: true, message: 'Grupo creado correctamente', group: grupo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error interno del servidor', details: msg });
  }
});

router.post('/join', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo } = req.body as { codigo?: string };

    if (!codigo) {
      res.status(400).json({ ok: false, error: 'El código de invitación es requerido' });
      return;
    }

    const grupo = await GroupsService.joinGroupByCode(req.user!.id, { codigo });
    res.status(200).json({ ok: true, message: 'Te uniste al grupo correctamente', group: grupo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/my-history', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const history = await GroupsService.getMyTravelHistory(req.user!.id);
    res.status(200).json({ ok: true, ...history });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al consultar historial', details: msg });
  }
});

router.get('/invite-preview/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const preview = await GroupsService.getInvitePreviewByCode(req.params.code);
    res.status(200).json({ ok: true, preview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.use('/:groupId/itinerary', itineraryRouter);
router.use('/:groupId/chat', chatRouter);

router.get('/:groupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await GroupsService.getGroupDetails(req.user!.id, req.params.groupId);
    res.status(200).json({ ok: true, group });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/:groupId/invite', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = await GroupsService.getInviteInfo(req.user!.id, req.params.groupId);
    res.status(200).json({ ok: true, ...payload });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/:groupId/invitations', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const invitations = await GroupsService.getGroupInvitations(
      req.user!.id,
      req.params.groupId
    );

    res.status(200).json({
      ok: true,
      invitations,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.post('/:groupId/invitations', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { emails } = req.body as { emails?: string[] };

    if (!Array.isArray(emails) || emails.length === 0) {
      res.status(400).json({
        ok: false,
        error: 'Debes enviar un arreglo de correos en el campo emails',
      });
      return;
    }

    const invalidEmails = emails.filter(
      (email) =>
        typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    );

    if (invalidEmails.length > 0) {
      res.status(400).json({
        ok: false,
        error: 'Uno o más correos no tienen un formato válido',
        invalidEmails,
      });
      return;
    }

    const result = await GroupsService.createGroupInvitations(
      req.user!.id,
      req.params.groupId,
      { emails }
    );

    res.status(201).json({
      ok: true,
      message: 'Invitaciones generadas correctamente',
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/:groupId/qr', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const inviteInfo = await GroupsService.getInviteInfo(req.user!.id, req.params.groupId);
    const qrBase64 = await QRCode.toDataURL(inviteInfo.inviteLink);

    res.status(200).json({
      ok: true,
      ...inviteInfo,
      qrBase64,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/:groupId/members', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const members = await GroupsService.getGroupMembers(req.user!.id, req.params.groupId);
    res.status(200).json({ ok: true, members });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.patch('/members/:memberId/role', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rol } = req.body as { rol?: string };

    if (!rol || !['admin', 'viajero'].includes(rol)) {
      res.status(400).json({
        ok: false,
        error: 'Rol inválido. Valores permitidos: admin, viajero',
      });
      return;
    }

    const member = await GroupsService.updateMemberRole(
      req.user!.id,
      req.params.memberId,
      rol as MemberRole
    );

    res.status(200).json({ ok: true, message: 'Rol actualizado correctamente', member });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.delete('/:groupId/members/:memberId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await GroupsService.removeMember(
      req.user!.id,
      req.params.groupId,
      req.params.memberId
    );

    res.status(200).json({...result, message: 'Miembro eliminado correctamente' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.patch('/:groupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { maximo_miembros } = req.body as { maximo_miembros?: number };

    if (maximo_miembros !== undefined) {
      const parsedMaxMembers = Number(maximo_miembros);
      if (!Number.isInteger(parsedMaxMembers) || parsedMaxMembers < 1 || parsedMaxMembers > 50) {
        res.status(400).json({
          ok: false,
          error: 'ERR-23-001: El máximo de miembros debe estar entre 1 y 50',
        });
        return;
      }
    }

    const group = await GroupsService.updateGroup(req.user!.id, req.params.groupId, req.body);
    res.status(200).json({ ok: true, message: 'Grupo actualizado correctamente', group });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.delete('/:groupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await GroupsService.deleteGroup(req.user!.id, req.params.groupId);
    res.status(200).json({...result, message: 'Grupo eliminado correctamente' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.use('/:groupId', budgetRouter);

export default router;
