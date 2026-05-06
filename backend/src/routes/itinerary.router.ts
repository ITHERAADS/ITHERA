import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as ItineraryService from '../domain/itinerary/itinerary.service';
import * as SubgroupScheduleService from '../domain/itinerary/subgroup-schedule.service';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;

    if (!groupId) {
      res.status(400).json({ ok: false, error: 'groupId inválido' });
      return;
    }

    const result = await ItineraryService.getGroupItinerary(req.user!.id, groupId);

    res.status(200).json({
      ok: true,
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;

    res.status(status).json({
      ok: false,
      error: msg,
    });
  }
});

router.post('/activities', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;

    if (!groupId) {
      res.status(400).json({ ok: false, error: 'groupId inválido' });
      return;
    }

    const {
      titulo,
      descripcion,
      ubicacion,
      latitud,
      longitud,
      fecha_inicio,
      fecha_fin,
      referencia_externa,
      fuente,
      payload,
    } = req.body as {
      titulo?: string;
      descripcion?: string | null;
      ubicacion?: string | null;
      latitud?: number | null;
      longitud?: number | null;
      fecha_inicio?: string | null;
      fecha_fin?: string | null;
      referencia_externa?: string | null;
      fuente?: string | null;
      payload?: Record<string, unknown> | null;
    };

    if (!titulo?.trim()) {
      res.status(400).json({ ok: false, error: 'titulo es requerido' });
      return;
    }

    const activity = await ItineraryService.createGroupActivity(req.user!.id, groupId, {
      titulo: titulo.trim(),
      descripcion: descripcion ?? null,
      ubicacion: ubicacion ?? null,
      latitud: latitud ?? null,
      longitud: longitud ?? null,
      fecha_inicio: fecha_inicio ?? null,
      fecha_fin: fecha_fin ?? null,
      referencia_externa: referencia_externa ?? null,
      fuente: fuente ?? 'google_maps',
      payload: payload ?? null,
    });

    res.status(201).json({
      ok: true,
      message: 'Actividad creada correctamente',
      activity,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;

    res.status(status).json({
      ok: false,
      error: msg,
    });
  }
});

router.patch('/activities/:activityId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;
    const activityId = req.params.activityId;

    if (!groupId || !activityId) {
      res.status(400).json({ ok: false, error: 'groupId y activityId son requeridos' });
      return;
    }

    const activity = await ItineraryService.updateGroupActivity(
      req.user!.id,
      groupId,
      activityId,
      req.body
    );

    res.status(200).json({
      ok: true,
      message: 'Actividad actualizada correctamente',
      activity,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;

    res.status(status).json({
      ok: false,
      error: msg,
    });
  }
});


