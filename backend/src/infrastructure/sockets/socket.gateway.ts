import { EventEmitter } from 'node:events';

const socketBus = new EventEmitter();

export const SOCKET_EVENTS = {
  PROPOSAL_VOTE_UPDATED: 'PROPOSAL_VOTE_UPDATED',
} as const;

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

export const emitProposalVoteUpdated = (payload: ProposalVoteUpdatedPayload) => {
  socketBus.emit(SOCKET_EVENTS.PROPOSAL_VOTE_UPDATED, payload);

  if (process.env['NODE_ENV'] !== 'test') {
    console.log('[socket-placeholder] PROPOSAL_VOTE_UPDATED', JSON.stringify(payload));
  }
};

export const onProposalVoteUpdated = (
  listener: (payload: ProposalVoteUpdatedPayload) => void,
) => {
  socketBus.on(SOCKET_EVENTS.PROPOSAL_VOTE_UPDATED, listener);
};
