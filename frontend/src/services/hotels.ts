import { apiClient } from './apiClient'

export interface HotelSearchParams {
  destination?: string
  latitude?: number | null
  longitude?: number | null
  placeId?: string | null
  checkIn: string
  checkOut: string
  adults: number
  childrenAges?: number[]
  rooms: number
  currency?: string
  guestNationality?: string
  countryCode?: string
  radius?: number
  limit?: number
  minRating?: number
}

export interface HotelRoomRate {
  rateId: string | null
  roomTypeId: string | null
  offerId: string | null
  name: string | null
  boardName: string | null
  boardType: string | null
  refundableTag: string | null
  maxOccupancy: number | null
  adultCount: number | null
  childCount: number | null
  price: number | null
  currency: string | null
  suggestedSellingPrice: number | null
  taxesAndFees: unknown[]
  cancellationPolicies: unknown
  paymentTypes: string[]
}

export interface HotelOffer {
  id: string
  hotelId: string
  provider: 'liteapi'
  supplier: string | null
  supplierId: number | null
  name: string
  address: string | null
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  rating: number | null
  googleRating: number | null
  googlePlaceId: string | null
  googleUserRatingCount: number | null
  photoName: string | null
  photoUrl: string | null
  checkIn: string
  checkOut: string
  nights: number
  price: number | null
  currency: string | null
  offerId: string | null
  roomName: string | null
  boardName: string | null
  refundableTag: string | null
  rooms: HotelRoomRate[]
  rateCount: number
  priceMin: number | null
  priceMax: number | null
  raw: Record<string, unknown>
  proposed?: boolean
  saving?: boolean
}

export interface HotelPrebookResponse {
  prebookId?: string
  offerId?: string
  hotelId?: string
  currency?: string
  price?: number
  checkin?: string
  checkout?: string
  [key: string]: unknown
}

export const hotelsService = {
  search: async (params: HotelSearchParams, token: string) => {
    return apiClient.post<{ ok: boolean; data: HotelOffer[] }>(
      '/hotels/search',
      params,
      token
    )
  },

  prebook: async (offerId: string, token: string) => {
    return apiClient.post<{ ok: boolean; data: HotelPrebookResponse }>(
      '/hotels/prebook',
      { offerId },
      token
    )
  },
}
