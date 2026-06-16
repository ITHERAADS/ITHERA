import { apiClient } from './apiClient'

export interface SaveSearchHistoryRequest {
  grupoId: string
  tipo: 'vuelo' | 'hospedaje'
  fuente: string
  titulo: string
  descripcion?: string | null
  searchPayload?: unknown
  resultPayload?: unknown
}

export interface SearchHistoryEntry {
  id: number
  grupo_id: number
  usuario_id: number
  tipo_item: 'vuelo' | 'hospedaje'
  fuente: string
  titulo: string
  descripcion: string | null
  search_payload: unknown
  result_payload: unknown
  created_at: string
}

export const searchHistoryService = {
  save: async (body: SaveSearchHistoryRequest, token: string) => {
    return apiClient.post<{ ok: boolean; message: string }>(
      '/search-history',
      body,
      token
    )
  },
  listByGroup: async (grupoId: string, token: string) => {
    return apiClient.get<{ ok: boolean; data: SearchHistoryEntry[] }>(
      `/search-history?grupoId=${encodeURIComponent(grupoId)}`,
      token
    )
  },
}
