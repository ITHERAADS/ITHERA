import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { requireAuth } from '../middlewares/auth.middleware';
import * as GroupsService from '../domain/groups/groups.service';
import { MemberRole } from '../domain/groups/groups.entity';
import { supabase } from '../infrastructure/db/supabase.client';

const router = Router();

// POST /api/groups
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body as { nombre?: string; descripcion?: string };
    if (!nombre) { res.status(400).json({ ok: false, error: 'El nombre del grupo es requerido' }); return; }
    const grupo = await GroupsService.createGroup(req.user!.id, { nombre, descripcion });
    res.status(201).json({ ok: true, message: 'Grupo creado correctamente', group: grupo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error interno del servidor', details: msg });
  }
});

// POST /api/groups/join
router.post('/join', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo } = req.body as { codigo?: string };
    if (!codigo) { res.status(400).json({ ok: false, error: 'El código de invitación es requerido' }); return; }
    const grupo = await GroupsService.joinGroupByCode(req.user!.id, { codigo });
    res.status(200).json({ ok: true, message: 'Te uniste al grupo correctamente', group: grupo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode === 409 ? 409 : msg.includes('no encontrado') ? 404 : 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

// GET /api/groups/my-history
router.get('/my-history', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const history = await GroupsService.getMyTravelHistory(req.user!.id);
    res.status(200).json({ ok: true, ...history });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al consultar historial', details: msg });
  }
});

// GET /api/groups/:groupId/qr
router.get('/:groupId/qr', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { data: grupo, error } = await supabase
      .from('grupos_viaje')
      .select('id, nombre, codigo_invitacion')
      .eq('id', groupId)
      .single();

    if (error || !grupo) { res.status(404).json({ ok: false, error: 'Grupo no encontrado' }); return; }

    const inviteLink = `tripapp://join-group?code=${(grupo as any).codigo_invitacion}`;
    const qrBase64 = await QRCode.toDataURL(inviteLink);
    res.status(200).json({ ok: true, message: 'QR generado correctamente', inviteLink, qrBase64 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al generar QR', details: msg });
  }
});

// GET /api/groups/:groupId/members
router.get('/:groupId/members', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const members = await GroupsService.getGroupMembers(req.params.groupId);
    res.status(200).json({ ok: true, members });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al consultar miembros', details: msg });
  }
});

// PATCH /api/groups/members/:memberId/role
router.patch('/members/:memberId/role', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rol } = req.body as { rol?: string };
    if (!rol || !['admin', 'viajero'].includes(rol)) {
      res.status(400).json({ ok: false, error: 'Rol inválido. Valores permitidos: admin, viajero' });
      return;
    }
    const member = await GroupsService.updateMemberRole(req.params.memberId, rol as MemberRole);
    res.status(200).json({ ok: true, message: 'Rol actualizado correctamente', member });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error al actualizar rol', details: msg });
  }
});

export default router;
