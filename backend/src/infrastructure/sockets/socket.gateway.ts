import { getIO } from './socket.server';

// ── Event Constants ──────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  PROPOSAL_VOTE_UPDATED: 'vote_updated',
  ITEM_LOCKED: 'item_locked',
  ITEM_UNLOCKED: 'item_unlocked',
  CHECKOUT_UPDATED: 'checkout_updated',
  DASHBOARD_UPDATED: 'dashboard_updated',
  GROUP_MEMBERS_UPDATED: 'group_members_updated',
  GROUP_DELETED: 'group_deleted',
  PROPOSAL_COMMENT_CREATED: 'proposal_comment_created',
  PROPOSAL_COMMENT_UPDATED: 'proposal_comment_updated',
  PROPOSAL_COMMENT_DELETED: 'proposal_comment_deleted',
} as const;

// ── Payloads ─────────────────────────────────────────────────────────────

export interface DashboardUpdatedPayload {
  groupId: number;
  tipo: string;
  entidadTipo?: string | null;
  entidadId?: string | number | null;
  metadata?: Record<string, unknown>;
}

export interface CheckoutUpdatedPayload {
  groupId: number;
  proposalId: number;
  type: 'vuelo' | 'hospedaje';
  status: string;
  folio: string;
}


export interface ProposalCommentRealtimePayload {
  groupId: number | string;
  proposalId: number | string;
  action: 'created' | 'updated' | 'deleted';
  comment?: Record<string, unknown> | null;
  commentId?: number | string | null;
  actorUsuarioId?: number | string | null;
}

export interface ProposalVoteUpdatedPayload {
  groupId: number;
  proposalId: number;
  totalVotesForProposal: number;
  ranking: Array<{
    proposalId: number;
    titulo: string | null;
    totalVotes: number;
  }>;
}

// ── Emitter Functions ────────────────────────────────────────────────────

/**
 * Emite el evento de actualización de votos a todos los miembros del grupo.
 * Ahora usa Socket.IO real en vez del placeholder console.log.
 */

export const emitProposalCommentChanged = (payload: ProposalCommentRealtimePayload): void => {
  try {
    const io = getIO();
    const roomId = String(payload.groupId);
    const eventName =
      payload.action === 'created'
        ? SOCKET_EVENTS.PROPOSAL_COMMENT_CREATED
        : payload.action === 'updated'
          ? SOCKET_EVENTS.PROPOSAL_COMMENT_UPDATED
          : SOCKET_EVENTS.PROPOSAL_COMMENT_DELETED;

    const eventPayload = {
      groupId: payload.groupId,
      grupoId: payload.groupId,
      proposalId: payload.proposalId,
      entidadTipo: 'propuesta',
      entidadId: payload.proposalId,
      comment: payload.comment ?? null,
      commentId: payload.commentId ?? (payload.comment as any)?.id_comentario ?? (payload.comment as any)?.id ?? null,
      actorUsuarioId: payload.actorUsuarioId ?? null,
      createdAt: new Date().toISOString(),
    };

    io.to(roomId).emit(eventName, eventPayload);
    // Evento genérico para consumidores que prefieran un solo listener.
    io.to(roomId).emit('proposal_comment_changed', { ...eventPayload, action: payload.action });

    if (process.env['NODE_ENV'] !== 'test') {
      console.log(`[socket-gateway] ${eventName} → room ${roomId}`);
    }
  } catch {
    if (process.env['NODE_ENV'] !== 'test') {
      console.log('[socket-gateway] PROPOSAL_COMMENT_CHANGED (fallback log)', JSON.stringify(payload));
    }
  }
};

export const emitProposalVoteUpdated = (payload: ProposalVoteUpdatedPayload): void => {
  try {
    const io = getIO();
    const roomId = String(payload.groupId);

    io.to(roomId).emit(SOCKET_EVENTS.PROPOSAL_VOTE_UPDATED, payload);

    if (process.env['NODE_ENV'] !== 'test') {
      console.log(`[socket-gateway] ${SOCKET_EVENTS.PROPOSAL_VOTE_UPDATED} → room ${roomId}`);
    }
  } catch {
    // Socket.IO aún no inicializado (puede pasar en tests)
    if (process.env['NODE_ENV'] !== 'test') {
      console.log('[socket-gateway] PROPOSAL_VOTE_UPDATED (fallback log)', JSON.stringify(payload));
    }
  }
};


export const emitDashboardUpdated = (payload: DashboardUpdatedPayload): void => {
  try {
    const io = getIO();
    const roomId = String(payload.groupId);
    io.to(roomId).emit(SOCKET_EVENTS.DASHBOARD_UPDATED, {
      ...payload,
      grupoId: payload.groupId,
      createdAt: new Date().toISOString(),
    });

    if (process.env['NODE_ENV'] !== 'test') {
      console.log(`[socket-gateway] ${SOCKET_EVENTS.DASHBOARD_UPDATED} → room ${roomId}`);
    }
  } catch {
    if (process.env['NODE_ENV'] !== 'test') {
      console.log('[socket-gateway] DASHBOARD_UPDATED (fallback log)', JSON.stringify(payload));
    }
  }
};

export const emitCheckoutUpdated = (payload: CheckoutUpdatedPayload): void => {
  try {
    const io = getIO();
    const roomId = String(payload.groupId);
    io.to(roomId).emit(SOCKET_EVENTS.CHECKOUT_UPDATED, {
      ...payload,
      grupoId: payload.groupId,
      createdAt: new Date().toISOString(),
    });

    if (process.env['NODE_ENV'] !== 'test') {
      console.log(`[socket-gateway] ${SOCKET_EVENTS.CHECKOUT_UPDATED} → room ${roomId}`);
    }
  } catch {
    if (process.env['NODE_ENV'] !== 'test') {
      console.log('[socket-gateway] CHECKOUT_UPDATED (fallback log)', JSON.stringify(payload));
    }
  }
};


export interface GroupDeletedPayload {
  groupId: number;
  actorUsuarioId?: number | null;
  reason?: string;
}

export const emitGroupDeleted = (payload: GroupDeletedPayload): void => {
  try {
    const io = getIO();
    const roomId = String(payload.groupId);
    const eventPayload = {
      groupId: payload.groupId,
      grupoId: payload.groupId,
      tipo: 'grupo_eliminado',
      entidadTipo: 'grupo',
      entidadId: payload.groupId,
      actorUsuarioId: payload.actorUsuarioId ?? null,
      reason: payload.reason ?? 'deleted',
      createdAt: new Date().toISOString(),
    };
    io.to(roomId).emit(SOCKET_EVENTS.GROUP_DELETED, eventPayload);
    io.to(roomId).emit(SOCKET_EVENTS.DASHBOARD_UPDATED, eventPayload);

    if (process.env['NODE_ENV'] !== 'test') {
      console.log(`[socket-gateway] ${SOCKET_EVENTS.GROUP_DELETED} → room ${roomId}`);
    }
  } catch {
    if (process.env['NODE_ENV'] !== 'test') {
      console.log('[socket-gateway] GROUP_DELETED (fallback log)', JSON.stringify(payload));
    }
  }
};

/**
 * Listener legacy — mantenido para compatibilidad con código existente.
 * En el nuevo sistema, los handlers de socket.handlers.ts manejan directamente los eventos.
 */
export const onProposalVoteUpdated = (
  listener: (payload: ProposalVoteUpdatedPayload) => void,
): void => {
  // No-op: el sistema de eventos ahora usa Socket.IO directamente.
  // Este export se mantiene para no romper imports existentes.
  console.log('[socket-gateway] onProposalVoteUpdated registrado (legacy)');
};
