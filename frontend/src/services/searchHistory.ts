import { apiClient } from './apiClient';
import type { SearchHistoryItem } from '../types/searchHistory';

interface CreateSearchHistoryPayload {
  tipo: 'vuelo' | 'hospedaje' | 'lugar' | 'ruta'
  parametros: Record<string, unknown>
  resultado_cache: Record<string, unknown>
  expires_at: string
  grupo_id?: string
}

export const searchHistoryService = {
  getHistory: async (token: string): Promise<SearchHistoryItem[]> => {
    const res = await apiClient.get<{ ok: boolean; data: SearchHistoryItem[] }>(
      '/api/search-history',
      token
    );
    return res.data ?? [];
  },

  createEntry: async (
    payload: CreateSearchHistoryPayload,
    token: string
  ): Promise<SearchHistoryItem> => {
    const res = await apiClient.post<{ ok: boolean; data: SearchHistoryItem }>(
      '/api/search-history',
      payload,
      token
    );
    return res.data;
  },

  deleteEntry: async (id: string, token: string): Promise<void> => {
    await apiClient.delete<{ ok: boolean }>(
      `/api/search-history/${id}`,
      token
    );
  },

  clearAll: async (token: string): Promise<void> => {
    await apiClient.delete<{ ok: boolean }>(
      '/api/search-history',
      token
    );
  },

  recoverAsProposal: async (
    id: string,
    grupoId: string,
    token: string
  ): Promise<Record<string, unknown>> => {
    const res = await apiClient.post<{ ok: boolean; data: Record<string, unknown> }>(
      `/api/search-history/${id}/recover`,
      { grupoId },
      token
    );
    return res.data;
  },
};
