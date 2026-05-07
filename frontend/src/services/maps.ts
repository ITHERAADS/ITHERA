import { apiClient } from './apiClient'

export interface GeocodingResult {
  formattedAddress: string | null
  latitude: number | null
  longitude: number | null
  placeId: string | null
  photoName?: string | null
  photoUrl?: string | null
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
  rating?: number | null
  userRatingCount?: number | null
  priceLevel?: string | null
  websiteUri?: string | null
  nationalPhoneNumber?: string | null
  internationalPhoneNumber?: string | null
  regularOpeningHours?: { weekdayDescriptions?: string[] } | null
  editorialSummary?: string | null
  googleMapsUri?: string | null
}

export interface ComputeRouteResult {
  distanceMeters: number | null
  duration: string | null
  encodedPolyline: string | null
  staticDuration: string | null
  startLat: number | null
  startLng: number | null
  endLat: number | null
  endLng: number | null
  distanceText: string | null
  durationText: string | null
  staticDurationText: string | null
  steps: Array<{
    distanceMeters: number | null
    staticDuration: string | null
    maneuver: string | null
    instructions: string | null
    travelMode: string | null
    distanceText: string | null
    durationText: string | null
  }>
}

export interface WeatherForecastDay {
  date: string
  day: string
  weatherCode: number
  icon: string
  iconUrl?: string | null
  description: string
  min: number | null
  max: number | null
  precipitationProbability: number | null
}

export interface WeatherResult {
  current: {
    temperature: number | null
    weatherCode: number | null
    windSpeed: number | null
    relativeHumidity: number | null
    precipitationProbability: number | null
    icon: string
    iconUrl?: string | null
    description: string
  }
  forecast: WeatherForecastDay[]
}

export type GoogleLatLngLiteral = { lat: number; lng: number }

export interface GoogleMapInstance {
  setCenter(position: GoogleLatLngLiteral): void
  panTo(position: GoogleLatLngLiteral): void
  fitBounds(bounds: GoogleLatLngBoundsInstance, padding?: number): void
}

export interface GoogleMarkerInstance {
  setMap(map: GoogleMapInstance | null): void
  addListener(eventName: string, handler: () => void): void
}

export interface GoogleLatLngBoundsInstance {
  extend(position: GoogleLatLngLiteral): void
}

export interface GoogleDirectionsResult {
  routes?: unknown[]
}

export interface GoogleDirectionsRendererInstance {
  setMap(map: GoogleMapInstance | null): void
  setDirections(result: GoogleDirectionsResult): void
}

type GoogleMapOptions = {
  center: GoogleLatLngLiteral
  zoom: number
  mapTypeControl?: boolean
  streetViewControl?: boolean
  fullscreenControl?: boolean
}

type GoogleMarkerOptions = {
  map: GoogleMapInstance
  position: GoogleLatLngLiteral
  title?: string
  icon?: string
}

type GoogleDirectionsRequest = {
  origin: GoogleLatLngLiteral | string
  destination: GoogleLatLngLiteral | string
  travelMode: string
}

type GoogleDirectionsCallback = (result: GoogleDirectionsResult | null, status: string) => void

interface GoogleMapsNamespace {
  Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMapInstance
  Marker: new (options: GoogleMarkerOptions) => GoogleMarkerInstance
  LatLngBounds: new () => GoogleLatLngBoundsInstance
  DirectionsService: new () => {
    route(request: GoogleDirectionsRequest, callback: GoogleDirectionsCallback): void
  }
  DirectionsRenderer: new (options?: { suppressMarkers?: boolean }) => GoogleDirectionsRendererInstance
  TravelMode: Record<'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT', string>
}

declare global {
  interface Window {
    google?: { maps: GoogleMapsNamespace }
    __itheraGoogleMapsLoading?: Promise<void>
  }
}

export function loadGoogleMaps(apiKey: string, libraries: string[] = ['places']): Promise<void> {
  if (!apiKey) return Promise.reject(new Error('Falta VITE_GOOGLE_MAPS_BROWSER_KEY'))
  if (window.google?.maps) return Promise.resolve()
  if (window.__itheraGoogleMapsLoading) return window.__itheraGoogleMapsLoading

  window.__itheraGoogleMapsLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ithera-google-maps="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Maps')))
      return
    }

    const script = document.createElement('script')
    script.dataset.itheraGoogleMaps = 'true'
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${libraries.join(',')}&language=es&region=MX`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'))
    document.head.appendChild(script)
  })

  return window.__itheraGoogleMapsLoading
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
    return apiClient.get<{ ok: boolean; data: PlaceResult | null }>(
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

  searchNearbyPlaces: async (
    payload: {
      latitude: number
      longitude: number
      radius: number
      includedTypes: string[]
      maxResultCount?: number
    },
    token: string
  ) => {
    return apiClient.post<{ ok: boolean; data: PlaceResult[] }>(
      '/maps/places/nearby',
      payload,
      token
    )
  },

  computeRoute: async (
    payload: {
      originLat: number
      originLng: number
      destinationLat: number
      destinationLng: number
      travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT'
    },
    token: string
  ) => {
    return apiClient.post<{ ok: boolean; data: ComputeRouteResult | null }>(
      '/maps/routes/compute',
      payload,
      token
    )
  },

  getWeather: async (latitude: number, longitude: number, token: string) => {
    return apiClient.get<{ ok: boolean; data: WeatherResult }>(
      `/maps/weather?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
      token
    )
  },
}
