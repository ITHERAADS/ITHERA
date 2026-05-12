import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as AuthService from '../domain/auth/auth.service';
const EMAIL_REGEX = /^(?!.*\.\.)(?!.*@.*\.\.)(?!.*@-)(?!.*-\.)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const PASSWORD_REGEX = /^(?=.*[a-záéíóúñ])(?=.*[A-ZÁÉÍÓÚÑ])(?=.*\d).{8,}$/;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000;

type LoginAttemptState = {
  failedAttempts: number;
  lockedUntil: number | null;
};

const loginAttempts = new Map<string, LoginAttemptState>();

function getLoginAttemptKey(email: string, req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  return `${email.trim().toLowerCase()}::${ip}`;
}

function getRemainingLockSeconds(state?: LoginAttemptState): number {
  if (!state?.lockedUntil) return 0;

  const remainingMs = state.lockedUntil - Date.now();

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
}

function clearExpiredLoginLock(key: string, state?: LoginAttemptState): void {
  if (!state?.lockedUntil) return;

  if (state.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
  }
}

const multer = require('multer');

type MulterFile = AuthService.UploadedAvatarFile;
type RequestWithFile = Request & { file?: MulterFile };

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req: Request, file: MulterFile, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten imágenes'));
      return;
    }

    cb(null, true);
  },
});

router.get('/email-availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.query.email ?? '').trim().toLowerCase();

    if (!email) {
      res.status(400).json({
        ok: false,
        code: 'ERR-14-004',
        error: 'Ingresa tu correo electrónico.',
      });
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({
        ok: false,
        code: 'ERR-14-004',
        error: 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).',
      });
      return;
    }

    const { data, error } = await AuthService.findUserByEmail(email);

    if (error) {
      res.status(500).json({
        ok: false,
        error: 'No se pudo verificar la disponibilidad del correo',
        details: error.message,
      });
      return;
    }

    if (data) {
      res.status(409).json({
        ok: false,
        available: false,
        code: 'ERR-12-004',
        error: 'Ese correo ya está asociado a una cuenta activa. ¿Deseas iniciar sesión?',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      available: true,
      message: 'Correo disponible.',
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
        code: 'ERR-23-001',
        error: 'Completa todos los campos requeridos para continuar.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({
        ok: false,
        code: 'ERR-14-004',
        error: 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).',
      });
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      res.status(400).json({
        ok: false,
        code: 'ERR-12-006',
        error: 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.',
      });
      return;
    }

    const { data: existingUser, error: emailLookupError } = await AuthService.findUserByEmail(normalizedEmail);

    if (emailLookupError) {
      res.status(500).json({
        ok: false,
        error: 'No se pudo verificar la disponibilidad del correo',
        details: emailLookupError.message,
      });
      return;
    }

    if (existingUser) {
      res.status(409).json({
        ok: false,
        code: 'ERR-12-004',
        error: 'Ese correo ya está asociado a una cuenta activa. ¿Deseas iniciar sesión?',
      });
      return;
    }

    const fallbackName = normalizedEmail.split('@')[0] || 'Usuario';

    const { data, error } = await AuthService.signUpUser({
      email: normalizedEmail,
      password,
      name: name?.trim() || fallbackName,
      lastNamePaterno: lastNamePaterno?.trim() || '',
      lastNameMaterno: lastNameMaterno?.trim() || '',
    });

    if (error) {
      const rawMessage = error.message?.toLowerCase?.() ?? '';

      if (rawMessage.includes('already registered') || rawMessage.includes('already exists') || rawMessage.includes('user already')) {
        res.status(409).json({
          ok: false,
          code: 'ERR-12-004',
          error: 'Ese correo ya está asociado a una cuenta activa. ¿Deseas iniciar sesión?',
        });
        return;
      }

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
        code: 'ERR-23-001',
        error: 'Todos los campos son obligatorios',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({
        ok: false,
        code: 'ERR-14-004',
        error: 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).',
      });
      return;
    }

    const attemptKey = getLoginAttemptKey(normalizedEmail, req);
    const currentAttemptState = loginAttempts.get(attemptKey);
    clearExpiredLoginLock(attemptKey, currentAttemptState);

    const activeAttemptState = loginAttempts.get(attemptKey);
    const remainingLockSeconds = getRemainingLockSeconds(activeAttemptState);

    if (remainingLockSeconds > 0) {
      res.status(429).json({
        ok: false,
        code: 'ERR-11-003',
        error: 'Por seguridad, tu acceso ha sido pausado por 5 minutos. Inténtalo de nuevo más tarde.',
        retryAfterSeconds: remainingLockSeconds,
        lockedUntil: new Date(activeAttemptState?.lockedUntil ?? Date.now()).toISOString(),
      });
      return;
    }

    const { data, error } = await AuthService.signInUser({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const rawMessage = error.message?.toLowerCase?.() ?? '';
      const rawCode = (error as any)?.code ?? '';

      if (rawCode === 'email_not_confirmed' || rawMessage.includes('email not confirmed')) {
        res.status(401).json({
          ok: false,
          code: 'ERR-11-002',
          error: 'No encontramos una cuenta activa con ese correo. ¿Deseas registrarte?',
        });
        return;
      }

      const previousState = loginAttempts.get(attemptKey) ?? {
        failedAttempts: 0,
        lockedUntil: null,
      };

      const failedAttempts = previousState.failedAttempts + 1;

      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = Date.now() + LOGIN_LOCK_MS;

        loginAttempts.set(attemptKey, {
          failedAttempts,
          lockedUntil,
        });

        res.status(429).json({
          ok: false,
          code: 'ERR-11-003',
          error: 'Por seguridad, tu acceso ha sido pausado por 5 minutos. Inténtalo de nuevo más tarde.',
          retryAfterSeconds: Math.ceil(LOGIN_LOCK_MS / 1000),
          lockedUntil: new Date(lockedUntil).toISOString(),
        });
        return;
      }

      loginAttempts.set(attemptKey, {
        failedAttempts,
        lockedUntil: null,
      });

      res.status(401).json({
        ok: false,
        code: 'ERR-11-001',
        error: 'Las credenciales son incorrectas. Verifica tu correo y contraseña.',
        remainingAttempts: MAX_LOGIN_ATTEMPTS - failedAttempts,
      });
      return;
    }

    loginAttempts.delete(attemptKey);

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
        code: 'ERR-14-004',
        error: 'Ingresa tu correo electrónico.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({
        ok: false,
        code: 'ERR-14-004',
        error: 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).',
      });
      return;
    }

    const { error } = await AuthService.forgotPassword({ email: normalizedEmail });

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

