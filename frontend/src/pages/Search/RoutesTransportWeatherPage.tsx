import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SearchIntegratedShell } from './SearchIntegratedShell'
import { useAuth } from '../../context/useAuth'
import { getCurrentGroup, groupsService } from '../../services/groups'
import {
  loadGoogleMaps,
  mapsService,
  type ComputeRouteResult,
  type GoogleDirectionsRendererInstance,
  type GoogleDirectionsResult,
  type GoogleLatLngLiteral,
  type GoogleMapInstance,
  type PlaceAutocompleteResult,
  type WeatherResult,
} from '../../services/maps'
import type { Group } from '../../types/groups'

type TransportMode = 'auto' | 'walk' | 'public'
type RouteState = 'empty' | 'loading' | 'result' | 'error'

const GOOGLE_MAPS_BROWSER_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined

const transportOptions: Array<{ id: TransportMode; label: string; googleMode: 'DRIVE' | 'WALK' | 'TRANSIT' }> = [
  { id: 'auto', label: 'Auto', googleMode: 'DRIVE' },
  { id: 'walk', label: 'Caminar', googleMode: 'WALK' },
  { id: 'public', label: 'Transporte', googleMode: 'TRANSIT' },
]

function IconCar() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11" stroke="currentColor" strokeWidth="2" /><rect x="3" y="11" width="18" height="7" rx="2" stroke="currentColor" strokeWidth="2" /><circle cx="7" cy="18" r="1.5" fill="currentColor" /><circle cx="17" cy="18" r="1.5" fill="currentColor" /></svg> }
function IconWalk() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="2" /><path d="M10 22l2-7M14 22l-1-7M9 9l3-2 3 3M12 7v8M7 14l3-5M16 13l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> }
function IconBus() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M5 9h14M8 19v2M16 19v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="15" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /></svg> }

function initials(name?: string | null) {
  const source = (name ?? 'Usuario').trim()
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
}


function googleTravelMode(mode: 'DRIVE' | 'WALK' | 'TRANSIT'): 'DRIVING' | 'WALKING' | 'TRANSIT' {
  if (mode === 'DRIVE') return 'DRIVING'
  if (mode === 'WALK') return 'WALKING'
  return 'TRANSIT'
}

function toCoords(value: { latitude: number | null; longitude: number | null } | null | undefined): GoogleLatLngLiteral | null {
  if (!value?.latitude || !value.longitude) return null
  return { lat: Number(value.latitude), lng: Number(value.longitude) }
}