router.delete('/activities/:activityId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;
    const activityId = req.params.activityId;

    if (!groupId || !activityId) {
      res.status(400).json({ ok: false, error: 'groupId y activityId son requeridos' });
      return;
    }

    await ItineraryService.deleteGroupActivity(req.user!.id, groupId, activityId);

    res.status(200).json({ ok: true, message: 'Actividad eliminada correctamente' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.get('/subgroups/schedule', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;
    if (!groupId) {
      res.status(400).json({ ok: false, error: 'groupId inválido' });
      return;
    }
    const result = await SubgroupScheduleService.getSubgroupSchedule(req.user!.id, groupId);
    res.status(200).json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.post('/subgroups/slots', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;
    if (!groupId) {
      res.status(400).json({ ok: false, error: 'groupId inválido' });
      return;
    }
    const { title, description, starts_at, ends_at } = req.body as {
      title?: string;
      description?: string | null;
      starts_at?: string;
      ends_at?: string;
    };
    if (!title?.trim() || !starts_at || !ends_at) {
      res.status(400).json({ ok: false, error: 'title, starts_at y ends_at son requeridos' });
      return;
    }
    const slot = await SubgroupScheduleService.createSlot(req.user!.id, groupId, {
      title: title.trim(),
      description: description ?? null,
      starts_at,
      ends_at,
    });
    res.status(201).json({ ok: true, slot });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.patch('/subgroups/slots/:slotId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, slotId } = req.params;
    if (!groupId || !slotId) {
      res.status(400).json({ ok: false, error: 'groupId y slotId son requeridos' });
      return;
    }
    const slot = await SubgroupScheduleService.updateSlot(req.user!.id, groupId, slotId, req.body);
    res.status(200).json({ ok: true, slot });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.delete('/subgroups/slots/:slotId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, slotId } = req.params;
    if (!groupId || !slotId) {
      res.status(400).json({ ok: false, error: 'groupId y slotId son requeridos' });
      return;
    }
    await SubgroupScheduleService.deleteSlot(req.user!.id, groupId, slotId);
    res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.post('/subgroups/slots/:slotId/groups', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, slotId } = req.params;
    const { name, description } = req.body as { name?: string; description?: string | null };
    if (!groupId || !slotId) {
      res.status(400).json({ ok: false, error: 'groupId y slotId son requeridos' });
      return;
    }
    if (!name?.trim()) {
      res.status(400).json({ ok: false, error: 'name es requerido' });
      return;
    }
    const subgroup = await SubgroupScheduleService.createSubgroup(req.user!.id, groupId, slotId, {
      name: name.trim(),
      description: description ?? null,
    });
    res.status(201).json({ ok: true, subgroup });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.patch('/subgroups/slots/:slotId/groups/:subgroupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, slotId, subgroupId } = req.params;
    if (!groupId || !slotId || !subgroupId) {
      res.status(400).json({ ok: false, error: 'groupId, slotId y subgroupId son requeridos' });
      return;
    }
    const subgroup = await SubgroupScheduleService.updateSubgroup(req.user!.id, groupId, slotId, subgroupId, req.body);
    res.status(200).json({ ok: true, subgroup });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.delete('/subgroups/slots/:slotId/groups/:subgroupId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, slotId, subgroupId } = req.params;
    if (!groupId || !slotId || !subgroupId) {
      res.status(400).json({ ok: false, error: 'groupId, slotId y subgroupId son requeridos' });
      return;
    }
    await SubgroupScheduleService.deleteSubgroup(req.user!.id, groupId, slotId, subgroupId);
    res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.post('/subgroups/slots/:slotId/join', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, slotId } = req.params;
    const { subgroupId } = req.body as { subgroupId?: string | null };
    if (!groupId || !slotId) {
      res.status(400).json({ ok: false, error: 'groupId y slotId son requeridos' });
      return;
    }
    const membership = await SubgroupScheduleService.joinSubgroup(
      req.user!.id,
      groupId,
      slotId,
      subgroupId ?? null,
    );
    res.status(200).json({ ok: true, membership });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.post('/subgroups/slots/:slotId/groups/:subgroupId/activities', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, slotId, subgroupId } = req.params;
    const { title, description, location, starts_at, ends_at } = req.body as {
      title?: string;
      description?: string | null;
      location?: string | null;
      starts_at?: string | null;
      ends_at?: string | null;
    };
    if (!groupId || !slotId || !subgroupId) {
      res.status(400).json({ ok: false, error: 'groupId, slotId y subgroupId son requeridos' });
      return;
    }
    if (!title?.trim()) {
      res.status(400).json({ ok: false, error: 'title es requerido' });
      return;
    }
    const activity = await SubgroupScheduleService.createSubgroupActivity(req.user!.id, groupId, slotId, subgroupId, {
      title: title.trim(),
      description: description ?? null,
      location: location ?? null,
      starts_at: starts_at ?? null,
      ends_at: ends_at ?? null,
    });
    res.status(201).json({ ok: true, activity });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.patch('/subgroups/slots/:slotId/activities/:activityId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, slotId, activityId } = req.params;
    if (!groupId || !slotId || !activityId) {
      res.status(400).json({ ok: false, error: 'groupId, slotId y activityId son requeridos' });
      return;
    }
    const activity = await SubgroupScheduleService.updateSubgroupActivity(req.user!.id, groupId, slotId, activityId, req.body);
    res.status(200).json({ ok: true, activity });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

router.delete('/subgroups/slots/:slotId/activities/:activityId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, slotId, activityId } = req.params;
    if (!groupId || !slotId || !activityId) {
      res.status(400).json({ ok: false, error: 'groupId, slotId y activityId son requeridos' });
      return;
    }
    await SubgroupScheduleService.deleteSubgroupActivity(req.user!.id, groupId, slotId, activityId);
    res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ ok: false, error: msg });
  }
});
export default router;
