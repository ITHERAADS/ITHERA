import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[ErrorHandler]', err.stack);
  res.status(500).json({
    ok: false,
    error: 'Error interno del servidor',
    details: err.message,
  });
};