import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SearchIntegratedShell } from './SearchIntegratedShell'
import { useAuth } from '../../context/useAuth'
import { getCurrentGroup, groupsService } from '../../services/groups'
import {
  loadGoogleMaps,
  mapsService,
  type GoogleMapInstance,
  type GoogleMarkerInstance,
  type PlaceAutocompleteResult,
  type PlaceResult,
} from '../../services/maps'
import type { Group } from '../../types/groups'

type ViewMode = 'empty' | 'loading' | 'results' | 'error'

type MapMarker = {
  marker: GoogleMarkerInstance
  placeId: string
}

const GOOGLE_MAPS_BROWSER_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&h=500&fit=crop'

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#FEE2E2" />
      <path d="M12 7v6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function initials(name?: string | null) {
  const source = (name ?? 'Usuario').trim()
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
}

function buildTripDays(group: Group | null) {
  if (!group?.fecha_inicio || !group?.fecha_fin) return []
  const start = new Date(`${group.fecha_inicio}T12:00:00`)
  const end = new Date(`${group.fecha_fin}T12:00:00`)
  const days: Array<{ value: string; label: string; isoDate: string }> = []
  let index = 1
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const isoDate = cursor.toISOString().slice(0, 10)
    const label = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: '2-digit', month: 'short' }).format(cursor)
    days.push({ value: String(index), label: `Día ${index} · ${label}`, isoDate })
    index += 1
  }
  return days
}

function buildDateTime(group: Group | null, dayValue: string, timeValue: string) {
  const days = buildTripDays(group)
  const selected = days.find((day) => day.value === dayValue) ?? days[0]
  if (!selected) return null
  return `${selected.isoDate}T${timeValue}:00`
}

function distanceMetersFromDestination(place: PlaceResult, destinationCoords: { lat: number; lng: number } | null) {
  if (!destinationCoords || place.latitude == null || place.longitude == null) return Number.POSITIVE_INFINITY
  const toRad = (n: number) => (n * Math.PI) / 180
  const r = 6371000
  const dLat = toRad(Number(place.latitude) - destinationCoords.lat)
  const dLng = toRad(Number(place.longitude) - destinationCoords.lng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(destinationCoords.lat)) * Math.cos(toRad(Number(place.latitude))) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalizeCategory(value?: string | null) {
  if (!value) return 'Lugar'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function buildDescription(place: PlaceResult) {
  return place.editorialSummary || `Lugar ubicado en ${place.formattedAddress ?? 'el destino del viaje'}. Revisa los detalles para decidir si conviene proponerlo al itinerario.`
}

function buildMapsUrl(place: PlaceResult) {
  if (place.googleMapsUri) return place.googleMapsUri
  if (place.id) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name ?? 'Lugar')}&query_place_id=${encodeURIComponent(place.id)}`
  if (place.latitude && place.longitude) return `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
  return 'https://www.google.com/maps'
}

const CATEGORY_QUERIES = [
  { label: '🍽️ Restaurantes', query: 'restaurantes' },
  { label: '🏛️ Museos', query: 'museos' },
  { label: '🌳 Parques', query: 'parques' },
  { label: '⭐ Populares', query: 'atracciones populares' },
]

const MapPlacesPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { accessToken, localUser } = useAuth()
  const storedGroup = getCurrentGroup()
  const state = location.state as { destino?: string; group?: Group } | null
  const group = state?.group ?? storedGroup
  const destino = state?.destino ?? group?.destino_formatted_address ?? group?.destino ?? ''
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('empty')
  const [places, setPlaces] = useState<PlaceResult[]>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(
    group?.destino_latitud && group?.destino_longitud
      ? { lat: Number(group.destino_latitud), lng: Number(group.destino_longitud) }
      : null
  )
  const [routeInfo, setRouteInfo] = useState<{ distanceText?: string | null; durationText?: string | null } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [proposalDay, setProposalDay] = useState('1')
  const [proposalTime, setProposalTime] = useState('12:00')
  const [proposalSaving, setProposalSaving] = useState(false)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<GoogleMapInstance | null>(null)
  const markers = useRef<MapMarker[]>([])

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? places[0] ?? null,
    [places, selectedPlaceId]
  )

  const user = {
    name: localUser?.nombre || localUser?.email || 'Usuario',
    role: group?.myRole === 'admin' ? 'Organizador' : 'Viajero',
    initials: initials(localUser?.nombre || localUser?.email),
    color: '#7A4FD6',
  }

  const tripDays = useMemo(() => buildTripDays(group), [group])

  const clearMarkers = useCallback(() => {
    markers.current.forEach(({ marker }) => marker.setMap(null))
    markers.current = []
  }, [])

  const initMap = useCallback(async () => {
    if (!mapRef.current || !GOOGLE_MAPS_BROWSER_KEY) return
    await loadGoogleMaps(GOOGLE_MAPS_BROWSER_KEY)
    const center = destinationCoords ?? { lat: 15.832, lng: -96.321 }

    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
      return
    }

    mapInstance.current.setCenter(center)
  }, [destinationCoords])

  useEffect(() => {
    initMap().catch(() => setMessage('No se pudo cargar el mapa interactivo. Revisa VITE_GOOGLE_MAPS_BROWSER_KEY.'))
  }, [initMap])

  useEffect(() => {
    const loadDestination = async () => {
      if (destinationCoords || !destino || !accessToken) return
      try {
        const response = await mapsService.searchDestination(destino, accessToken)
        if (response.data?.latitude && response.data.longitude) {
          setDestinationCoords({ lat: response.data.latitude, lng: response.data.longitude })
        }
      } catch {
        setMessage('No se pudieron resolver las coordenadas del destino.')
      }
    }
    void loadDestination()
  }, [accessToken, destino, destinationCoords])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    clearMarkers()

    if (destinationCoords) {
      const marker = new window.google.maps.Marker({
        map,
        position: destinationCoords,
        title: destino,
        icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      })
      markers.current.push({ marker, placeId: 'destination' })
    }

    const bounds = new window.google.maps.LatLngBounds()
    if (destinationCoords) bounds.extend(destinationCoords)

    places.forEach((place) => {
      if (place.latitude === null || place.longitude === null || place.latitude === undefined || place.longitude === undefined) return
      const position = { lat: Number(place.latitude), lng: Number(place.longitude) }
      bounds.extend(position)
      const marker = new window.google.maps.Marker({ map, position, title: place.name ?? 'Lugar' })
      marker.addListener('click', () => setSelectedPlaceId(place.id))
      markers.current.push({ marker, placeId: place.id ?? '' })
    })

    if (places.length > 1) {
      map.fitBounds(bounds, 70)
    } else if (places.length === 1 && places[0]?.latitude != null && places[0]?.longitude != null) {
      map.panTo({ lat: Number(places[0].latitude), lng: Number(places[0].longitude) })
    } else if (destinationCoords) {
      map.panTo(destinationCoords)
    }
  }, [places, destinationCoords, destino, clearMarkers])

  useEffect(() => {
    if (!accessToken || query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await mapsService.autocompletePlaces(query.trim(), accessToken)
        setSuggestions(response.data ?? [])
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [accessToken, query])

  const calculateDistanceToSelected = useCallback(async (place: PlaceResult | null) => {
    if (!place?.latitude || !place.longitude || !destinationCoords || !accessToken) {
      setRouteInfo(null)
      return
    }

    try {
      const route = await mapsService.computeRoute({
        originLat: destinationCoords.lat,
        originLng: destinationCoords.lng,
        destinationLat: Number(place.latitude),
        destinationLng: Number(place.longitude),
        travelMode: 'DRIVE',
      }, accessToken)
      setRouteInfo({ distanceText: route.data?.distanceText, durationText: route.data?.durationText })
    } catch {
      setRouteInfo(null)
    }
  }, [accessToken, destinationCoords])

  useEffect(() => {
    void calculateDistanceToSelected(selectedPlace)
  }, [selectedPlace, calculateDistanceToSelected])

  const handleSearch = async (text = query) => {
    if (!accessToken) return
    const clean = text.trim()
    if (!clean) return
    setViewMode('loading')
    setMessage(null)
    setShowSuggestions(false)

    try {
      const response = await mapsService.searchPlacesByText({
        textQuery: clean,
        latitude: destinationCoords?.lat,
        longitude: destinationCoords?.lng,
        radius: 7000,
        maxResultCount: 10,
      }, accessToken)

      const nextPlaces = [...(response.data ?? [])].sort(
        (a, b) => distanceMetersFromDestination(a, destinationCoords) - distanceMetersFromDestination(b, destinationCoords)
      )
      setPlaces(nextPlaces)
      setSelectedPlaceId(nextPlaces[0]?.id ?? null)
      setViewMode(nextPlaces.length ? 'results' : 'empty')
      if (!nextPlaces.length) setMessage('No encontramos resultados para esa búsqueda.')
    } catch (error) {
      setViewMode('error')
      setMessage(error instanceof Error ? error.message : 'Error al buscar lugares')
    }
  }

  const handleSuggestion = async (suggestion: PlaceAutocompleteResult) => {
    if (!accessToken) return
    setQuery(suggestion.mainText || suggestion.description)
    setShowSuggestions(false)
    setViewMode('loading')
    try {
      const detail = await mapsService.getPlaceDetails(suggestion.placeId, accessToken)
      const place = detail.data
      if (!place) throw new Error('No se encontró el detalle del lugar')
      setPlaces([place])
      setSelectedPlaceId(place.id)
      setViewMode('results')
    } catch (error) {
      setViewMode('error')
      setMessage(error instanceof Error ? error.message : 'Error al cargar detalle')
    }
  }

  const handlePropose = async () => {
    if (!group?.id || !selectedPlace || !accessToken) return
    setProposalOpen(true)
  }

  const handleConfirmProposal = async () => {
    if (!group?.id || !selectedPlace || !accessToken) return
    const activityDate = buildDateTime(group, proposalDay, proposalTime)
    setMessage(null)
    setProposalSaving(true)
    try {
      await groupsService.createActivity(group.id, {
        titulo: selectedPlace.name ?? 'Actividad propuesta',
        descripcion: buildDescription(selectedPlace),
        ubicacion: selectedPlace.formattedAddress,
        latitud: selectedPlace.latitude,
        longitud: selectedPlace.longitude,
        fecha_inicio: activityDate,
        fecha_fin: activityDate,
        referencia_externa: selectedPlace.id,
        fuente: 'google_maps',
        payload: {
          place: selectedPlace,
          route: routeInfo,
          googlePlaceId: selectedPlace.id,
          photoName: selectedPlace.photoName ?? null,
          photoUrl: selectedPlace.photoUrl ?? null,
          imageUrl: selectedPlace.photoUrl ?? null,
          selectedDay: proposalDay,
          selectedTime: proposalTime,
        },
      }, accessToken)
      setProposalOpen(false)
      setMessage('Lugar propuesto correctamente al itinerario.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo proponer el lugar')
    } finally {
      setProposalSaving(false)
    }
  }

  return (
    <SearchIntegratedShell group={group} user={user}>
      <div className="flex-1 overflow-y-auto bg-[#F4F8FC]">
        <div className="flex min-h-[760px] flex-col pb-6">
          <header className="flex items-center gap-4 border-b border-gray-100 bg-white px-6 py-4">
            <button onClick={() => navigate(group?.id ? `/dashboard?groupId=${encodeURIComponent(String(group.id))}` : '/dashboard', { state: group ? { groupId: group.id, group, activeTab: 'buscar' } : { activeTab: 'buscar' } })} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#1E0A4E] hover:bg-gray-50">Volver</button>
            <div className="relative flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3 text-gray-500 shadow-sm">
              <IconSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setShowSuggestions(Boolean(suggestions.length))}
                onKeyDown={(event) => { if (event.key === 'Enter') void handleSearch() }}
                className="w-full bg-transparent text-sm text-[#1E0A4E] outline-none placeholder:text-gray-400"
                placeholder="Buscar lugares, restaurantes, actividades..."
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                  {suggestions.map((suggestion) => (
                    <button key={suggestion.placeId} onClick={() => void handleSuggestion(suggestion)} className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-[#F4F8FC]">
                      <p className="text-sm font-semibold text-[#1E0A4E]">{suggestion.mainText}</p>
                      <p className="text-xs text-gray-500">{suggestion.secondaryText}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => void handleSearch()} className="rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]">Buscar</button>
          </header>

          <main className="relative min-h-[620px] flex-1 overflow-hidden">
            <div ref={mapRef} className="absolute inset-0 bg-[#EAF3FB]" />

            {viewMode === 'empty' && (
              <aside className="absolute left-6 top-6 z-10 w-72 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#E8F0FF] text-[#1E6FD9]"><IconSearch /></div>
                <h1 className="font-heading text-xl font-bold text-[#1E0A4E]">Busca lugares para comenzar</h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">Encuentra actividades, restaurantes y sitios de interés cerca de {destino || 'tu destino'}.</p>
                <div className="mt-5 border-t border-gray-100 pt-5">
                  <p className="mb-3 text-xs font-bold uppercase text-[#1E0A4E]">Categorías sugeridas</p>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORY_QUERIES.map((item) => (
                      <button key={item.query} onClick={() => { setQuery(item.query); void handleSearch(item.query) }} className="rounded-xl bg-[#F4F6F8] px-3 py-4 text-xs text-[#1E0A4E] hover:bg-[#EAF2FF]">{item.label}</button>
                    ))}
                  </div>
                </div>
              </aside>
            )}

            {viewMode === 'loading' && <LoadingPanel />}

            {viewMode === 'results' && (
              <aside className="absolute left-6 top-6 z-10 max-h-[520px] w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
                <div className="p-5">
                  <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">Lugares de interés</h2>
                  <p className="mt-1 text-sm text-gray-500">{places.length} resultados</p>
                </div>
                <div className="max-h-[395px] overflow-y-auto">
                  {places.map((place) => (
                    <button key={place.id ?? place.name} onClick={() => setSelectedPlaceId(place.id)} className={`flex w-full gap-3 border-t border-gray-100 p-4 text-left transition-colors ${selectedPlaceId === place.id ? 'border-l-4 border-l-[#1E6FD9] bg-[#EAF2FF]' : 'hover:bg-gray-50'}`}>
                      <img src={place.photoUrl ?? FALLBACK_IMAGE} alt={place.name ?? 'Lugar'} className="h-14 w-14 rounded-xl object-cover" />
                      <div>
                        <h3 className="font-semibold text-[#1E0A4E]">{place.name}</h3>
                        <p className="line-clamp-2 text-xs text-gray-500">{place.formattedAddress}</p>
                        <p className="mt-1 text-xs text-[#F59E0B]">★ {place.rating ?? 'N/D'} <span className="text-gray-400">({place.userRatingCount ?? 0})</span></p>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>
            )}

            {viewMode === 'error' && <ErrorPanel message={message} onRetry={() => void handleSearch()} onReset={() => setViewMode('empty')} />}

            {selectedPlace && viewMode !== 'error' && viewMode !== 'empty' && (
              <PlaceDetailCard place={selectedPlace} routeInfo={routeInfo} onDetail={() => setDetailOpen(true)} onPropose={() => void handlePropose()} />
            )}

            <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white px-5 py-3 text-sm text-[#1E0A4E] shadow-lg">
              <button onClick={() => { if (mapInstance.current && destinationCoords) mapInstance.current.panTo(destinationCoords) }} className="font-semibold">Centrar mapa</button>
              <span className="text-gray-400">Google Maps</span>
            </div>

            {message && viewMode !== 'error' && (
              <div className="absolute bottom-8 right-8 z-20 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#1E0A4E] shadow-lg">{message}</div>
            )}

            {proposalOpen && selectedPlace && (
              <ProposalModal
                place={selectedPlace}
                tripDays={tripDays}
                selectedDay={proposalDay}
                selectedTime={proposalTime}
                saving={proposalSaving}
                onDayChange={setProposalDay}
                onTimeChange={setProposalTime}
                onClose={() => !proposalSaving && setProposalOpen(false)}
                onConfirm={() => void handleConfirmProposal()}
              />
            )}

            {detailOpen && selectedPlace && <PlaceModal place={selectedPlace} onClose={() => setDetailOpen(false)} onPropose={() => void handlePropose()} />}
          </main>
        </div>
      </div>
    </SearchIntegratedShell>
  )
}

function LoadingPanel() {
  return (
    <aside className="absolute left-6 top-6 z-10 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
      <div className="p-5"><h2 className="font-heading text-xl font-bold text-[#1E0A4E]">Lugares de interés</h2><div className="mt-2 h-4 w-20 animate-pulse rounded bg-gray-200" /></div>
      {[1, 2, 3, 4].map((item) => <div key={item} className="flex animate-pulse gap-3 border-t border-gray-100 p-4"><div className="h-14 w-14 rounded-xl bg-gray-200" /><div className="flex-1 space-y-2"><div className="h-4 w-28 rounded bg-gray-200" /><div className="h-3 w-20 rounded bg-gray-200" /></div></div>)}
      <p className="border-t border-gray-100 p-4 text-center text-xs text-gray-500">Buscando lugares cercanos...</p>
    </aside>
  )
}

function ErrorPanel({ message, onRetry, onReset }: { message: string | null; onRetry: () => void; onReset: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/30">
      <div className="w-80 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl">
        <div className="mb-4 flex justify-center"><IconAlert /></div>
        <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">No pudimos cargar los lugares</h2>
        <p className="mt-2 text-sm text-gray-500">{message ?? 'Intenta nuevamente.'}</p>
        <button onClick={onRetry} className="mt-5 w-full rounded-xl bg-[#1E6FD9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]">Reintentar búsqueda</button>
        <button onClick={onReset} className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#1E0A4E]">Modificar búsqueda</button>
      </div>
    </div>
  )
}

function PlaceDetailCard({ place, routeInfo, onDetail, onPropose }: { place: PlaceResult; routeInfo: { distanceText?: string | null; durationText?: string | null } | null; onDetail: () => void; onPropose: () => void }) {
  return (
    <aside className="absolute right-6 top-6 z-10 max-h-[520px] w-80 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-lg">
      <img src={place.photoUrl ?? FALLBACK_IMAGE} alt={place.name ?? 'Lugar'} className="h-36 w-full object-cover" />
      <div className="p-5">
        <span className="rounded-full bg-[#E8F0FF] px-3 py-1 text-xs font-semibold text-[#1E6FD9]">{normalizeCategory(place.primaryCategory)}</span>
        <h2 className="mt-4 font-heading text-2xl font-bold text-[#1E0A4E]">{place.name}</h2>
        <p className="text-sm text-gray-500">{place.formattedAddress}</p>
        <p className="mt-3 text-sm text-[#F59E0B]">★★★★★ <span className="font-semibold text-[#1E0A4E]">{place.rating ?? 'N/D'}</span> <span className="text-gray-500">({place.userRatingCount ?? 0} reseñas)</span></p>
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-gray-500">{buildDescription(place)}</p>
        <div className="mt-4 space-y-2 text-sm text-gray-500">
          <p><span className="font-semibold text-[#1E0A4E]">Distancia:</span> {routeInfo?.distanceText ?? 'Calculando...'}</p>
          <p><span className="font-semibold text-[#1E0A4E]">Tiempo:</span> {routeInfo?.durationText ?? 'Calculando...'}</p>
          <p><span className="font-semibold text-[#1E0A4E]">Web:</span> {place.websiteUri ? 'Disponible' : 'No disponible'}</p>
        </div>
        <button onClick={onPropose} className="mt-5 w-full rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]">+ Proponer al itinerario</button>
        <button onClick={onDetail} className="mt-3 w-full rounded-xl border border-[#1E6FD9] px-5 py-3 text-sm font-semibold text-[#1E6FD9] hover:bg-[#EAF2FF]">Ver detalles del lugar</button>
      </div>
    </aside>
  )
}

function PlaceModal({ place, onClose, onPropose }: { place: PlaceResult; onClose: () => void; onPropose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
      <div className="max-h-[84vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="relative h-44"><img src={place.photoUrl ?? FALLBACK_IMAGE} alt={place.name ?? 'Lugar'} className="h-full w-full rounded-t-2xl object-cover" /><button onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1E0A4E] shadow"><IconClose /></button></div>
        <div className="p-6">
          <span className="rounded-full bg-[#E8F0FF] px-3 py-1 text-xs font-semibold text-[#1E6FD9]">{normalizeCategory(place.primaryCategory)}</span>
          <h2 className="mt-4 font-heading text-2xl font-bold text-[#1E0A4E]">{place.name}</h2>
          <p className="mt-1 text-sm text-gray-500">{place.formattedAddress}</p>
          <p className="mt-4 text-sm text-[#F59E0B]">★★★★★ <span className="font-semibold text-[#1E0A4E]">{place.rating ?? 'N/D'}</span> <span className="text-gray-500">({place.userRatingCount ?? 0} reseñas)</span></p>
          <div className="mt-5 border-t border-gray-100 pt-5"><h3 className="font-semibold text-[#1E0A4E]">Descripción</h3><p className="mt-2 text-sm leading-relaxed text-gray-500">{buildDescription(place)}</p></div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoBox label="Horario" value={place.regularOpeningHours?.weekdayDescriptions?.join(' · ') ?? 'No disponible'} />
            <InfoBox label="Teléfono" value={place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? 'No disponible'} />
            <InfoBox label="Sitio web" value={place.websiteUri ?? 'No disponible'} />
            <InfoBox label="Google Maps" value="Abrir ubicación" href={buildMapsUrl(place)} />
            <InfoBox label="Categoría" value={normalizeCategory(place.primaryCategory)} />
            <InfoBox label="Precio" value={place.priceLevel ?? 'No disponible'} />
          </div>
          <div className="mt-6 flex gap-3"><button onClick={onPropose} className="flex-1 rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]">+ Proponer al itinerario</button><button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-[#1E0A4E]">Cerrar</button></div>
        </div>
      </div>
    </div>
  )
}

function ProposalModal({ place, tripDays, selectedDay, selectedTime, saving, onDayChange, onTimeChange, onClose, onConfirm }: { place: PlaceResult; tripDays: Array<{ value: string; label: string }>; selectedDay: string; selectedTime: string; saving: boolean; onDayChange: (value: string) => void; onTimeChange: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">Programar actividad</h2>
        <p className="mt-2 text-sm text-gray-500">Elige el día del viaje y la hora estimada para proponer <b>{place.name}</b>.</p>
        <div className="mt-5 space-y-4">
          <label className="block text-xs font-bold uppercase text-gray-500">Día del viaje
            <select value={selectedDay} onChange={(event) => onDayChange(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3 text-sm normal-case text-[#1E0A4E] outline-none focus:border-[#1E6FD9]">
              {(tripDays.length ? tripDays : [{ value: '1', label: 'Día 1' }]).map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase text-gray-500">Hora estimada
            <input type="time" value={selectedTime} onChange={(event) => onTimeChange(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3 text-sm normal-case text-[#1E0A4E] outline-none focus:border-[#1E6FD9]" />
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#1E0A4E] disabled:opacity-50">Cancelar</button>
          <button onClick={onConfirm} disabled={saving} className="flex-1 rounded-xl bg-[#1E6FD9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1557B0] disabled:bg-[#8DB8EF]">{saving ? 'Proponiendo...' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}

function InfoBox({ label, value, href }: { label: string; value: string; href?: string }) {
  return <div className="rounded-xl bg-[#F8FAFC] p-4"><p className="text-xs font-bold uppercase text-gray-400">{label}</p>{href ? <a href={href} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-semibold text-[#1E6FD9]">{value}</a> : <p className="mt-1 text-sm font-semibold text-[#1E0A4E]">{value}</p>}</div>
}

export default MapPlacesPage
