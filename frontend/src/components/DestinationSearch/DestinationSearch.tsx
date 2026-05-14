import { useEffect, useRef, useState } from 'react'
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
  const debounceRef = useRef<number | null>(null)

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
        setLocalError(err instanceof Error ? err.message : 'No se pudieron cargar sugerencias.')
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [search, selected, token, disabled, lockedValue])

  const handleSelectSuggestion = async (suggestion: PlaceAutocompleteResult) => {
    if (disabled || lockedValue) return
    if (!token) {
      setLocalError('Tu sesión expiró. Vuelve a iniciar sesión.')
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
      setLocalError(err instanceof Error ? err.message : 'No se pudo seleccionar el destino.')
    } finally {
      setSelecting(false)
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide">
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
        className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B] ${
          error || localError
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : value
              ? 'border-[#1E6FD9] ring-2 ring-[#1E6FD9]/10'
              : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'
        }`}
      />

      {(loading || selecting) && (
        <p className="text-[11px] text-[#7A8799]">
          {selecting ? 'Seleccionando destino…' : 'Buscando sugerencias…'}
        </p>
      )}

      {!disabled && !lockedValue && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[76px] z-30 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId || suggestion.description}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="block w-full border-b border-[#F1F5F9] px-4 py-3 text-left transition hover:bg-[#F8FAFC] last:border-b-0"
            >
              <p className="text-sm font-semibold text-[#1E0A4E]">
                {suggestion.mainText || suggestion.description}
              </p>
              <p className="mt-0.5 text-xs text-[#7A8799]">
                {suggestion.secondaryText || suggestion.description}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <p className="text-[11px] text-[#35C56A]">Destino seleccionado: {value}</p>
      )}

      {(error || localError) && (
        <p className="text-xs text-red-500">{error || localError}</p>
      )}
    </div>
  )
}
