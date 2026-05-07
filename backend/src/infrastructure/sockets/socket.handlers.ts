import { Server as SocketIOServer, Socket } from 'socket.io';
import { supabase } from '../db/supabase.client';
import { SocketUserData } from './socket.server';
import * as LockService from '../../domain/proposals/lock.service';
import * as ChatService from '../../domain/groups/chat.service';
import * as SubgroupChatService from '../../domain/groups/subgroup-chat.service';

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

interface ChatSendMessagePayload {
  groupId?: string;
  tripId?: string;
  contenido?: string;
  text?: string;
  clientId?: string;
}

interface SubgroupChatSendMessagePayload {
  subgroupId?: string;
  contenido?: string;
  clientId?: string;
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


// ── Presence en memoria ─────────────────────────────────────────────────
// roomPresence: tripId -> userId -> sockets activos del usuario en esa room
const roomPresence = new Map<string, Map<string, Set<string>>>();
const socketRooms = new Map<string, Set<string>>();

const getOnlineUserIds = (tripId: string): string[] => {
  return Array.from(roomPresence.get(tripId)?.keys() ?? []);
};

const emitPresenceUpdate = (io: SocketIOServer, tripId: string): void => {
  io.to(tripId).emit('presence_update', {
    tripId,
    onlineUserIds: getOnlineUserIds(tripId),
  });
};

const addPresence = (socket: Socket, tripId: string, userId: string): void => {
  const users = roomPresence.get(tripId) ?? new Map<string, Set<string>>();
  const sockets = users.get(userId) ?? new Set<string>();
  sockets.add(socket.id);
  users.set(userId, sockets);
  roomPresence.set(tripId, users);

  const rooms = socketRooms.get(socket.id) ?? new Set<string>();
  rooms.add(tripId);
  socketRooms.set(socket.id, rooms);
};

const removePresence = (socket: Socket, tripId: string, userId: string): void => {
  const users = roomPresence.get(tripId);
  const sockets = users?.get(userId);

  sockets?.delete(socket.id);
  if (sockets && sockets.size === 0) {
    users?.delete(userId);
  }
  if (users && users.size === 0) {
    roomPresence.delete(tripId);
  }

  const rooms = socketRooms.get(socket.id);
  rooms?.delete(tripId);
  if (rooms && rooms.size === 0) {
    socketRooms.delete(socket.id);
  }
};

const removeSocketFromAllPresenceRooms = (socket: Socket, userId: string): string[] => {
  const rooms = Array.from(socketRooms.get(socket.id) ?? []);

  for (const tripId of rooms) {
    removePresence(socket, tripId, userId);
  }

  return rooms;
};

// ── Handler Registration ─────────────────────────────────────────────────

export const registerSocketHandlers = (io: SocketIOServer, socket: Socket): void => {
  const user = getUserData(socket);

  // Unir al usuario a su cuarto personal para recibir notificaciones.
  // Además, lo unimos de forma silenciosa a todos sus grupos para que
  // dashboard_updated / vote_updated lleguen aunque el chat no esté abierto.
  socket.join(`user:${user.localUserId}`);
  console.log(`[socket.io] ${user.userName} unido a cuarto personal user:${user.localUserId}`);

  void (async () => {
    try {
      const { data, error } = await supabase
        .from('grupo_miembros')
        .select('grupo_id')
        .eq('usuario_id', user.localUserId);

      if (error) {
        console.warn('[socket.io] No se pudieron cargar grupos del usuario:', error.message);
        return;
      }

      const groupIds = Array.from(
        new Set((data ?? []).map((row) => String(row.grupo_id)).filter(Boolean))
      );

      for (const groupId of groupIds) {
        socket.join(groupId);
      }

      if (groupIds.length > 0) {
        console.log(`[socket.io] ${user.userName} unido a rooms de grupo: ${groupIds.join(', ')}`);
      }
    } catch (err) {
      console.warn('[socket.io] Error al unir usuario a sus rooms de grupo:', err);
    }
  })();

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
      addPresence(socket, tripId, user.localUserId);
      console.log(`[socket.io] ${user.userName} se unió a room: ${tripId}`);

      // Notificar al usuario que se unió exitosamente
      socket.emit('room_joined', { tripId });

      // Actualizar presencia para todos los clientes de la room
      emitPresenceUpdate(io, tripId);

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

      removePresence(socket, tripId, user.localUserId);
      socket.leave(tripId);
      console.log(`[socket.io] ${user.userName} salió de room: ${tripId}`);

      // Actualizar presencia para los clientes que quedan en la room
      emitPresenceUpdate(io, tripId);

      socket.to(tripId).emit('user_left', {
        userId: user.localUserId,
        userName: user.userName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al salir de la room';
      console.error(`[socket.io] Error en leave_room:`, message);
    }
  });



