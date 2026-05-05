import { useEffect, useState } from 'react'
import { mapsService, type PlaceResult } from '../../services/maps'
import { groupsService } from '../../services/groups'
import { proposalsService } from '../../services/proposals'
import type { Group } from '../../types/groups'
import type { Activity } from '../ui/DayView/DayView'

type EnrichedPlaceResult = PlaceResult & {
  routeDistanceText?: string | null
  routeDurationText?: string | null
  routeDistanceMeters?: number | null
}

type ActivityProposalModalProps = {
  open: boolean
  group: Group | null
  token?: string | null
  selectedDayNumber?: number | null
  editingActivity?: Activity | null
  isCurrentUserAdmin?: boolean
  onClose: () => void
  onCreated: () => void
}

function parseActivityTime(raw: string | undefined): string {
  const match = (raw ?? '').match(/\b([01]\d|2[0-3]):([0-5]\d)\b/)
  return match ? match[0] : '12:00'
}

export function ActivityProposalModal({
  open,
  group,
  token,
  selectedDayNumber,
  editingActivity,
  isCurrentUserAdmin = false,
  onClose,
  onCreated,
}: ActivityProposalModalProps) {
  const [query, setQuery] = useState('')
  const [description, setDescription] = useState('')
  const [timeValue, setTimeValue] = useState('12:00')
  const [results, setResults] = useState<EnrichedPlaceResult[]>([])
  const [selectedPlace, setSelectedPlace] = useState<EnrichedPlaceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    if (editingActivity) {
      setQuery(editingActivity.title ?? '')
      setDescription(editingActivity.description ?? '')
      setTimeValue(parseActivityTime(editingActivity.time))
      setSelectedPlace({
        id: editingActivity.externalReference ?? editingActivity.id,
        name: editingActivity.title ?? '',
        formattedAddress: editingActivity.location ?? '',
        latitude: editingActivity.latitude ?? null,
        longitude: editingActivity.longitude ?? null,
        primaryCategory: 'Actividad',
        photoUrl: editingActivity.image ?? null,
      })
      setResults([])
      setError('')
      return
    }

    setQuery('')
    setDescription('')
    setTimeValue('12:00')
    setResults([])
    setSelectedPlace(null)
    setError('')
  }, [open, editingActivity])

  if (!open) return null

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Escribe una actividad o lugar para buscar.')
      return
    }

    if (!token) {
      setError('Tu sesion expiro. Vuelve a iniciar sesion.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSelectedPlace(null)

      const response = await mapsService.searchPlacesByText(
        {
          textQuery: query.trim(),
          latitude: group?.destino_latitud ?? undefined,
          longitude: group?.destino_longitud ?? undefined,
          radius: 7000,
          maxResultCount: 10,
        },
        token
      )

      const fetchedResults: EnrichedPlaceResult[] = response.data ?? []

      const originLat = group?.destino_latitud
      const originLng = group?.destino_longitud

      if (originLat != null && originLng != null && fetchedResults.length > 0) {
        const topResults = fetchedResults.slice(0, 10)
        
        await Promise.all(topResults.map(async (place) => {
          if (place.latitude != null && place.longitude != null) {
            try {
              const routeResponse = await mapsService.computeRoute(
                {
                  originLat,
                  originLng,
                  destinationLat: place.latitude,
                  destinationLng: place.longitude,
                  travelMode: 'DRIVE',
                },
                token
              )
              
              place.routeDistanceText = routeResponse.data?.distanceText ?? null
              place.routeDurationText = routeResponse.data?.durationText ?? routeResponse.data?.staticDurationText ?? null
              place.routeDistanceMeters = routeResponse.data?.distanceMeters ?? null
            } catch {
              // Ignorar error de ruta
            }
          }
        }))

        topResults.sort((a, b) => {
          const distA = a.routeDistanceMeters ?? Infinity
          const distB = b.routeDistanceMeters ?? Infinity
          return distA - distB
        })

        setResults(topResults)
      } else {
        setResults(fetchedResults)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron buscar lugares.')
    } finally {
      setLoading(false)
    }
  }

  const getActivityDate = () => {
    const startDate = group?.fecha_inicio
    if (!startDate || !selectedDayNumber) return null

    const selectedDate = new Date(
      new Date(`${startDate}T12:00:00`).getTime() + (selectedDayNumber - 1) * 86400000
    )
    const yyyy = selectedDate.getFullYear()
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dd = String(selectedDate.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${timeValue}:00`
  }

  const buildActivityPayload = () => {
    if (!selectedPlace) return null

    const activityDate = getActivityDate()
    return {
      titulo: selectedPlace.name || query.trim(),
      descripcion: description.trim() || null,
      ubicacion: selectedPlace.formattedAddress,
      latitud: selectedPlace.latitude,
      longitud: selectedPlace.longitude,
      fecha_inicio: activityDate,
      fecha_fin: activityDate,
      referencia_externa: selectedPlace.id,
      fuente: 'google_maps',
      payload: {
        googlePlaceId: selectedPlace.id,
        name: selectedPlace.name,
        formattedAddress: selectedPlace.formattedAddress,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        selectedTime: timeValue,
        primaryCategory: selectedPlace.primaryCategory,
        photoName: selectedPlace.photoName ?? null,
        photoUrl: selectedPlace.photoUrl ?? null,
        imageUrl: selectedPlace.photoUrl ?? null,
        query: query.trim(),
      },
    }
  }

  const handleSave = async (asAdminDirect = false) => {
    if (!group?.id) {
      setError('No se encontro el grupo actual.')
      return
    }
    if (!token) {
      setError('Tu sesion expiro. Vuelve a iniciar sesion.')
      return
    }
    if (!selectedPlace) {
      setError('Selecciona un lugar para proponer la actividad.')
      return
    }

    const payload = buildActivityPayload()
    if (!payload) {
      setError('No se pudo preparar la informacion de la actividad.')
      return
    }

    try {
      setSaving(true)
      setError('')

      if (editingActivity) {
        await groupsService.updateActivity(String(group.id), editingActivity.id, payload, token)
      } else {
        const created = await groupsService.createActivity(String(group.id), payload, token)
        const proposalId = String(
          created.activity?.propuesta_id ??
          created.activity?.proposalId ??
          ''
        )

        if (asAdminDirect && proposalId) {
          await proposalsService.applyAdminDecision(
            String(group.id),
            proposalId,
            {
              decision: 'aprobar',
              reason: 'Actividad agregada directamente por organizador (Tipo A)',
            },
            token
          )
        }
      }

      setQuery('')
      setDescription('')
      setTimeValue('12:00')
      setResults([])
      setSelectedPlace(null)
      onCreated()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingActivity
            ? 'No se pudo actualizar la actividad.'
            : 'No se pudo crear la actividad.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving) return
    setQuery('')
    setDescription('')
    setTimeValue('12:00')
    setResults([])
    setSelectedPlace(null)
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="border-b border-[#E2E8F0] px-6 py-5">
          <h2 className="font-heading text-xl font-bold text-purpleNavbar">
            {editingActivity ? 'Editar propuesta' : 'Proponer actividad'}
          </h2>
          <p className="mt-1 font-body text-sm text-gray500">
            Busca un lugar con Google Places y agregalo como propuesta al itinerario.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#1E0A4E]/60">
              Buscar lugar o actividad
            </label>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setError('')
                  if (selectedPlace) setSelectedPlace(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleSearch()
                  }
                }}
                placeholder="Ej: restaurante, playa, museo..."
                className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm outline-none transition focus:border-bluePrimary focus:ring-2 focus:ring-bluePrimary/10"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="rounded-xl bg-purpleNavbar px-4 py-3 font-body text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#1E0A4E]/60">
              Descripcion opcional
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: visitar por la tarde, revisar horarios, llevar efectivo..."
              rows={3}
              className="w-full resize-none rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm outline-none transition focus:border-bluePrimary focus:ring-2 focus:ring-bluePrimary/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#1E0A4E]/60">
              Hora estimada
            </label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm outline-none transition focus:border-bluePrimary focus:ring-2 focus:ring-bluePrimary/10"
            />
          </div>

          {selectedPlace && (
            <div className="rounded-xl border border-bluePrimary/30 bg-bluePrimary/5 px-4 py-3">
              <p className="font-body text-sm font-bold text-purpleNavbar">
                Seleccionado: {selectedPlace.name || 'Lugar sin nombre'}
              </p>
              <p className="mt-0.5 font-body text-xs text-gray500">
                {selectedPlace.formattedAddress || 'Direccion no disponible'}
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-[#E2E8F0]">
              {results.map((place) => {
                const isSelected = selectedPlace?.id === place.id
                return (
                  <button
                    key={place.id || `${place.name}-${place.formattedAddress}`}
                    type="button"
                    onClick={() => setSelectedPlace(place)}
                    className={`block w-full border-b border-[#F1F5F9] px-4 py-3 text-left last:border-b-0 ${
                      isSelected ? 'bg-bluePrimary/10' : 'bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <p className="font-body text-sm font-bold text-purpleNavbar">
                      {place.name || 'Lugar sin nombre'}
                    </p>
                    <p className="mt-0.5 font-body text-xs text-gray500">
                      {place.formattedAddress || 'Direccion no disponible'}
                    </p>
                    {place.routeDistanceText && place.routeDurationText && (
                      <p className="mt-1 flex items-center gap-1 font-body text-[11px] text-gray700">
                        <span className="text-bluePrimary">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
                            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </span>
                        {place.routeDistanceText} · {place.routeDurationText}
                      </p>
                    )}
                    {place.primaryCategory && (
                      <p className="mt-1 font-body text-[11px] text-bluePrimary">{place.primaryCategory}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#E2E8F0] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-xl border border-[#E2E8F0] px-4 py-3 font-body text-sm font-semibold text-gray700"
          >
            Cancelar
          </button>
          {!editingActivity && isCurrentUserAdmin && (
            <button
              type="button"
              onClick={() => void handleSave(true)}
              disabled={saving || !selectedPlace}
              className="rounded-xl border border-[#1E6FD9] bg-[#EEF4FF] px-4 py-3 font-body text-sm font-semibold text-[#1E6FD9] disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Agregar como admin (directo)'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave(false)}
            disabled={saving || !selectedPlace}
            className="rounded-xl bg-bluePrimary px-4 py-3 font-body text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando...' : editingActivity ? 'Guardar cambios' : 'Agregar actividad'}
          </button>
        </div>
      </div>
    </div>
  )
}
