import { Server as SocketIOServer, Socket } from 'socket.io';
import { supabase } from '../db/supabase.client';
import { SocketUserData } from './socket.server';
import * as LockService from '../../domain/proposals/lock.service';

// ── Tipos de eventos ─────────────────────────────────────────────────────

interface JoinRoomPayload {
  tripId: string;
}

interface LeaveRoomPayload {
  tripId: string;
}

interface ItemLockPayload {
  propuestaId: string;
  tripId: string;
}

interface ItemUnlockPayload {
  propuestaId: string;
  tripId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const getUserData = (socket: Socket): SocketUserData => {
  return socket.data as SocketUserData;
};

/**
 * Valida que el usuario pertenezca al grupo/viaje indicado.
 */
const validateMembership = async (userId: string, tripId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('grupo_miembros')
    .select('id')
    .eq('grupo_id', tripId)
    .eq('usuario_id', userId)
    .maybeSingle();

  return !error && !!data;
};

// ── Handler Registration ─────────────────────────────────────────────────

export const registerSocketHandlers = (io: SocketIOServer, socket: Socket): void => {
  const user = getUserData(socket);

  // ── join_room ────────────────────────────────────────────────────────
  socket.on('join_room', async (payload: JoinRoomPayload) => {
    try {
      const { tripId } = payload;

      if (!tripId) {
        socket.emit('error_event', { message: 'tripId es requerido' });
        return;
      }

      // Validar membresía al grupo
      const isMember = await validateMembership(user.localUserId, tripId);
      if (!isMember) {
        socket.emit('error_event', { message: 'No perteneces a este viaje' });
        return;
      }

      socket.join(tripId);
      console.log(`[socket.io] ${user.userName} se unió a room: ${tripId}`);

      // Notificar al usuario que se unió exitosamente
      socket.emit('room_joined', { tripId });

      // Notificar a los demás que un usuario se conectó
      socket.to(tripId).emit('user_joined', {
        userId: user.localUserId,
        userName: user.userName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al unirse a la room';
      console.error(`[socket.io] Error en join_room:`, message);
      socket.emit('error_event', { message });
    }
  });

  // ── leave_room ───────────────────────────────────────────────────────
  socket.on('leave_room', async (payload: LeaveRoomPayload) => {
    try {
      const { tripId } = payload;
      if (!tripId) return;

      socket.leave(tripId);
      console.log(`[socket.io] ${user.userName} salió de room: ${tripId}`);

      socket.to(tripId).emit('user_left', {
        userId: user.localUserId,
        userName: user.userName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al salir de la room';
      console.error(`[socket.io] Error en leave_room:`, message);
    }
  });

  // ── item_lock ────────────────────────────────────────────────────────
  socket.on('item_lock', async (payload: ItemLockPayload) => {
    try {
      const { propuestaId, tripId } = payload;

      if (!propuestaId || !tripId) {
        socket.emit('lock_error', { propuestaId, message: 'propuestaId y tripId son requeridos' });
        return;
      }

      // Validar que el usuario pertenece a este viaje
      const isMember = await validateMembership(user.localUserId, tripId);
      if (!isMember) {
        socket.emit('lock_error', { propuestaId, message: 'No perteneces a este viaje' });
        return;
      }

      // Validar que la propuesta pertenece a este grupo
      const belongs = await LockService.validateProposalBelongsToGroup(propuestaId, tripId);
      if (!belongs) {
        socket.emit('lock_error', { propuestaId, message: 'La propuesta no pertenece a este viaje' });
        return;
      }

      const result = await LockService.acquireLock(propuestaId, user.localUserId);

      if (result.success) {
        // Confirmar al solicitante
        socket.emit('lock_acquired', { propuestaId });

        // Broadcast a toda la room (excepto el solicitante)
        socket.to(tripId).emit('item_locked', {
          propuestaId,
          userId: user.localUserId,
          userName: user.userName,
        });

        console.log(`[socket.io] 🔒 ${user.userName} bloqueó propuesta ${propuestaId} en room ${tripId}`);
      } else {
        // Ítem ya bloqueado por otro usuario
        socket.emit('lock_error', {
          propuestaId,
          message: `Este ítem lo está editando ${result.lockedByName}`,
          lockedBy: result.lockedBy,
          lockedByName: result.lockedByName,
        });

        console.log(`[socket.io] ❌ ${user.userName} intentó bloquear propuesta ${propuestaId} — bloqueada por ${result.lockedByName}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al bloquear ítem';
      console.error(`[socket.io] Error en item_lock:`, message);
      socket.emit('lock_error', { propuestaId: payload?.propuestaId, message });
    }
  });

  // ── item_unlock ──────────────────────────────────────────────────────
  socket.on('item_unlock', async (payload: ItemUnlockPayload) => {
    try {
      const { propuestaId, tripId } = payload;

      if (!propuestaId || !tripId) {
        socket.emit('error_event', { message: 'propuestaId y tripId son requeridos' });
        return;
      }

      // Validar que el usuario pertenece a este viaje
      const isMember = await validateMembership(user.localUserId, tripId);
      if (!isMember) {
        socket.emit('error_event', { message: 'No perteneces a este viaje' });
        return;
      }

      // Validar que la propuesta pertenece a este grupo
      const belongs = await LockService.validateProposalBelongsToGroup(propuestaId, tripId);
      if (!belongs) {
        socket.emit('error_event', { message: 'La propuesta no pertenece a este viaje' });
        return;
      }

      await LockService.releaseLock(propuestaId, user.localUserId);

      // Confirmar al solicitante
      socket.emit('unlock_confirmed', { propuestaId });

      // Broadcast a toda la room
      socket.to(tripId).emit('item_unlocked', { propuestaId });

      console.log(`[socket.io] 🔓 ${user.userName} desbloqueó propuesta ${propuestaId} en room ${tripId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al desbloquear ítem';
      console.error(`[socket.io] Error en item_unlock:`, message);
      socket.emit('error_event', { propuestaId: payload?.propuestaId, message });
    }
  });

  // ── disconnect ───────────────────────────────────────────────────────
  socket.on('disconnect', async (reason) => {
    try {
      console.log(`[socket.io] Desconectado: ${user.userName} (${user.localUserId}) — razón: ${reason}`);

      // Liberar TODOS los bloqueos del usuario desconectado
      const released = await LockService.releaseAllUserLocks(user.localUserId);

      // Notificar a cada room afectada
      for (const lock of released) {
        io.to(lock.grupoId).emit('item_unlocked', {
          propuestaId: lock.propuestaId,
        });
        console.log(`[socket.io] 🔓 Auto-desbloqueado propuesta ${lock.propuestaId} en room ${lock.grupoId} (usuario desconectado)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en disconnect handler';
      console.error(`[socket.io] Error en disconnect:`, message);
    }
  });
};
