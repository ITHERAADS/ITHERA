import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as AuthService from '../domain/auth/auth.service';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRICT_EMAIL_REGEX = /^(?!.*\.\.)(?!\.)[A-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@(?!-)(?=.{1,253}$)(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,24}$/i;
const COMMON_EMAIL_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
];

function getForgotPasswordEmailError(email?: string): string | null {
  const normalizedEmail = email?.trim().toLowerCase() ?? '';

  if (!normalizedEmail) {
    return 'El correo es obligatorio';
  }

  if (!STRICT_EMAIL_REGEX.test(normalizedEmail)) {
    return 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).';
  }

  const domain = normalizedEmail.split('@')[1] ?? '';
  const labels = domain.split('.');
  const rootDomain = labels.slice(-2).join('.');

  const possibleCommonDomainTypo = COMMON_EMAIL_DOMAINS.find((validDomain) => {
    const validLabel = validDomain.split('.')[0];
    const currentLabel = rootDomain.split('.')[0];

    return (
      rootDomain !== validDomain &&
      rootDomain.endsWith(`.${validDomain.split('.')[validDomain.split('.').length - 1]}`) &&
      currentLabel.includes(validLabel)
    );
  });

  if (possibleCommonDomainTypo) {
    return `Revisa el dominio del correo. ¿Quisiste escribir ${possibleCommonDomainTypo}?`;
  }

  return null;
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
    const normalizedEmail = email?.trim().toLowerCase() ?? '';
    const emailValidationError = getForgotPasswordEmailError(email);

    if (emailValidationError) {
      res.status(400).json({
        ok: false,
        code: 'ERR-14-004',
        error: emailValidationError,
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
      code: 'ERR-14-001',
      message:
        'Si existe una cuenta con ese correo, recibirás un enlace en breve. Revisa tu bandeja de entrada y carpeta de spam.',
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

export default router;
