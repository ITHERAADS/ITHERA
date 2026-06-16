export type SearchHistoryItemType = 'vuelo' | 'hospedaje';

export interface CreateSearchHistoryPayload {
  grupoId: string;
  tipo: SearchHistoryItemType;
  fuente: string;
  titulo: string;
  descripcion?: string | null;
  searchPayload?: Record<string, unknown> | null;
  resultPayload?: Record<string, unknown> | null;
}

