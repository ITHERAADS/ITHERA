import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as AuthService from '../domain/auth/auth.service';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      name,
      lastNamePaterno,
      lastNameMaterno,
    } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      lastNamePaterno?: string;
      lastNameMaterno?: string;
    };

    if (!email || !password || !name || !lastNamePaterno || !lastNameMaterno) {
      res.status(400).json({
        ok: false,
        error: 'Todos los campos son obligatorios',
      });
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        ok: false,
        error: 'El correo no tiene un formato válido',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        ok: false,
        error: 'La contraseña debe tener al menos 6 caracteres',
      });
      return;
    }

    const { data, error } = await AuthService.signUpUser({
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
      lastNamePaterno: lastNamePaterno.trim(),
      lastNameMaterno: lastNameMaterno.trim(),
    });

    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(201).json({
      ok: true,
      message:
        data.session
          ? 'Usuario registrado correctamente'
          : 'Cuenta creada. Revisa tu correo para confirmar tu cuenta.',
      data,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({
      ok: false,
      error: 'Error interno del servidor',
      details: msg,
    });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({
        ok: false,
        error: 'Email y password son requeridos',
      });
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        ok: false,
        error: 'El correo no tiene un formato válido',
      });
      return;
    }

    const { data, error } = await AuthService.signInUser({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const rawMessage = error.message?.toLowerCase?.() ?? '';
      const rawCode = (error as any)?.code ?? '';

      if (rawCode === 'email_not_confirmed' || rawMessage.includes('email not confirmed')) {
        res.status(401).json({
          ok: false,
          error: 'Debes confirmar tu correo antes de iniciar sesión',
        });
        return;
      }

      res.status(401).json({
        ok: false,
        error: 'Correo o contraseña incorrectos',
        details: error.message,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: 'Login correcto',
      session: data.session,
      user: data.user,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({
      ok: false,
      error: 'Error interno del servidor',
      details: msg,
    });
  }
});

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({
        ok: false,
        error: 'El correo es obligatorio',
      });
      return;
    }

    const { error } = await AuthService.forgotPassword({ email });

    if (error) {
      res.status(400).json({
        ok: false,
        error: error.message,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message:
        'Si el correo existe, se enviará un enlace para restablecer la contraseña.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({
      ok: false,
      error: 'Error interno del servidor',
      details: msg,
    });
  }
});

router.post('/sync-user', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ ok: false, error: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: savedUser, error: dbError } = await AuthService.syncUserToLocal(token);

    if (dbError) {
      res.status(500).json({
        ok: false,
        error: 'Error al sincronizar usuario',
        details: dbError.message,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: 'Usuario sincronizado correctamente',
      user: savedUser,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    const statusCode =
      err instanceof Error && 'statusCode' in err
        ? Number((err as any).statusCode)
        : 500;

    res.status(statusCode).json({ ok: false, error: msg });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await AuthService.getUserByAuthId(req.user!.id);

    if (error) {
      res.status(404).json({
        ok: false,
        error: 'Usuario no encontrado en tabla local',
      });
      return;
    }

    res.status(200).json({ ok: true, user: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({
      ok: false,
      error: 'Error interno del servidor',
      details: msg,
    });
  }
});

export default router;