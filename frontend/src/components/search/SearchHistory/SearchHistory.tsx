import { useState, useMemo, useEffect } from 'react'
import { useToast } from '../../ui/Toast/Toast'
import { InlineBanner } from '../../ui/InlineBanner/InlineBanner'
import { ERROR_CODES } from '../../../constants/errorCodes'

interface SearchHistoryItem {
  id: string
  query: string
  tipo: 'vuelos' | 'hoteles' | 'lugares' | 'rutas' | 'clima'
  createdAt: Date
}

const MOCK_HISTORY: SearchHistoryItem[] = [
  { id: '1', query: 'Vuelos Ciudad de México → Cancún', tipo: 'vuelos', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: '2', query: 'Hoteles en Cancún cerca de la zona hotelera', tipo: 'hoteles', createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
  { id: '3', query: 'Lugares turísticos Tulum', tipo: 'lugares', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: '4', query: 'Ruta CDMX → Playa del Carmen en autobús', tipo: 'rutas', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  { id: '5', query: 'Clima en Cancún diciembre', tipo: 'clima', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  { id: '6', query: 'Vuelos Ciudad de México → Madrid', tipo: 'vuelos', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
]

const TIPO_LABELS: Record<string, string> = {
  vuelos: 'Vuelos',
  hoteles: 'Hoteles',
  lugares: 'Lugares',
  rutas: 'Rutas',
  clima: 'Clima',
}

const TIPO_BADGE: Record<string, string> = {
  vuelos:  'bg-[#E8F0FF] text-[#1E6FD9]',
  hoteles: 'bg-[#EAFBF0] text-[#1F8A4C]',
  lugares: 'bg-[#F0EEFF] text-[#7A4FD6]',
  rutas:   'bg-[#FFF4D6] text-[#A86B00]',
  clima:   'bg-[#F4F6F8] text-[#3D4A5C]',
}

function formatRelativeDate(date: Date): string {
  const diffMs    = Date.now() - date.getTime()
  const diffMins  = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays  = Math.floor(diffHours / 24)

  if (diffMins < 1)  return 'Ahora mismo'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours} h`
  if (diffDays === 1) return 'Ayer'
  return `Hace ${diffDays} días`
}

function IconSearch() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#F4F6F8" />
      <circle cx="18" cy="18" r="7" stroke="#7A8799" strokeWidth="1.5" fill="none" />
      <line x1="23.5" y1="23.5" x2="28" y2="28" stroke="#7A8799" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SkeletonItem() {
  return (
    <div className="animate-pulse rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="h-6 w-16 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-1/3 rounded bg-gray-200" />
        </div>
        <div className="h-8 w-24 rounded-lg bg-gray-200" />
      </div>
    </div>
  )
}

export function SearchHistory() {
  const { showToast, ToastContainer } = useToast()

  const [items, setItems]               = useState<SearchHistoryItem[]>(MOCK_HISTORY)
  const [loading, setLoading]           = useState(true)
  const [hasError, setHasError]         = useState(false)
  const [filterText, setFilterText]     = useState('')
  const [sortOrder, setSortOrder]       = useState<'newest' | 'oldest'>('newest')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    let result = items
    if (filterText.trim()) {
      const q = filterText.toLowerCase()
      result = result.filter(item => item.query.toLowerCase().includes(q))
    }
    return [...result].sort((a, b) =>
      sortOrder === 'newest'
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime()
    )
  }, [items, filterText, sortOrder])

  function handleRepeat(item: SearchHistoryItem) {
    showToast(`Repitiendo búsqueda: "${item.query}"`, 'low')
  }

  function handleDeleteRequest(id: string) {
    setConfirmDeleteId(id)
  }

  function handleDeleteConfirm() {
    setItems(prev => prev.filter(i => i.id !== confirmDeleteId))
    setConfirmDeleteId(null)
    showToast('Búsqueda eliminada.', 'low')
  }

  function handleClearAllConfirm() {
    setItems([])
    setConfirmClearAll(false)
    showToast('Historial limpiado.', 'low')
  }

  function dismissError() {
    setHasError(false)
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {hasError && (
        <InlineBanner message={ERROR_CODES['ERR-73-002'].message} onDismiss={dismissError} />
      )}

      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1E0A4E]">Historial de búsqueda</h1>
          <p className="mt-1 font-body text-sm text-[#7A8799]">
            Tus búsquedas recientes en la plataforma.
          </p>
        </div>

        {items.length > 0 && !loading && (
          <button
            onClick={() => setConfirmClearAll(true)}
            className="self-start rounded-lg border border-[#E2E8F0] px-4 py-2 font-body text-sm text-[#EF4444] hover:bg-red-50 transition-colors sm:self-auto"
          >
            Limpiar historial
          </button>
        )}
      </div>

      {/* Confirm clear all */}
      {confirmClearAll && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-sm text-[#3D4A5C]">
            ¿Eliminar todo el historial? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleClearAllConfirm}
              className="rounded-lg bg-[#EF4444] px-4 py-2 font-body text-sm text-white hover:opacity-90 transition-opacity"
            >
              Sí, limpiar
            </button>
            <button
              onClick={() => setConfirmClearAll(false)}
              className="rounded-lg border border-[#E2E8F0] px-4 py-2 font-body text-sm text-[#3D4A5C] hover:bg-[#F4F6F8] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Filtrar búsquedas…"
            className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2.5 font-body text-sm placeholder-[#7A8799] focus:border-[#1E6FD9] focus:outline-none transition-colors"
          />
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2.5 font-body text-sm text-[#3D4A5C] focus:border-[#1E6FD9] focus:outline-none bg-white transition-colors"
          >
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguas</option>
          </select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[#E2E8F0] bg-white py-16 text-center">
          <IconSearch />
          <div>
            <p className="font-heading text-base font-bold text-[#3D4A5C]">
              {filterText ? 'Sin resultados para ese filtro' : 'Tu historial está vacío'}
            </p>
            <p className="mt-1 font-body text-sm text-[#7A8799]">
              {filterText
                ? 'Prueba con otro término de búsqueda.'
                : 'Las búsquedas que realices aparecerán aquí.'}
            </p>
          </div>
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="rounded-lg border border-[#E2E8F0] px-4 py-2 font-body text-sm text-[#1E6FD9] hover:bg-[#F4F6F8] transition-colors"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="rounded-xl border border-[#E2E8F0] bg-white p-4"
            >
              {confirmDeleteId === item.id ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-body text-sm text-[#3D4A5C]">
                    ¿Eliminar esta búsqueda?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteConfirm}
                      className="rounded-lg bg-[#EF4444] px-3 py-1.5 font-body text-xs text-white hover:opacity-90 transition-opacity"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-body text-xs text-[#3D4A5C] hover:bg-[#F4F6F8] transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-1 font-body text-xs font-semibold ${TIPO_BADGE[item.tipo] ?? 'bg-[#F4F6F8] text-[#3D4A5C]'}`}
                  >
                    {TIPO_LABELS[item.tipo] ?? item.tipo}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-medium text-[#3D4A5C]">
                      {item.query}
                    </p>
                    <p className="mt-0.5 font-body text-xs text-[#7A8799]">
                      {formatRelativeDate(item.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => handleRepeat(item)}
                      className="rounded-lg bg-[#1E6FD9] px-3 py-1.5 font-heading text-xs font-bold text-white hover:bg-[#2C8BE6] transition-colors"
                    >
                      Repetir búsqueda
                    </button>
                    <button
                      onClick={() => handleDeleteRequest(item.id)}
                      aria-label="Eliminar búsqueda"
                      className="rounded-lg border border-[#E2E8F0] p-1.5 text-[#7A8799] hover:border-red-200 hover:text-[#EF4444] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="1" y1="1" x2="13" y2="13" />
                        <line x1="13" y1="1" x2="1" y2="13" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ToastContainer()}
    </div>
  )
}
