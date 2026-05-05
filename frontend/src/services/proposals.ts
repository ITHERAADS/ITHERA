import { apiClient } from './apiClient'

export interface ProposalDetailFlight {
  id_vuelo?: string | number
  propuesta_id?: string | number
  aerolinea?: string | null
  numero_vuelo?: string | null
  origen_codigo?: string | null
  origen_nombre?: string | null
  destino_codigo?: string | null
  destino_nombre?: string | null
  salida?: string | null
  llegada?: string | null
  duracion?: string | null
  precio?: number | string | null
  moneda?: string | null
  escalas?: number | null
  payload?: Record<string, unknown> | null
}

export interface ProposalDetailHotel {
  id_hospedaje?: string | number
  propuesta_id?: string | number
  nombre?: string | null
  proveedor?: string | null
  referencia_externa?: string | null
  direccion?: string | null
  check_in?: string | null
  check_out?: string | null
  precio_total?: number | string | null
  moneda?: string | null
  calificacion?: number | string | null
  payload?: Record<string, unknown> | null
}

export interface Proposal {
  id: string
  id_propuesta?: string | number
  groupId: string
  grupo_id?: string | number
  tipo: 'vuelo' | 'hospedaje' | 'actividad' | string
  tipo_item?: string
  titulo: string
  descripcion?: string | null
  estado: string
  creadoPor: string
  creado_por?: string | number
  payload?: Record<string, unknown> | null
  detalle?: ProposalDetailFlight | ProposalDetailHotel | null
  createdAt: string
  updatedAt: string
}

export interface SaveFlightProposalRequest {
  grupoId: string
  fuente: string
  titulo: string
  descripcion?: string | null
  payload?: Record<string, unknown> | null
  vuelo: {
    aerolinea: string
    numeroVuelo?: string | null
    origenCodigo: string
    origenNombre?: string | null
    destinoCodigo: string
    destinoNombre?: string | null
    salida: string
    llegada: string
    duracion?: string | null
    precio: number
    moneda: string
    escalas?: number
    payload?: Record<string, unknown> | null
  }
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

type RawProposal = Record<string, unknown>

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function normalizeProposal(raw: RawProposal): Proposal {
  const id = String(raw.id ?? raw.id_propuesta ?? '')
  return {
    ...raw,
    id,
    id_propuesta: raw.id_propuesta as string | number | undefined,
    groupId: String(raw.groupId ?? raw.grupo_id ?? ''),
    grupo_id: raw.grupo_id as string | number | undefined,
    tipo: String(raw.tipo ?? raw.tipo_item ?? '') as Proposal['tipo'],
    tipo_item: String(raw.tipo_item ?? raw.tipo ?? ''),
    titulo: String(raw.titulo ?? 'Propuesta sin título'),
    descripcion: raw.descripcion as string | null | undefined,
    estado: String(raw.estado ?? 'guardada'),
    creadoPor: String(raw.creadoPor ?? raw.creado_por ?? ''),
    creado_por: raw.creado_por as string | number | undefined,
    payload: asRecord(raw.payload),
    detalle: asRecord(raw.detalle) as Proposal['detalle'],
    createdAt: String(raw.createdAt ?? raw.fecha_creacion ?? raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.ultima_actualizacion ?? raw.updated_at ?? new Date().toISOString()),
  }
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
  saveFlightProposal: async (body: SaveFlightProposalRequest, token: string) => {
    const response = await apiClient.post<{ ok: boolean; message: string; data?: RawProposal; proposal?: RawProposal }>(
      '/proposals/flights',
      body,
      token
    )

    return {
      ok: response.ok,
      message: response.message,
      proposal: normalizeProposal(response.proposal ?? response.data ?? {}),
    }
  },

  getGroupProposals: async (groupId: string, token: string) => {
    const response = await apiClient.get<{ ok: boolean; proposals?: RawProposal[]; data?: RawProposal[] }>(
      `/proposals/groups/${groupId}`,
      token
    )

    const raw = response.proposals ?? response.data ?? []
    return {
      ok: response.ok,
      proposals: raw.map(normalizeProposal),
    }
  },

  getProposal: async (proposalId: string, token: string) => {
    const response = await apiClient.get<{ ok: boolean; proposal?: RawProposal; data?: RawProposal }>(
      `/proposals/${proposalId}`,
      token
    )

    return {
      ok: response.ok,
      proposal: normalizeProposal(response.proposal ?? response.data ?? {}),
    }
  },

  updateProposal: async (
    proposalId: string,
    body: Partial<Pick<Proposal, 'titulo' | 'descripcion' | 'estado' | 'payload'>>,
    token: string
  ) => {
    const response = await apiClient.put<{ ok: boolean; message: string; proposal?: RawProposal; data?: RawProposal }>(
      `/proposals/${proposalId}`,
      body,
      token
    )

    return {
      ok: response.ok,
      message: response.message,
      proposal: normalizeProposal(response.proposal ?? response.data ?? {}),
    }
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
