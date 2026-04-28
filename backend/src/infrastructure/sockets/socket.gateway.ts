import { getIO } from './socket.server';

// ── Event Constants ──────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  PROPOSAL_VOTE_UPDATED: 'vote_updated',
  ITEM_LOCKED: 'item_locked',
  ITEM_UNLOCKED: 'item_unlocked',
} as const;

// ── Payloads ─────────────────────────────────────────────────────────────

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
