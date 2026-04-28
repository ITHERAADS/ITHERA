import { apiClient } from './apiClient'

export interface GeocodingResult {
  formattedAddress?: string
  location?: {
    latitude?: number
    longitude?: number
  }
  placeId?: string
}

export const mapsService = {
  searchDestination: async (address: string, token: string) => {
    return apiClient.get<{ ok: boolean; data: GeocodingResult }>(
      `/maps/geocoding/search?address=${encodeURIComponent(address)}`,
      token
    )
  },
}