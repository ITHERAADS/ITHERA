import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  uploadDocument,
  getDocumentsByTrip,
  deleteDocument,
} from '../domain/documents/documents.service';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '../domain/documents/documents.entity';

const router = Router({ mergeParams: true });

const resolveTripId = (req: Request): string | null =>
  req.params.tripId ?? req.params.groupId ?? null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  },
});

const parsePersonReferences = (value: unknown): string[] | null => {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item) => String(item));
  } catch {
    return null;
  }
};

const parseBoolean = (value: unknown): boolean => {
  return String(value ?? '').toLowerCase() === 'true';
};

const uploadHandler = async (req: Request, res: Response) => {
  try {
    const tripId = resolveTripId(req);
    const userId = req.user?.id;
    const category = req.body.category || 'otro';

    if (!tripId) return res.status(400).json({ ok: false, error: 'tripId/groupId es requerido' });
    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'No se recibio archivo' });

    const metadata = {
      linked_entity_type: req.body.linked_entity_type || null,
      linked_entity_id: req.body.linked_entity_id || null,
      person_reference: req.body.person_reference || null,
      person_references: parsePersonReferences(req.body.person_references),
      expense_reason: req.body.expense_reason || null,
      expense_amount: req.body.expense_amount ? Number(req.body.expense_amount) : null,
      notes: req.body.notes || null,
      immutable: parseBoolean(req.body.immutable),
      immutable_kind: req.body.immutable_kind || null,
      receipt_debtor_user_id: req.body.receipt_debtor_user_id || null,
      receipt_creditor_user_id: req.body.receipt_creditor_user_id || null,
      receipt_folio: req.body.receipt_folio || null,
    };

    const doc = await uploadDocument({
      tripId,
      userId,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      category,
      metadata,
    });

    res.status(201).json({ ok: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const listHandler = async (req: Request, res: Response) => {
  try {
    const tripId = resolveTripId(req);
    const userId = req.user?.id;
    if (!tripId) return res.status(400).json({ ok: false, error: 'tripId/groupId es requerido' });
    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });

    const docs = await getDocumentsByTrip(tripId, userId);
    res.json({ ok: true, documents: docs });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const deleteHandler = async (req: Request, res: Response) => {
  try {
    const tripId = resolveTripId(req);
    const docId = req.params.docId;
    const userId = req.user?.id;
    if (!tripId) return res.status(400).json({ ok: false, error: 'tripId/groupId es requerido' });
    if (!docId) return res.status(400).json({ ok: false, error: 'docId es requerido' });
    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });

    await deleteDocument(docId, tripId, userId);
    res.json({ ok: true, message: 'Documento eliminado' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

router.post('/:tripId', requireAuth, upload.single('file'), uploadHandler);
router.get('/:tripId', requireAuth, listHandler);
router.delete('/:tripId/:docId', requireAuth, deleteHandler);

// Compatibilidad para /api/groups/:groupId/documents y /api/groups/:groupId/vault
router.post('/', requireAuth, upload.single('file'), uploadHandler);
router.get('/', requireAuth, listHandler);
router.delete('/:docId', requireAuth, deleteHandler);

export default router;
