import { apiClient } from './apiClient'

export interface GeocodingResult {
  formattedAddress: string | null
  latitude: number | null
  longitude: number | null
  placeId: string | null
}

export interface PlaceAutocompleteResult {
  description: string
  placeId: string
  mainText: string
  secondaryText: string
}

export interface PlaceResult {
  id: string | null
  name: string | null
  formattedAddress: string | null
  latitude: number | null
  longitude: number | null
  primaryCategory: string | null
  photoName?: string | null
  photoUrl?: string | null
}

export const mapsService = {
  searchDestination: async (address: string, token: string) => {
    return apiClient.get<{ ok: boolean; data: GeocodingResult | null }>(
      `/maps/geocoding/search?address=${encodeURIComponent(address)}`,
      token
    )
  },

  autocompletePlaces: async (input: string, token: string) => {
    return apiClient.get<{ ok: boolean; data: PlaceAutocompleteResult[] }>(
      `/maps/places/autocomplete?input=${encodeURIComponent(input)}`,
      token
    )
  },

  getPlaceDetails: async (placeId: string, token: string) => {
    return apiClient.get<{ ok: boolean; data: GeocodingResult | null }>(
      `/maps/places/details/${encodeURIComponent(placeId)}`,
      token
    )
  },

  searchPlacesByText: async (
    payload: {
      textQuery: string
      latitude?: number | null
      longitude?: number | null
      radius?: number
      maxResultCount?: number
    },
    token: string
  ) => {
    return apiClient.post<{ ok: boolean; data: PlaceResult[] }>(
      '/maps/places/text-search',
      payload,
      token
    )
  },
}