import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { requireAuth } from '../middlewares/auth.middleware';
import { env } from '../config/env';
import * as GroupsService from '../domain/groups/groups.service';
import { supabase } from '../infrastructure/db/supabase.client';

const router = Router();

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SHARE_SECRET = process.env.SHARE_LINK_SECRET || env.SUPABASE_SECRET_KEY;

type SharePayload = {
  groupId: string;
  exp: number;
};

const toBase64Url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');

const fromBase64Url = (value: string): string =>
  Buffer.from(value, 'base64url').toString('utf8');

const sign = (payload: string): string =>
  createHmac('sha256', SHARE_SECRET).update(payload).digest('base64url');

const buildToken = (payload: SharePayload): string => {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

const parseToken = (token: string): SharePayload => {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    throw Object.assign(new Error('Token de enlace compartido inválido'), { statusCode: 400 });
  }

  const expected = sign(encodedPayload);
  const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!isValid) {
    throw Object.assign(new Error('Token de enlace compartido inválido'), { statusCode: 401 });
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as SharePayload;
  if (!payload?.groupId || !payload?.exp) {
    throw Object.assign(new Error('Token de enlace compartido inválido'), { statusCode: 400 });
  }

  if (Date.now() > payload.exp) {
    throw Object.assign(new Error('El enlace compartido expiró'), { statusCode: 410 });
  }

  return payload;
};

const normalizeDay = (isoValue: string): string => {
  if (!isoValue) return '';
  return isoValue.slice(0, 10);
};

router.get('/share-link/:groupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;
    if (!groupId) {
      res.status(400).json({ ok: false, error: 'groupId inválido' });
      return;
    }

    // Valida membresía antes de generar el enlace compartido.
    await GroupsService.getGroupDetails(req.user!.id, groupId);

    const payload: SharePayload = {
      groupId,
      exp: Date.now() + TOKEN_TTL_MS,
    };

    const token = buildToken(payload);
    const base = (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const shareUrl = `${base}/shared/${token}`;

    res.status(200).json({
      ok: true,
      token,
      shareUrl,
      expiresAt: new Date(payload.exp).toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/shared/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.params.token;
    const payload = parseToken(token);

    const { data: group, error: groupError } = await supabase
      .from('grupos_viaje')
      .select('id, nombre, destino, destino_formatted_address, fecha_inicio, fecha_fin')
      .eq('id', payload.groupId)
      .maybeSingle();

    if (groupError) throw new Error(groupError.message);
    if (!group) {
      res.status(404).json({ ok: false, error: 'Grupo no encontrado' });
      return;
    }

    const { data: rows, error: itineraryError } = await supabase
      .from('actividades')
      .select('id_actividad, titulo, descripcion, fecha_inicio, fecha_fin, ubicacion, estado, itinerarios!inner(grupo_id)')
      .eq('itinerarios.grupo_id', payload.groupId)
      .in('estado', ['pendiente', 'confirmada'])
      .order('fecha_inicio', { ascending: true });

    if (itineraryError) throw new Error(itineraryError.message);

    const activities = (rows ?? []).filter((row) => {
      const start = row.fecha_inicio ? new Date(String(row.fecha_inicio)) : null;
      const groupStart = group.fecha_inicio ? new Date(`${group.fecha_inicio}T00:00:00.000Z`) : null;
      const groupEnd = group.fecha_fin ? new Date(`${group.fecha_fin}T23:59:59.999Z`) : null;
      if (!start || !groupStart || !groupEnd) return true;
      return start >= groupStart && start <= groupEnd;
    }).map((row) => ({
      id: row.id_actividad,
      title: row.titulo,
      description: row.descripcion,
      location: row.ubicacion,
      status: row.estado,
      startsAt: row.fecha_inicio,
      endsAt: row.fecha_fin,
      day: row.fecha_inicio ? normalizeDay(String(row.fecha_inicio)) : null,
    }));

    res.status(200).json({
      ok: true,
      group,
      itinerary: activities,
      tokenMeta: {
        expiresAt: new Date(payload.exp).toISOString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

export default router;
