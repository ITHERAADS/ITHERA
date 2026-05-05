import { apiClient } from './apiClient'

export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first'

export interface FlightSearchParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  adults: number
  children: number
  infantsWithoutSeat: number
  cabinClass?: CabinClass
  max?: number
}


export interface FlightAirportOption {
  code: string
  name: string
  city: string
  state?: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  label: string
  matchSource: 'iata' | 'catalog' | 'nearest' | 'google_geocoding'
  score: number
  distanceKm?: number
}

export interface AirportLookupParams {
  q?: string
  latitude?: number | null
  longitude?: number | null
  max?: number
}

export interface FlightBaggage {
  type: string
  quantity: number
}

export interface FlightSegment {
  origin: string | null
  originName: string | null
  destination: string | null
  destinationName: string | null
  departureAt: string | null
  arrivalAt: string | null
  duration: string | null
  airline: string | null
  airlineCode: string | null
  flightNumber: string | null
  aircraft: string | null
  stops: number
}

export interface FlightSliceSummary {
  origin: string | null
  originName: string | null
  destination: string | null
  destinationName: string | null
  departureAt: string | null
  arrivalAt: string | null
  duration: string | null
  stops: number
  segments: FlightSegment[]
}

export interface FlightOffer {
  id: string
  provider: 'duffel'
  liveMode: boolean
  airline: string | null
  airlineCode: string | null
  flightNumber: string | null
  origin: string | null
  originName: string | null
  destination: string | null
  destinationName: string | null
  departureAt: string | null
  arrivalAt: string | null
  duration: string | null
  stops: number
  price: number | null
  currency: string | null
  cabinClass: string | null
  fareBrand: string | null
  aircraft: string | null
  baggage: FlightBaggage[]
  passengers: {
    adults: number
    children: number
    infantsWithoutSeat: number
    total: number
  }
  outboundSlice: FlightSliceSummary | null
  returnSlice: FlightSliceSummary | null
  slices: FlightSegment[][]
  raw: Record<string, unknown>
}

function buildAirportQuery(params: AirportLookupParams) {
  const query = new URLSearchParams()

  if (params.q) query.set('q', params.q)
  if (typeof params.latitude === 'number') query.set('latitude', String(params.latitude))
  if (typeof params.longitude === 'number') query.set('longitude', String(params.longitude))
  if (params.max) query.set('max', String(params.max))

  return query.toString()
}

function buildQuery(params: FlightSearchParams) {
  const query = new URLSearchParams({
    origin: params.origin.trim().toUpperCase(),
    destination: params.destination.trim().toUpperCase(),
    departureDate: params.departureDate,
    adults: String(params.adults),
    children: String(params.children),
    infantsWithoutSeat: String(params.infantsWithoutSeat),
    cabinClass: params.cabinClass ?? 'economy',
    max: String(params.max ?? 20),
  })

  if (params.returnDate) {
    query.set('returnDate', params.returnDate)
  }

  return query.toString()
}

export const flightsService = {
  searchAirports: async (params: AirportLookupParams, token: string) => {
    return apiClient.get<{ ok: boolean; data: FlightAirportOption[] }>(
      `/flights/airports/search?${buildAirportQuery(params)}`,
      token
    )
  },

  resolveAirport: async (params: AirportLookupParams, token: string) => {
    return apiClient.get<{ ok: boolean; data: FlightAirportOption }>(
      `/flights/airports/resolve?${buildAirportQuery(params)}`,
      token
    )
  },

  search: async (params: FlightSearchParams, token: string) => {
    return apiClient.get<{ ok: boolean; data: FlightOffer[] }>(
      `/flights/search?${buildQuery(params)}`,
      token
    )
  },
}
