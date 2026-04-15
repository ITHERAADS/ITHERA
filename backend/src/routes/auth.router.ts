import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as AuthService from '../domain/auth/auth.service';

const router = Router();

// POST /api/auth/test-signup
router.post('/test-signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, nombre } = req.body as { email?: string; password?: string; nombre?: string };
    if (!email || !password) {
      res.status(400).json({ ok: false, error: 'Email y password son requeridos' });
      return;
    }
    const { data, error } = await AuthService.signUpUser({ email, password, nombre });
    if (error) { res.status(400).json({ ok: false, error: error.message }); return; }
    res.status(201).json({ ok: true, message: 'Usuario registrado en Supabase Auth', data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error interno del servidor', details: msg });
  }
});

// POST /api/auth/test-login
router.post('/test-login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ ok: false, error: 'Email y password son requeridos' });
      return;
    }
    const { data, error } = await AuthService.signInUser({ email, password });
    if (error) { res.status(401).json({ ok: false, error: error.message }); return; }
    res.status(200).json({ ok: true, message: 'Login correcto', session: data.session, user: data.user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error interno del servidor', details: msg });
  }
});

// POST /api/auth/sync-user
router.post('/sync-user', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ ok: false, error: 'Token no proporcionado' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const { data: savedUser, error: dbError } = await AuthService.syncUserToLocal(token);
    if (dbError) { res.status(500).json({ ok: false, error: 'Error al sincronizar usuario', details: dbError.message }); return; }
    res.status(200).json({ ok: true, message: 'Usuario sincronizado correctamente', user: savedUser });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(err instanceof Error && 'statusCode' in err ? (err as any).statusCode : 500, ).json({ ok: false, error: msg });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await AuthService.getUserByAuthId(req.user!.id);
    if (error) { res.status(404).json({ ok: false, error: 'Usuario no encontrado en tabla local' }); return; }
    res.status(200).json({ ok: true, user: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ ok: false, error: 'Error interno del servidor', details: msg });
  }
});

export default router;