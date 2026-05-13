import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { requireAuth } from '../middlewares/auth.middleware';
import * as GroupsService from '../domain/groups/groups.service';
import { MemberRole } from '../domain/groups/groups.entity';
import itineraryRouter from './itinerary.router';
import chatRouter from './chat.router';
import budgetRouter from './budget.router';

const router = Router();

const todayISO = () => new Date().toISOString().slice(0, 10);
const isValidISODate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
const GROUP_NAME_MAX_LENGTH = 60;
const GROUP_DESCRIPTION_MAX_LENGTH = 300;
const MAX_TRIP_DURATION_DAYS = 60;

const daysBetweenISO = (startDate: string, endDate: string): number | null => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);
};

const hasValidTripDuration = (startDate: string, endDate: string): boolean => {
  const durationDays = daysBetweenISO(startDate, endDate);
  return durationDays !== null && durationDays >= 1 && durationDays <= MAX_TRIP_DURATION_DAYS;
};

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
      es_publico,
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
      es_publico?: boolean;
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

    if (!destino || !destino.trim()) {
      res.status(400).json({ ok: false, error: 'ERR-23-001: Selecciona un destino para crear el viaje' });
      return;
    }

    if (!isValidISODate(fecha_inicio)) {
      res.status(400).json({ ok: false, error: 'ERR-23-001: La fecha de salida es requerida' });
      return;
    }

    if (!isValidISODate(fecha_fin)) {
      res.status(400).json({ ok: false, error: 'ERR-23-001: La fecha de regreso es requerida' });
      return;
    }

    const today = todayISO();
    if (fecha_inicio! < today) {
      res.status(400).json({ ok: false, error: 'ERR-23-003: La fecha de salida no puede ser anterior a hoy' });
      return;
    }

    if (fecha_fin! <= fecha_inicio!) {
      res.status(400).json({ ok: false, error: 'ERR-23-003: La fecha de regreso debe ser posterior a la de inicio del viaje' });
      return;
    }

    if (!hasValidTripDuration(fecha_inicio!, fecha_fin!)) {
      res.status(400).json({
        ok: false,
        error: `ERR-23-003: La duración máxima del viaje es de ${MAX_TRIP_DURATION_DAYS} días`,
      });
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
      es_publico: es_publico === true,
      presupuesto_total: Number(presupuesto_total),
    });

    res.status(201).json({ ok: true, message: 'Grupo creado correctamente', group: grupo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({
      ok: false,
      error: status === 500 ? 'Error interno del servidor' : msg,
      ...(status === 500 ? { details: msg } : {}),
    });
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
    res.status(200).json({
      ok: true,
      message: grupo.requiresApproval
        ? 'Tu solicitud fue enviada. Espera a que el organizador la apruebe.'
        : 'Te uniste al grupo correctamente',
      group: grupo,
    });
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


router.get('/:groupId/travel-context', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const context = await GroupsService.getGroupTravelContext(req.user!.id, req.params.groupId);
    res.status(200).json({ ok: true, data: context });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: status === 500 ? 'No se pudo cargar el punto de partida del viaje' : msg });
  }
});

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


router.get('/:groupId/join-requests', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await GroupsService.getJoinRequests(req.user!.id, req.params.groupId);
    res.status(200).json({ ok: true, requests });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.patch('/:groupId/join-requests/:requestId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { action } = req.body as { action?: 'approve' | 'reject' };

    if (!action || !['approve', 'reject'].includes(action)) {
      res.status(400).json({ ok: false, error: 'Acción inválida. Usa approve o reject.' });
      return;
    }

    const result = await GroupsService.resolveJoinRequest(
      req.user!.id,
      req.params.groupId,
      req.params.requestId,
      action
    );

    res.status(200).json({
      ok: true,
      message: action === 'approve' ? 'Solicitud aprobada correctamente' : 'Solicitud rechazada correctamente',
      ...result,
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
    const { nombre, descripcion, fecha_inicio, fecha_fin, maximo_miembros } = req.body as {
      nombre?: string;
      descripcion?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
      maximo_miembros?: number;
    };

    if (nombre !== undefined && (!nombre.trim() || nombre.trim().length > GROUP_NAME_MAX_LENGTH)) {
      res.status(400).json({
        ok: false,
        error: `ERR-23-001: El nombre del grupo es requerido y permite máximo ${GROUP_NAME_MAX_LENGTH} caracteres`,
      });
      return;
    }

    if (descripcion !== undefined && descripcion.trim().length > GROUP_DESCRIPTION_MAX_LENGTH) {
      res.status(400).json({
        ok: false,
        error: `ERR-23-001: La descripción permite máximo ${GROUP_DESCRIPTION_MAX_LENGTH} caracteres`,
      });
      return;
    }

    if (fecha_inicio !== undefined && fecha_inicio && !isValidISODate(fecha_inicio)) {
      res.status(400).json({ ok: false, error: 'ERR-23-001: La fecha de salida tiene formato inválido' });
      return;
    }

    if (fecha_fin !== undefined && fecha_fin && !isValidISODate(fecha_fin)) {
      res.status(400).json({ ok: false, error: 'ERR-23-001: La fecha de regreso tiene formato inválido' });
      return;
    }

    if (fecha_inicio && fecha_fin && fecha_fin <= fecha_inicio) {
      res.status(400).json({ ok: false, error: 'ERR-23-003: La fecha de regreso debe ser posterior a la de inicio del viaje' });
      return;
    }

    if (fecha_inicio && fecha_fin && !hasValidTripDuration(fecha_inicio, fecha_fin)) {
      res.status(400).json({
        ok: false,
        error: `ERR-23-003: La duración máxima del viaje es de ${MAX_TRIP_DURATION_DAYS} días`,
      });
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