  // -- chat_send_message ------------------------------------------------
  socket.on('chat_send_message', async (payload: ChatSendMessagePayload, ack?: (response: unknown) => void) => {
    try {
      const groupId = payload?.groupId ?? payload?.tripId;
      const contenido = payload?.contenido ?? payload?.text;

      if (!groupId || typeof contenido !== 'string') {
        const response = { ok: false, error: 'groupId y contenido son requeridos' };
        socket.emit('error_event', { message: response.error });
        ack?.(response);
        return;
      }

      const message = await ChatService.createGroupMessageByLocalUser(
        user.localUserId,
        groupId,
        contenido,
        {
          nombre: user.userName,
          email: null,
          avatar_url: user.avatarUrl ?? null,
        }
      );

      io.to(groupId).emit('chat_message', {
        ...message,
        clientId: payload.clientId ?? null,
      });

      ack?.({ ok: true, message });
      console.log(`[socket.io] Mensaje de chat enviado por ${user.userName} en room ${groupId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
      console.error('[socket.io] Error en chat_send_message:', message);
      socket.emit('error_event', { message });
      ack?.({ ok: false, error: message });
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

      // Quitar presencia del socket desconectado y notificar rooms afectadas
      const affectedPresenceRooms = removeSocketFromAllPresenceRooms(socket, user.localUserId);
      for (const tripId of affectedPresenceRooms) {
        emitPresenceUpdate(io, tripId);
      }

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

  // ── subgroup_chat_send_message ──────────────────────────────────────────
  socket.on('subgroup_chat_send_message', async (payload: SubgroupChatSendMessagePayload, ack?: (response: unknown) => void) => {
    try {
      const subgroupId = payload?.subgroupId;
      const contenido = payload?.contenido;

      if (!subgroupId || typeof contenido !== 'string') {
        const response = { ok: false, error: 'subgroupId y contenido son requeridos' };
        socket.emit('error_event', { message: response.error });
        ack?.(response);
        return;
      }

      const message = await SubgroupChatService.createSubgroupMessageByLocalUser(
        user.localUserId,
        subgroupId,
        contenido,
        {
          nombre: user.userName,
          email: null,
          avatar_url: user.avatarUrl ?? null,
        }
      );

      io.to(`subgroup:${subgroupId}`).emit('subgroup_chat_message', {
        ...message,
        clientId: payload.clientId ?? null,
      });

      ack?.({ ok: true, message });
      console.log(`[socket.io] Mensaje de subgrupo enviado por ${user.userName} en subgroup:${subgroupId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
      console.error('[socket.io] Error en subgroup_chat_send_message:', message);
      socket.emit('error_event', { message });
      ack?.({ ok: false, error: message });
    }
  });

  // ── join_subgroup_room ──────────────────────────────────────────────────
  socket.on('join_subgroup_room', async (payload: { subgroupId: string }) => {
    try {
      const { subgroupId } = payload;
      if (!subgroupId) {
        socket.emit('error_event', { message: 'subgroupId es requerido' });
        return;
      }

      await SubgroupChatService.ensureSubgroupMember(user.localUserId, subgroupId);

      const roomName = `subgroup:${subgroupId}`;
      socket.join(roomName);
      console.log(`[socket.io] ${user.userName} se unió a room: ${roomName}`);

      socket.emit('subgroup_room_joined', { subgroupId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al unirse a la room del subgrupo';
      console.error('[socket.io] Error en join_subgroup_room:', message);
      socket.emit('error_event', { message });
    }
  });

  // ── leave_subgroup_room ─────────────────────────────────────────────────
  socket.on('leave_subgroup_room', async (payload: { subgroupId: string }) => {
    try {
      const { subgroupId } = payload;
      if (!subgroupId) return;

      const roomName = `subgroup:${subgroupId}`;
      socket.leave(roomName);
      console.log(`[socket.io] ${user.userName} salió de room: ${roomName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al salir de la room del subgrupo';
      console.error('[socket.io] Error en leave_subgroup_room:', message);
    }
  });
};
