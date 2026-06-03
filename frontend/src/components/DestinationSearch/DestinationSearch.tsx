import { useEffect, useRef, useState } from 'react'
import { isNetworkError } from '../../services/apiClient'
import {
  mapsService,
  type GeocodingResult,
  type PlaceAutocompleteResult,
} from '../../services/maps'

type DestinationSearchProps = {
  value: string
  onChange: (value: string, result?: GeocodingResult) => void
  token?: string | null
  error?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  lockedValue?: boolean
}

export function DestinationSearch({
  value,
  onChange,
  token,
  error,
  label = 'Destino',
  placeholder = 'Ej: Cancún, México',
  disabled = false,
  lockedValue = false,
}: DestinationSearchProps) {
  const [search, setSearch] = useState(value)
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [localError, setLocalError] = useState('')
  const [selected, setSelected] = useState(false)
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    const updateOnlineState = () => {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine
      setIsOffline(offline)
      if (!offline) setLocalError((current) => current.startsWith('Sin conexión') ? '' : current)
    }
    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)
    updateOnlineState()
    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  useEffect(() => {
    setSearch(value)
    if (lockedValue && value.trim()) {
      setSelected(true)
      setSuggestions([])
    }
  }, [lockedValue, value])

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)

    if (disabled || lockedValue || !search.trim() || search.trim().length < 3 || selected) {
      setSuggestions([])
      return
    }

    if (isOffline) {
      setSuggestions([])
      setLoading(false)
      setLocalError('Sin conexión. El destino se podrá buscar cuando recuperes internet.')
      return
    }

    if (disabled) return
    if (!token) {
      setSuggestions([])
      return
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoading(true)
        setLocalError('')

        const response = await mapsService.autocompletePlaces(search.trim(), token)
        setSuggestions(response.data ?? [])
      } catch (err) {
        setLocalError(isNetworkError(err) ? 'Sin conexión. El destino se podrá buscar cuando recuperes internet.' : err instanceof Error ? err.message : 'No se pudieron cargar sugerencias.')
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [search, selected, token, disabled, lockedValue, isOffline])

  const handleSelectSuggestion = async (suggestion: PlaceAutocompleteResult) => {
    if (disabled || lockedValue) return
    if (!token) {
      setLocalError('Tu sesión expiró. Vuelve a iniciar sesión.')
      return
    }

    if (isOffline) {
      setLocalError('Sin conexión. Selecciona el destino cuando recuperes internet.')
      return
    }

    try {
      setSelecting(true)
      setLocalError('')

      const response = await mapsService.getPlaceDetails(suggestion.placeId, token)
      const place = response.data ?? undefined
      const finalValue = place?.formattedAddress || suggestion.description
      const geo: GeocodingResult | undefined = place
        ? {
            formattedAddress: place.formattedAddress,
            latitude: place.latitude,
            longitude: place.longitude,
            placeId: place.id,
            photoName: place.photoName,
            photoUrl: place.photoUrl,
          }
        : undefined

      setSearch(finalValue)
      setSelected(true)
      setSuggestions([])
      onChange(finalValue, geo)
    } catch (err) {
      setLocalError(isNetworkError(err) ? 'Sin conexión. Selecciona el destino cuando recuperes internet.' : err instanceof Error ? err.message : 'No se pudo seleccionar el destino.')
    } finally {
      setSelecting(false)
    }
  }

  return (
    <div className="relative flex flex-col gap-2">
      <label className="font-body text-sm font-extrabold uppercase tracking-[0.14em] text-[#4B2FA3]">
        {label}
      </label>

      <input
        type="text"
        placeholder={placeholder}
        value={search}
        disabled={disabled}
        readOnly={lockedValue}
        onChange={(e) => {
          if (lockedValue) return
          setSearch(e.target.value)
          setSelected(false)
          setLocalError('')
          onChange(e.target.value, undefined)
        }}
        onBlur={() => window.setTimeout(() => setSuggestions([]), 120)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setSuggestions([])
        }}
        className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-base font-medium text-[#1E0A4E] outline-none transition placeholder:text-[#94A3B8] disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B] ${
          error || localError
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : value
              ? 'border-[#7A4FD6] ring-2 ring-[#7A4FD6]/15'
              : 'border-[#D8C8FF] focus:border-[#7A4FD6] focus:ring-2 focus:ring-[#7A4FD6]/15'
        }`}
      />

      {(loading || selecting) && (
        <p className="font-body text-sm font-medium text-[#64748B]">
          {selecting ? 'Seleccionando destino…' : 'Buscando sugerencias…'}
        </p>
      )}

      {!disabled && !lockedValue && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[86px] z-30 overflow-hidden rounded-2xl border border-[#D8C8FF] bg-white shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId || suggestion.description}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="block w-full border-b border-[#F1F5F9] px-4 py-3.5 text-left transition hover:bg-[#F7F2FF] last:border-b-0"
            >
              <p className="text-base font-extrabold text-[#1E0A4E]">
                {suggestion.mainText || suggestion.description}
              </p>
              <p className="mt-1 text-sm font-medium text-[#64748B]">
                {suggestion.secondaryText || suggestion.description}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <p className="font-body text-sm font-bold text-[#15803D]">Destino seleccionado: {value}</p>
      )}

      {(error || localError) && (
        <p className="font-body text-sm font-bold text-red-500">{error || localError}</p>
      )}
    </div>
  )
}
