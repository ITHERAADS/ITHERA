export interface SearchHistoryItem {
  id: string
  usuario_id: string
  grupo_id: string | null
  tipo: 'vuelo' | 'hospedaje' | 'lugar' | 'ruta'
  parametros: Record<string, unknown>
  resultado_cache: Record<string, unknown>
  expires_at: string
  created_at: string
  expirado?: boolean
}