function decodePolyline(encoded: string): GoogleLatLngLiteral[] {
  const points: GoogleLatLngLiteral[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b = 0
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

function clearDrawnRoute(polylineRef: { current: { setMap(map: GoogleMapInstance | null): void } | null }, markersRef: { current: Array<{ setMap(map: GoogleMapInstance | null): void }> }) {
  polylineRef.current?.setMap(null)
  polylineRef.current = null
  markersRef.current.forEach((marker) => marker.setMap(null))
  markersRef.current = []
}

const RoutesTransportWeatherPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { accessToken, localUser } = useAuth()
  const storedGroup = getCurrentGroup()
  const state = location.state as { destino?: string; group?: Group } | null
  const group = state?.group ?? storedGroup
  const destino = state?.destino ?? group?.destino_formatted_address ?? group?.destino ?? ''
  const fallbackStartLabel = destino || 'punto de partida del viaje'
  const [routeState, setRouteState] = useState<RouteState>('empty')
  const [transportMode, setTransportMode] = useState<TransportMode>('auto')
  const [origin, setOrigin] = useState(fallbackStartLabel)
  const [destination, setDestination] = useState('')
  const [originSuggestions, setOriginSuggestions] = useState<PlaceAutocompleteResult[]>([])
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceAutocompleteResult[]>([])
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(
    group?.destino_latitud && group.destino_longitud ? { lat: Number(group.destino_latitud), lng: Number(group.destino_longitud) } : null
  )
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [startLocationLabel, setStartLocationLabel] = useState(fallbackStartLabel)
  const [startLocationSource, setStartLocationSource] = useState<'hotel_reservado' | 'destino_viaje'>('destino_viaje')
  const [route, setRoute] = useState<ComputeRouteResult | null>(null)
  const [weather, setWeather] = useState<WeatherResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<GoogleMapInstance | null>(null)
  const directionsRenderer = useRef<GoogleDirectionsRendererInstance | null>(null)
  const routePolyline = useRef<{ setMap(map: GoogleMapInstance | null): void } | null>(null)
  const routeMarkers = useRef<Array<{ setMap(map: GoogleMapInstance | null): void }>>([])

  const user = { name: localUser?.nombre || localUser?.email || 'Usuario', role: group?.myRole === 'admin' ? 'Organizador' : 'Viajero', initials: initials(localUser?.nombre || localUser?.email), color: '#7A4FD6' }
  const selectedTransport = useMemo(() => transportOptions.find((item) => item.id === transportMode) ?? transportOptions[0], [transportMode])

  const initMap = useCallback(async () => {
    if (!mapRef.current || !GOOGLE_MAPS_BROWSER_KEY) return
    await loadGoogleMaps(GOOGLE_MAPS_BROWSER_KEY)
    const center = originCoords ?? destinationCoords ?? { lat: 15.832, lng: -96.321 }
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, { center, zoom: 13, mapTypeControl: false, streetViewControl: false, fullscreenControl: false })
      const renderer = new window.google.maps.DirectionsRenderer({ suppressMarkers: false })
      renderer.setMap(mapInstance.current)
      directionsRenderer.current = renderer
      return
    }
    mapInstance.current.setCenter(center)
  }, [originCoords, destinationCoords])

  useEffect(() => { initMap().catch(() => setMessage('No se pudo cargar Google Maps. Revisa VITE_GOOGLE_MAPS_BROWSER_KEY.')) }, [initMap])

  useEffect(() => {
    const loadTravelContext = async () => {
      if (!accessToken || !group?.id) return
      try {
        const response = await groupsService.getTravelContext(String(group.id), accessToken)
        const start = response.data?.startLocation
        const coords = toCoords({ latitude: start?.latitude ?? null, longitude: start?.longitude ?? null })
        const label = start?.formattedAddress || start?.label || fallbackStartLabel
        setStartLocationLabel(label)
        setStartLocationSource(start?.source ?? 'destino_viaje')
        setOrigin(label)
        if (coords) setOriginCoords(coords)
      } catch {
        setStartLocationLabel(fallbackStartLabel)
      }
    }
    void loadTravelContext()
  }, [accessToken, group?.id, fallbackStartLabel])

  useEffect(() => {
    const run = async () => {
      if (!accessToken || originCoords || !fallbackStartLabel) return
      try {
        const response = await mapsService.searchDestination(fallbackStartLabel, accessToken)
        setOriginCoords(toCoords(response.data))
      } catch { setMessage('No se pudo geocodificar el punto de partida del viaje.') }
    }
    void run()
  }, [accessToken, fallbackStartLabel, originCoords])

  useEffect(() => {
    const loadWeather = async () => {
      if (!accessToken || !originCoords) return
      try {
        const response = await mapsService.getWeather(originCoords.lat, originCoords.lng, accessToken)
        setWeather(response.data)
      } catch { setMessage('No se pudo cargar el clima real.') }
    }
    void loadWeather()
  }, [accessToken, originCoords])

  const loadSuggestions = useCallback((value: string, setter: (items: PlaceAutocompleteResult[]) => void) => {
    if (!accessToken || value.trim().length < 3) { setter([]); return undefined }
    const timeout = window.setTimeout(async () => {
      try {
        const response = await mapsService.autocompletePlaces(value, accessToken, {
          latitude: originCoords?.lat ?? destinationCoords?.lat,
          longitude: originCoords?.lng ?? destinationCoords?.lng,
          radius: 12000,
        })
        setter((response.data ?? []).slice(0, 5))
      } catch { setter([]) }
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [accessToken, originCoords, destinationCoords])

  useEffect(() => loadSuggestions(origin, setOriginSuggestions), [origin, loadSuggestions])
  useEffect(() => loadSuggestions(destination, setDestinationSuggestions), [destination, loadSuggestions])

  const selectSuggestion = async (suggestion: PlaceAutocompleteResult, target: 'origin' | 'destination') => {
    if (!accessToken) return
    try {
      const response = await mapsService.getPlaceDetails(suggestion.placeId, accessToken)
      const coords = toCoords(response.data)
      if (!coords) throw new Error('El lugar no tiene coordenadas')
      if (target === 'origin') {
        setOrigin(suggestion.description)
        setOriginCoords(coords)
        setOriginSuggestions([])
      } else {
        setDestination(suggestion.description)
        setDestinationCoords(coords)
        setDestinationSuggestions([])
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo seleccionar el lugar') }
  }

  const geocodeManual = async (value: string) => {
    if (!accessToken) return null
    const response = await mapsService.searchDestination(value, accessToken)
    return toCoords(response.data)
  }

  const handleCalculateRoute = async () => {
    if (!accessToken) return
    setRouteState('loading')
    setMessage(null)
    try {
      const nextOrigin = originCoords ?? await geocodeManual(origin)
      const nextDestination = destinationCoords ?? await geocodeManual(destination)
      if (!nextOrigin || !nextDestination) throw new Error('Selecciona un origen y destino válidos')
      setOriginCoords(nextOrigin)
      setDestinationCoords(nextDestination)

      const response = await mapsService.computeRoute({ originLat: nextOrigin.lat, originLng: nextOrigin.lng, destinationLat: nextDestination.lat, destinationLng: nextDestination.lng, travelMode: selectedTransport.googleMode }, accessToken)
      if (!response.data) throw new Error('Google Routes no devolvió ruta')
      setRoute(response.data)
      setRouteState('result')

      if (mapInstance.current && window.google?.maps) {
        clearDrawnRoute(routePolyline, routeMarkers)
        const path = response.data.encodedPolyline ? decodePolyline(response.data.encodedPolyline) : []
        if (path.length > 0) {
          const googleMaps = window.google.maps as unknown as {
            Polyline: new (options: Record<string, unknown>) => { setMap(map: GoogleMapInstance | null): void }
            Marker: new (options: Record<string, unknown>) => { setMap(map: GoogleMapInstance | null): void }
            LatLngBounds: new () => { extend(position: GoogleLatLngLiteral): void }
          }
          routePolyline.current = new googleMaps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#1E6FD9',
            strokeOpacity: 0.95,
            strokeWeight: 6,
            map: mapInstance.current,
          })
          routeMarkers.current = [
            new googleMaps.Marker({ map: mapInstance.current, position: nextOrigin, title: 'Origen' }),
            new googleMaps.Marker({ map: mapInstance.current, position: nextDestination, title: 'Destino' }),
          ]
          const bounds = new googleMaps.LatLngBounds()
          path.forEach((point) => bounds.extend(point))
          mapInstance.current.fitBounds(bounds, 70)
        } else if (directionsRenderer.current) {
          const service = new window.google.maps.DirectionsService()
          service.route({ origin: nextOrigin, destination: nextDestination, travelMode: window.google.maps.TravelMode[googleTravelMode(selectedTransport.googleMode)] }, (result: GoogleDirectionsResult | null, status: string) => {
            if (status === 'OK' && result) directionsRenderer.current?.setDirections(result)
          })
        }
      }
    } catch (error) {
      setRouteState('error')
      setMessage(error instanceof Error ? error.message : 'No se pudo calcular la ruta')
    }
  }

  const renderTransportIcon = (id: TransportMode) => {
    if (id === 'auto') return <IconCar />
    if (id === 'walk') return <IconWalk />
    return <IconBus />
  }

  return (
    <SearchIntegratedShell group={group} user={user}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F8FC]">
        <div className="relative min-h-[760px] pb-6">
          <main className="relative min-h-[760px] overflow-hidden rounded-none bg-[#EAF3FB]">
            <div ref={mapRef} className="absolute inset-0 bg-[#EAF3FB]" />

            <header className="absolute left-0 right-0 top-0 z-20 border-b border-gray-100 bg-white/95 px-6 py-4 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate(group?.id ? `/dashboard?groupId=${encodeURIComponent(String(group.id))}` : '/dashboard', { state: group ? { groupId: group.id, group, activeTab: 'buscar' } : { activeTab: 'buscar' } })}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#1E0A4E] transition-colors hover:bg-gray-50"
                >
                  ← Volver
                </button>
                <div className="min-w-0">
                  <h1 className="font-heading text-2xl font-bold leading-tight text-[#1E0A4E]">Rutas y Transporte</h1>
                  <p className="mt-0.5 truncate text-sm text-gray-500">La ruta inicia desde {startLocationSource === 'hotel_reservado' ? 'tu hotel reservado' : 'el destino configurado'}: {startLocationLabel}.</p>
                </div>
              </div>
            </header>

            <section className="absolute left-4 right-4 top-28 z-10 max-h-[calc(100%-170px)] overflow-visible rounded-2xl border border-gray-100 bg-white p-5 shadow-lg sm:left-6 sm:right-auto sm:w-80">
              <h2 className="mb-4 font-heading text-lg font-bold text-[#1E0A4E]">Calcular ruta</h2>
              <AutoInput label="Desde" value={origin} onChange={(value) => { setOrigin(value); setOriginCoords(null) }} placeholder="Hotel reservado, aeropuerto, punto de salida..." suggestions={originSuggestions} onSelect={(suggestion) => void selectSuggestion(suggestion, 'origin')} />
              <div className="my-3 text-center text-gray-400">↕</div>
              <AutoInput label="Hasta" value={destination} onChange={(value) => { setDestination(value); setDestinationCoords(null) }} placeholder="Destino final" suggestions={destinationSuggestions} onSelect={(suggestion) => void selectSuggestion(suggestion, 'destination')} />

              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">Modo de transporte</p>
                <div className="grid grid-cols-3 rounded-xl bg-[#F4F6F8] p-1">
                  {transportOptions.map((option) => <button key={option.id} onClick={() => setTransportMode(option.id)} className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 text-xs transition-colors ${transportMode === option.id ? 'bg-white text-[#1E6FD9] shadow-sm' : 'text-gray-500'}`}>{renderTransportIcon(option.id)}{option.label}</button>)}
                </div>
              </div>

              <button onClick={() => void handleCalculateRoute()} disabled={routeState === 'loading'} className="mt-5 w-full rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1557B0] disabled:bg-[#8DB8EF]">{routeState === 'loading' ? 'Calculando ruta...' : 'Calcular ruta'}</button>
              {message && <p className="mt-3 text-xs text-gray-500">{message}</p>}
            </section>

            <WeatherPanel weather={weather} destination={startLocationLabel} />

            {routeState === 'result' && route && (
              <div className="absolute bottom-40 left-1/2 z-10 w-72 -translate-x-1/2 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-lg">
                <p className="text-2xl">{transportMode === 'auto' ? '🚙' : transportMode === 'walk' ? '🚶' : '🚌'}</p>
                <p className="mt-1 font-heading text-xl font-bold text-[#1E0A4E]">{route.durationText ?? route.staticDurationText ?? 'Ruta calculada'}</p>
                <p className="text-sm text-gray-500">{route.distanceText ?? 'Distancia no disponible'} · Ruta más rápida</p>
              </div>
            )}

            <div className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white px-5 py-3 text-sm text-[#1E0A4E] shadow-lg">
              <button onClick={() => { if (mapInstance.current && originCoords) mapInstance.current.panTo(originCoords) }} className="font-semibold">Centrar en punto de partida</button>
              <span className="text-gray-400">Google Maps + WeatherAPI</span>
            </div>
          </main>
        </div>
      </div>
    </SearchIntegratedShell>
  )
}

function AutoInput({ label, value, onChange, placeholder, suggestions, onSelect }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; suggestions: PlaceAutocompleteResult[]; onSelect: (suggestion: PlaceAutocompleteResult) => void }) {
  const [focused, setFocused] = useState(false)
  const showSuggestions = focused && value.trim().length >= 3 && suggestions.length > 0

  return (
    <label className="relative block text-xs font-bold uppercase text-gray-500">
      {label}
      <input
        value={value}
        onChange={(event) => { onChange(event.target.value); setFocused(event.target.value.trim().length >= 3) }}
        onFocus={() => setFocused(value.trim().length >= 3)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#F8FAFC] px-4 py-3 text-sm normal-case text-[#1E0A4E] outline-none transition-colors focus:border-[#1E6FD9] focus:bg-white"
        placeholder={placeholder}
      />
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-64 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1 normal-case shadow-2xl">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { setFocused(false); onSelect(suggestion) }}
              className="w-full rounded-xl px-4 py-3 text-left transition-colors hover:bg-[#F4F8FC]"
            >
              <p className="text-sm font-semibold text-[#1E0A4E]">{suggestion.mainText}</p>
              <p className="line-clamp-1 text-xs text-gray-500">{suggestion.secondaryText}</p>
            </button>
          ))}
        </div>
      )}
    </label>
  )
}

function WeatherIcon({ iconUrl, icon, description, size = 'md' }: { iconUrl?: string | null; icon?: string | null; description?: string | null; size?: 'sm' | 'md' }) {
  const imageClassName = size === 'sm' ? 'h-6 w-6 object-contain' : 'h-11 w-11 object-contain'
  const textClassName = size === 'sm' ? 'text-lg leading-none' : 'text-3xl leading-none'

  return iconUrl ? (
    <img src={iconUrl} alt={description || 'Clima'} className={imageClassName} />
  ) : (
    <span className={textClassName}>{icon || '☀️'}</span>
  )
}

function WeatherPanel({ weather, destination }: { weather: WeatherResult | null; destination: string }) {
  return (
    <section className="absolute right-6 top-28 z-10 w-[260px] rounded-3xl border border-gray-100 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-bold text-[#1E0A4E]">Pronóstico del clima</h2>
          <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-gray-500">{destination}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#F4F8FC] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#1E6FD9]">Actual</span>
      </div>

      {!weather ? (
        <div className="space-y-1">
          <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-[#F8FAFC] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7D6]">
                <WeatherIcon iconUrl={weather.current.iconUrl} icon={weather.current.icon} description={weather.current.description} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1">
                  <p className="font-heading text-4xl font-bold leading-none text-[#1E0A4E]">{Math.round(weather.current.temperature ?? 0)}</p>
                  <span className="pt-0.5 font-heading text-xl font-bold text-[#1E0A4E]">°</span>
                </div>
                <p className="mt-1.5 line-clamp-1 text-xs font-semibold leading-tight text-[#1E0A4E]">{weather.current.description}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Próximos días</p>
            <div className="space-y-1">
              {weather.forecast.map((day) => (
                <div key={day.date} className="grid grid-cols-[1fr_28px_auto] items-center gap-2 rounded-xl px-1.5 py-1 text-xs transition-colors hover:bg-[#F8FAFC]">
                  <span className="min-w-0 truncate font-semibold text-[#1E0A4E]">{day.day}</span>
                  <span className="flex justify-center">
                    <WeatherIcon iconUrl={day.iconUrl} icon={day.icon} description={day.description} size="sm" />
                  </span>
                  <span className="whitespace-nowrap text-right text-gray-500">
                    {Math.round(day.min ?? 0)}° / <b className="text-[#1E0A4E]">{Math.round(day.max ?? 0)}°</b>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <Metric value={`${Math.round(weather.current.windSpeed ?? 0)}`} label="km/h" />
            <Metric value={`${weather.current.relativeHumidity ?? 0}%`} label="Humedad" />
            <Metric value={`${weather.current.precipitationProbability ?? 0}%`} label="Lluvia" />
          </div>
        </>
      )}
    </section>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] px-1.5 py-2 text-center">
      <p className="font-heading text-base font-bold leading-none text-[#1E6FD9]">{value}</p>
      <p className="mt-0.5 text-[9px] font-semibold text-gray-500">{label}</p>
    </div>
  )
}

export default RoutesTransportWeatherPage
