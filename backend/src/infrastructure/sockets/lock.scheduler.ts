import { Server as SocketIOServer } from 'socket.io';
import { env } from '../../config/env';
import * as LockService from '../../domain/proposals/lock.service';

const SCHEDULER_INTERVAL_MS = 60_000; // Cada 60 segundos

/**
 * Inicia el scheduler que limpia bloqueos huérfanos.
 * 
 * Un bloqueo es "huérfano" si tiene más de LOCK_TTL_MINUTES minutos
 * de antigüedad — esto puede pasar si:
 * - El socket falló silenciosamente
 * - El servidor se reinició sin limpiar
 * - Un bug impidió el onDisconnect
 */
export const startLockScheduler = (io: SocketIOServer): void => {
  const ttl = env.LOCK_TTL_MINUTES;

  console.log(`[lock-scheduler] Iniciado. TTL: ${ttl} minutos. Intervalo: ${SCHEDULER_INTERVAL_MS / 1000}s`);

  const cleanup = async () => {
    try {
      const released = await LockService.cleanExpiredLocks(ttl);

      // Notificar a cada room afectada
      for (const lock of released) {
        io.to(lock.grupoId).emit('item_unlocked', {
          propuestaId: lock.propuestaId,
        });
      }

      if (released.length > 0) {
        console.log(`[lock-scheduler] ${released.length} bloqueo(s) huérfano(s) limpiado(s)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[lock-scheduler] Error en limpieza:', message);
    }
  };

  setInterval(cleanup, SCHEDULER_INTERVAL_MS);
};
