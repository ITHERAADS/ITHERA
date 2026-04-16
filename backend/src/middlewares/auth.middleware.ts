import { Request, Response, NextFunction } from 'express';
import { supabase } from '../infrastructure/db/supabase.client';
import { User } from '@supabase/supabase-js';

// Extender el tipo Request de Express para incluir user y accessToken
declare global {
  namespace Express {
    interface Request {
      user?: User;
      accessToken?: string;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ ok: false, error: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
      return;
    }

    req.user = data.user;
    req.accessToken = token;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({
      ok: false,
      error: 'Error al validar autenticación',
      details: message,
    });
  }
};