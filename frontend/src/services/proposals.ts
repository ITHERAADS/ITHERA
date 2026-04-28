import { apiClient } from './apiClient'

export interface Proposal {
  id: string
  groupId: string
  tipo: string
  titulo: string
  descripcion?: string | null
  estado: string
  creadoPor: string
  payload?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface VoteResult {
  proposalId: string
  totalVotos: number
  aFavor: number
  enContra: number
  abstenciones: number
}

export interface ProposalComment {
  id: string
  proposalId: string
  usuarioId: string
  contenido: string
  createdAt: string
  updatedAt: string
}

export const proposalsService = {
  getGroupProposals: async (groupId: string, token: string) => {
    return apiClient.get<{ ok: boolean; proposals: Proposal[] }>(
      `/proposals/groups/${groupId}`,
      token
    )
  },

  getProposal: async (proposalId: string, token: string) => {
    return apiClient.get<{ ok: boolean; proposal: Proposal }>(
      `/proposals/${proposalId}`,
      token
    )
  },

  updateProposal: async (
    proposalId: string,
    body: Partial<Pick<Proposal, 'titulo' | 'descripcion' | 'estado' | 'payload'>>,
    token: string
  ) => {
    return apiClient.put<{ ok: boolean; message: string; proposal: Proposal }>(
      `/proposals/${proposalId}`,
      body,
      token
    )
  },

  deleteProposal: async (proposalId: string, token: string) => {
    return apiClient.delete<{ ok: boolean; message: string }>(
      `/proposals/${proposalId}`,
      token
    )
  },

  voteProposal: async (
    tripId: string,
    proposalId: string,
    body: { voto: 'a_favor' | 'en_contra' | 'abstencion' },
    token: string
  ) => {
    return apiClient.post<{ ok: boolean; message: string }>(
      `/proposals/groups/${tripId}/${proposalId}/vote`,
      body,
      token
    )
  },

  getVoteResults: async (tripId: string, token: string) => {
    return apiClient.get<{ ok: boolean; results: VoteResult[] }>(
      `/proposals/groups/${tripId}/vote-results`,
      token
    )
  },

  getComments: async (tripId: string, proposalId: string, token: string) => {
    return apiClient.get<{ ok: boolean; comments: ProposalComment[] }>(
      `/proposals/groups/${tripId}/${proposalId}/comments`,
      token
    )
  },

  addComment: async (
    tripId: string,
    proposalId: string,
    body: { contenido: string },
    token: string
  ) => {
    return apiClient.post<{ ok: boolean; message: string; comment: ProposalComment }>(
      `/proposals/groups/${tripId}/${proposalId}/comments`,
      body,
      token
    )
  },

  updateComment: async (
    tripId: string,
    proposalId: string,
    commentId: string,
    body: { contenido: string },
    token: string
  ) => {
    return apiClient.patch<{ ok: boolean; message: string; comment: ProposalComment }>(
      `/proposals/groups/${tripId}/${proposalId}/comments/${commentId}`,
      body,
      token
    )
  },

  deleteComment: async (
    tripId: string,
    proposalId: string,
    commentId: string,
    token: string
  ) => {
    return apiClient.delete<{ ok: boolean; message: string }>(
      `/proposals/groups/${tripId}/${proposalId}/comments/${commentId}`,
      token
    )
  },
}
