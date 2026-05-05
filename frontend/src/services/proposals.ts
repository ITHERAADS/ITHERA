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
  id_propuesta: string
  tipo_item: string
  titulo: string
  votos: number
  votos_a_favor: number
  votos_en_contra: number
  abstenciones: number
  votos_pendientes: number
  requiere_desempate_admin: boolean
  estado_actual: string
  mi_voto?: 'a_favor' | 'en_contra' | 'abstencion' | null
}

export interface ProposalComment {
  id: string
  proposalId: string
  usuarioId: string
  authorName?: string | null
  contenido: string
  createdAt: string
  updatedAt: string
}

type RawProposalComment = {
  id?: string | number
  id_comentario?: string | number
  proposalId?: string | number
  id_propuesta?: string | number
  usuarioId?: string | number
  id_usuario?: string | number
  authorName?: string | null
  nombre?: string | null
  contenido?: string
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

function normalizeComment(raw: RawProposalComment): ProposalComment {
  return {
    id: String(raw.id ?? raw.id_comentario ?? ''),
    proposalId: String(raw.proposalId ?? raw.id_propuesta ?? ''),
    usuarioId: String(raw.usuarioId ?? raw.id_usuario ?? ''),
    authorName: raw.authorName ?? raw.nombre ?? null,
    contenido: String(raw.contenido ?? ''),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? new Date().toISOString()),
  }
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

  applyAdminDecision: async (
    tripId: string,
    proposalId: string,
    body: { decision: 'aprobar' | 'rechazar'; reason?: string },
    token: string
  ) => {
    return apiClient.post<{ ok: boolean; message: string }>(
      `/proposals/groups/${tripId}/${proposalId}/admin-decision`,
      body,
      token
    )
  },

  getVoteResults: async (tripId: string, token: string) => {
    return apiClient.get<{ ok: boolean; tripId: string; totalVotes: number; results: VoteResult[] }>(
      `/proposals/groups/${tripId}/vote-results`,
      token
    )
  },

  getComments: async (tripId: string, proposalId: string, token: string) => {
    const response = await apiClient.get<{
      ok: boolean
      comments?: RawProposalComment[]
      data?: RawProposalComment[]
    }>(
      `/proposals/groups/${tripId}/${proposalId}/comments`,
      token
    )

    const raw = response.comments ?? response.data ?? []
    return {
      ok: response.ok,
      comments: raw.map(normalizeComment),
    }
  },

  addComment: async (
    tripId: string,
    proposalId: string,
    body: { contenido: string },
    token: string
  ) => {
    const response = await apiClient.post<{
      ok: boolean
      message: string
      comment?: RawProposalComment
      data?: RawProposalComment
    }>(
      `/proposals/groups/${tripId}/${proposalId}/comments`,
      body,
      token
    )

    return {
      ok: response.ok,
      message: response.message,
      comment: normalizeComment(response.comment ?? response.data ?? {}),
    }
  },

  updateComment: async (
    tripId: string,
    proposalId: string,
    commentId: string,
    body: { contenido: string },
    token: string
  ) => {
    const response = await apiClient.patch<{
      ok: boolean
      message: string
      comment?: RawProposalComment
      data?: RawProposalComment
    }>(
      `/proposals/groups/${tripId}/${proposalId}/comments/${commentId}`,
      body,
      token
    )

    return {
      ok: response.ok,
      message: response.message,
      comment: normalizeComment(response.comment ?? response.data ?? {}),
    }
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
