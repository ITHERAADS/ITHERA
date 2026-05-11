import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  createContextLink,
  deleteContextLink,
  getContextLinkOptions,
  listContextLinks,
} from '../domain/context-links/context-links.service';
import { ContextEntityType } from '../domain/context-links/context-links.entity';

const router = Router({ mergeParams: true });

const statusCode = (error: unknown): number => {
  const status = (error as { statusCode?: number })?.statusCode;
  return typeof status === 'number' ? status : 500;
};

const handleError = (res: Response, err: unknown, fallback: string) => {
  res.status(statusCode(err)).json({
    ok: false,
    error: err instanceof Error ? err.message : fallback,
  });
};

const requireGroupId = (req: Request, res: Response): string | null => {
  const groupId = req.params.groupId;
  if (!groupId) {
    res.status(400).json({ ok: false, error: 'groupId es requerido' });
    return null;
  }
  return String(groupId);
};

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;

    const entityType = req.query.entity_type ? String(req.query.entity_type) as ContextEntityType : undefined;
    const entityId = req.query.entity_id ? String(req.query.entity_id) : undefined;
    const links = await listContextLinks(
      req.user!.id,
      groupId,
      entityType && entityId ? { type: entityType, id: entityId } : undefined,
    );

    res.status(200).json({ ok: true, links });
  } catch (err) {
    handleError(res, err, 'Error al obtener relaciones');
  }
});

router.get('/options', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;

    const options = await getContextLinkOptions(req.user!.id, groupId);
    res.status(200).json({ ok: true, options });
  } catch (err) {
    handleError(res, err, 'Error al obtener opciones relacionadas');
  }
});

router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;

    const link = await createContextLink(req.user!.id, groupId, req.body);
    res.status(201).json({ ok: true, link });
  } catch (err) {
    handleError(res, err, 'Error al crear relacion');
  }
});

router.delete('/:linkId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;

    const result = await deleteContextLink(req.user!.id, groupId, req.params.linkId);
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err, 'Error al eliminar relacion');
  }
});

export default router;
