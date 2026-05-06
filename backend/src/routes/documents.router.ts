import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  uploadDocument,
  getDocumentsByTrip,
  deleteDocument,
} from '../domain/documents/documents.service';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '../domain/documents/documents.entity';

const router = Router();

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

// POST: Subir documento
router.post('/:tripId', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id; // Usar ID real del token
    const category = req.body.category || 'otro';

    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'No se recibió archivo' });

    const doc = await uploadDocument({
      tripId,
      userId,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      category,
    });

    res.status(201).json({ ok: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET: Listar documentos
router.get('/:tripId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });

    const docs = await getDocumentsByTrip(tripId, userId);
    res.json({ ok: true, documents: docs });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE: Eliminar documento
router.delete('/:tripId/:docId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tripId, docId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });

    await deleteDocument(docId, tripId, userId);
    res.json({ ok: true, message: 'Documento eliminado' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
