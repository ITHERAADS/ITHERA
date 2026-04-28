import { useEffect, useState } from 'react'
import { mapsService } from '../../services/maps'

type DestinationSearchProps = {
  value: string
  onChange: (value: string) => void
  token?: string | null
  error?: string
  label?: string
  placeholder?: string
}

export function DestinationSearch({
  value,
  onChange,
  token,
  error,
  label = 'Destino',
  placeholder = 'Ej: Cancún, México',
}: DestinationSearchProps) {
  const [search, setSearch] = useState(value)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [localError, setLocalError] = useState('')
  const [selected, setSelected] = useState(false)

  useEffect(() => {
    setSearch(value)
    setSelected(false)
    }, [value])

  const handleSearch = async () => {
    if (!search.trim()) {
      setLocalError('Escribe un destino para buscar.')
      return
    }

    if (!token) {
      setLocalError('Tu sesión expiró. Vuelve a iniciar sesión.')
      return
    }

    try {
      setLoading(true)
      setResult('')
      setLocalError('')

      const response = await mapsService.searchDestination(search.trim(), token)

      const formatted = response.data?.formattedAddress || search.trim()
      setResult(formatted)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo buscar el destino.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = () => {
    if (!result) return
    onChange(result)
    setSearch(result)
    setSelected(true)
    setResult('')
    setLocalError('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide">
        {label}
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setLocalError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearch()
            }
          }}
          className={`flex-1 border rounded-xl px-4 py-3 text-sm outline-none transition bg-white ${
            error || localError
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : value
                ? 'border-[#1E6FD9] ring-2 ring-[#1E6FD9]/10'
                : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'
          }`}
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="rounded-xl bg-[#1E0A4E] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {result && (
        <button
          type="button"
          onClick={handleSelect}
          className="mt-2 text-left rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 hover:border-[#1E6FD9] hover:bg-[#F8FAFC]"
        >
          <p className="text-xs text-[#7A8799]">Resultado encontrado</p>
          <p className="text-sm font-semibold text-[#1E0A4E]">{result}</p>
        </button>
      )}

      {selected && (
        <p className="text-[11px] text-[#35C56A]">
            Destino seleccionado: {value}
        </p>
      )}
      
      {(error || localError) && (
        <p className="text-xs text-red-500">{error || localError}</p>
      )}
    </div>
  )
}