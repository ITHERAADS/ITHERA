export interface CreateCommentPayload {
  contenido: string;
}

export interface UpdateCommentPayload {
  contenido: string;
}

export interface VoteSummaryItem {
  proposalId: number;
  titulo: string | null;
  totalVotes: number;
}

export interface VoteSummaryResponse {
  groupId: number;
  proposalId: number;
  totalVotesForProposal: number;
  userHasVoted: boolean;
  ranking: VoteSummaryItem[];
}
