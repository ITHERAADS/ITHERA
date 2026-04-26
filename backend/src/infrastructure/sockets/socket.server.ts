import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { supabase } from '../db/supabase.client';
import { env } from '../../config/env';
import { registerSocketHandlers } from './socket.handlers';

/**
 * Interfaz extendida para socket.data
 * Inyectada por el middleware de autenticación.
 */
export interface SocketUserData {
  authUserId: string;   // UUID de Supabase Auth
  localUserId: string;  // id_usuario de tabla usuarios
  userName: string;      // nombre del usuario
}

// Instancia global de Socket.IO (accesible para gateway y scheduler)
let io: SocketIOServer | null = null;

export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.IO no ha sido inicializado');
  return io;
};

/**
 * Inicializa el servidor Socket.IO sobre el httpServer existente.
 * Configura CORS y middleware de autenticación JWT de Supabase.
 */
export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        const isAllowed =
          origin === env.FRONTEND_URL ||
          origin === 'http://localhost:5173' ||
          origin.endsWith('.vercel.app');

        if (isAllowed) {
          return callback(null, true);
        }

        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Heartbeat: ping cada 25s, timeout a los 60s
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // ── Middleware de Autenticación ──────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Token no proporcionado'));
      }

      // Quitar prefijo "Bearer " si lo envían
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

      // Validar contra Supabase Auth
      const { data, error } = await supabase.auth.getUser(cleanToken);

      if (error || !data?.user) {
        return next(new Error('Token inválido o expirado'));
      }

      // Obtener id_usuario local y nombre
      const { data: localUser, error: localError } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre')
        .eq('auth_user_id', data.user.id)
        .single();

      if (localError || !localUser) {
        return next(new Error('Usuario no encontrado en tabla local'));
      }

      // Inyectar datos en socket.data
      socket.data = {
        authUserId: data.user.id,
        localUserId: String(localUser.id_usuario),
        userName: localUser.nombre ?? 'Usuario',
      } as SocketUserData;

      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de autenticación';
      next(new Error(message));
    }
  });

  // ── Registro de Handlers ────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userData = socket.data as SocketUserData;
    console.log(`[socket.io] Conectado: ${userData.userName} (${userData.localUserId}) — socket: ${socket.id}`);

    registerSocketHandlers(io!, socket);

    socket.on('error', (err) => {
      console.error(`[socket.io] Error en socket ${socket.id}:`, err.message);
    });
  });

  console.log('[socket.io] Servidor Socket.IO inicializado');
  return io;
};