router.patch('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      name,
      apellido_paterno,
      apellido_materno,
      lastNamePaterno,
      lastNameMaterno,
    } = req.body as {
      nombre?: string;
      name?: string;
      apellido_paterno?: string;
      apellido_materno?: string;
      lastNamePaterno?: string;
      lastNameMaterno?: string;
    };

    const finalName = [
      nombre ?? name,
      apellido_paterno ?? lastNamePaterno,
      apellido_materno ?? lastNameMaterno,
    ]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean)
      .join(' ');

    if (!finalName) {
      res.status(400).json({ ok: false, error: 'El nombre es requerido' });
      return;
    }

    const { data, error } = await AuthService.updateUserByAuthId(req.user!.id, {
      nombre: finalName,
    });

    if (error) {
      res.status(400).json({
        ok: false,
        error: 'No se pudo actualizar el perfil',
        details: error.message,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: 'Perfil actualizado correctamente',
      user: data,
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

router.patch(
  '/me/avatar',
  requireAuth,
  upload.single('avatar'),
  async (req: RequestWithFile, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          ok: false,
          error: 'La imagen es requerida',
        });
        return;
      }

      const { data, error } = await AuthService.updateUserAvatarByAuthId(
        req.user!.id,
        req.file
      );

      if (error) {
        res.status(400).json({
          ok: false,
          error: 'No se pudo actualizar la imagen de perfil',
          details: error.message,
        });
        return;
      }

      res.status(200).json({
        ok: true,
        message: 'Imagen de perfil actualizada correctamente',
        user: data,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';

      res.status(500).json({
        ok: false,
        error: 'Error interno del servidor',
        details: msg,
      });
    }
  }
);

router.delete(
  '/me/avatar',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { data, error } = await AuthService.deleteUserAvatarByAuthId(
        req.user!.id
      );

      if (error) {
        res.status(400).json({
          ok: false,
          error: 'No se pudo eliminar la imagen de perfil',
          details: error.message,
        });
        return;
      }

      res.status(200).json({
        ok: true,
        message: 'Imagen de perfil eliminada correctamente',
        user: data,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';

      res.status(500).json({
        ok: false,
        error: 'Error interno del servidor',
        details: msg,
      });
    }
  }
);

router.delete(
  '/me',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { data, error } = await AuthService.deleteAccountByAuthId(req.user!.id);

      if (error) {
        res.status(400).json({
          ok: false,
          error: 'No se pudo eliminar la cuenta',
          details: error.message,
        });
        return;
      }

      res.status(200).json({
        ok: true,
        message: 'Cuenta eliminada correctamente',
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
  }
);

export default router;
