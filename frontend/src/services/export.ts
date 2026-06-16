import { apiClient } from './apiClient'

export interface SharedGroupInfo {
  id: number
  nombre: string
  destino: string | null
  destino_formatted_address: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
}

export interface SharedItineraryItem {
  id: number
  title: string
  description: string | null
  location: string | null
  status: string
  startsAt: string | null
  endsAt: string | null
  day: string | null
}

export const exportService = {
  getShareLink: async (groupId: string, token: string) => {
    return apiClient.get<{
      ok: boolean
      token: string
      shareUrl: string
      expiresAt: string
    }>(`/export/share-link/${groupId}`, token)
  },
  getSharedItinerary: async (token: string) => {
    return apiClient.get<{
      ok: boolean
      group: SharedGroupInfo
      itinerary: SharedItineraryItem[]
      tokenMeta: { expiresAt: string }
    }>(`/export/shared/${encodeURIComponent(token)}`)
  },
}

