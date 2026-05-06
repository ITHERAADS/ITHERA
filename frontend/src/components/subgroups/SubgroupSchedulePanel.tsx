import { useCallback, useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { useAuth } from '../../context/useAuth'
import { mapsService, type PlaceResult } from '../../services/maps'
import { subgroupScheduleService, type SubgroupMembership, type SubgroupSlot } from '../../services/subgroups'
import type { Group } from '../../types/groups'
import { SubgroupChatDrawer } from '../chat/SubgroupChatDrawer'

interface Props {
  groupId: string | null
  group?: Group | null
  isAdmin: boolean
  tripStartDate?: string | null
  tripEndDate?: string | null
  onOpenBudget?: () => void
  onOpenVault?: () => void
  socket?: Socket | null
  isSocketConnected?: boolean
  currentUserId?: string | null
  currentUserName?: string
}

type ActivityDraft = {
  query: string
  description: string
  timeValue: string
  results: PlaceResult[]
  selectedPlace: PlaceResult | null
  loading: boolean
}

const dt = (value?: string | null) => {
  if (!value) return 'Sin hora'
  const d = new Date(value)
  return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const toLocalInputValue = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const toLocalTimeValue = (value?: string | null) => toLocalInputValue(value).slice(11, 16) || '12:00'

const isThirtyMinute = (value: string): boolean => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  return d.getMinutes() % 30 === 0 && d.getSeconds() === 0
}

const memberName = (membership: SubgroupMembership) =>
  membership.user?.nombre || membership.usuarios?.nombre || membership.user?.email || membership.usuarios?.email || `Usuario ${membership.user_id}`

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase()).join('') || '?'
}

function MemberCircles({ members }: { members: SubgroupMembership[] }) {
  if (members.length === 0) {
    return <span className="text-sm text-[#64748B]">Sin participantes</span>
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {members.slice(0, 5).map((member) => {
          const name = memberName(member)
          return (
            <div
              key={member.id}
              title={name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#1E6FD9] text-xs font-bold text-white"
            >
              {initials(name)}
            </div>
          )
        })}
      </div>
      <span className="text-sm text-[#475569]">
        {members.length} {members.length === 1 ? 'persona' : 'personas'}
      </span>
    </div>
  )
}

const primaryActivity = (subgroup: SubgroupSlot['subgroups'][number]) => subgroup.activities[0] ?? null

export function SubgroupSchedulePanel({
  groupId,
  group,
  isAdmin,
  tripStartDate,
  tripEndDate,
  onOpenBudget,
  onOpenVault,
  socket = null,
  isSocketConnected = false,
  currentUserId = null,
  currentUserName = 'Usuario',
}: Props) {
  const { accessToken } = useAuth()
  const [slots, setSlots] = useState<SubgroupSlot[]>([])
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newSlotTitle, setNewSlotTitle] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('')
  const [newSlotEnd, setNewSlotEnd] = useState('')
  const [activityDraftBySlot, setActivityDraftBySlot] = useState<Record<number, ActivityDraft>>({})
  const [activityTitleBySubgroup, setActivityTitleBySubgroup] = useState<Record<number, string>>({})
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null)
  const [editingSlotTitle, setEditingSlotTitle] = useState('')
  const [editingSubgroupId, setEditingSubgroupId] = useState<number | null>(null)
  const [editingSubgroupName, setEditingSubgroupName] = useState('')

  // Chat drawer state
  const [chatSubgroup, setChatSubgroup] = useState<{ slotId: number; subgroupId: number; name: string } | null>(null)

  const load = useCallback(async () => {
    if (!groupId || !accessToken) return
    try {
      setLoading(true)
      setError(null)
      const response = await subgroupScheduleService.getSchedule(groupId, accessToken)
      setSlots(response.slots ?? [])
      setMyUserId(response.myUserId ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el horario de subgrupos')
    } finally {
      setLoading(false)
    }
  }, [accessToken, groupId])

  useEffect(() => { void load() }, [load])

  const runAction = async (action: () => Promise<void>) => {
    try {
      setError(null)
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la accion')
    }
  }

  const setActivityDraft = (slotId: number, patch: Partial<ActivityDraft>) => {
    setActivityDraftBySlot((prev) => ({
      ...prev,
      [slotId]: {
        query: prev[slotId]?.query ?? '',
        description: prev[slotId]?.description ?? '',
        timeValue: prev[slotId]?.timeValue ?? '12:00',
        results: prev[slotId]?.results ?? [],
        selectedPlace: prev[slotId]?.selectedPlace ?? null,
        loading: prev[slotId]?.loading ?? false,
        ...patch,
      },
    }))
  }

  const minDateTime = tripStartDate ? `${tripStartDate}T00:00` : undefined
  const maxDateTime = tripEndDate ? `${tripEndDate}T23:30` : undefined

  const onCreateSlot = async () => {
    if (!groupId || !accessToken || !newSlotTitle.trim() || !newSlotStart || !newSlotEnd) return
    const start = new Date(newSlotStart)
    const end = new Date(newSlotEnd)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setError('Rango de fecha invalido para el horario')
      return
    }
    if (!isThirtyMinute(newSlotStart) || !isThirtyMinute(newSlotEnd)) {
      setError('Las horas deben estar en multiplos de 30 minutos')
      return
    }
    if (tripStartDate && newSlotStart.slice(0, 10) < tripStartDate) {
      setError(`La hora de inicio no puede ser menor al inicio del viaje (${tripStartDate})`)
      return
    }
    if (tripEndDate && newSlotEnd.slice(0, 10) > tripEndDate) {
      setError(`La hora de fin no puede ser mayor al fin del viaje (${tripEndDate})`)
      return
    }

    await runAction(async () => {
      await subgroupScheduleService.createSlot(groupId, {
        title: newSlotTitle.trim(),
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      }, accessToken)
      setNewSlotTitle('')
      setNewSlotStart('')
      setNewSlotEnd('')
      await load()
    })
  }

  const onCreateSubgroup = async (slot: SubgroupSlot) => {
    if (!groupId || !accessToken) return
    const draft = activityDraftBySlot[slot.id] ?? {
      query: '',
      description: '',
      timeValue: toLocalTimeValue(slot.starts_at),
      results: [],
      selectedPlace: null,
      loading: false,
    }
    const selectedPlace = draft.selectedPlace
    if (!selectedPlace) {
      setError('Selecciona un lugar para crear la actividad.')
      return
    }
    const title = selectedPlace.name || draft.query.trim()
    if (!title) return

    const slotDate = toLocalInputValue(slot.starts_at).slice(0, 10)
    const startsAt = new Date(`${slotDate}T${draft.timeValue}:00`)
    const slotStart = new Date(slot.starts_at)
    const slotEnd = new Date(slot.ends_at)
    if (Number.isNaN(startsAt.getTime()) || startsAt < slotStart || startsAt >= slotEnd) {
      setError('La hora estimada debe estar dentro del horario del admin y antes de la hora de termino')
      return
    }

    await runAction(async () => {
      const response = await subgroupScheduleService.createSubgroup(groupId, slot.id, {
        name: title,
        description: draft.description.trim() || null,
      }, accessToken)
      await subgroupScheduleService.createSubgroupActivity(groupId, slot.id, response.subgroup.id, {
        title,
        description: draft.description.trim() || null,
        location: selectedPlace.formattedAddress || null,
        starts_at: startsAt.toISOString(),
      }, accessToken)
      setActivityDraftBySlot((prev) => ({
        ...prev,
        [slot.id]: { query: '', description: '', timeValue: toLocalTimeValue(slot.starts_at), results: [], selectedPlace: null, loading: false },
      }))
      await load()
    })
  }

  const onSearchPlace = async (slotId: number) => {
    if (!accessToken) {
      setError('Tu sesion expiro. Vuelve a iniciar sesion.')
      return
    }
    const draft = activityDraftBySlot[slotId] ?? {
      query: '',
      description: '',
      timeValue: '12:00',
      results: [],
      selectedPlace: null,
      loading: false,
    }
    if (!draft.query.trim()) {
      setError('Escribe una actividad o lugar para buscar.')
      return
    }

    try {
      setError(null)
      setActivityDraft(slotId, { loading: true, selectedPlace: null, results: [] })
      const response = await mapsService.searchPlacesByText(
        {
          textQuery: draft.query.trim(),
          latitude: group?.destino_latitud ?? undefined,
          longitude: group?.destino_longitud ?? undefined,
          radius: 7000,
          maxResultCount: 10,
        },
        accessToken,
      )
      setActivityDraft(slotId, { results: response.data ?? [], loading: false })
    } catch (err) {
      setActivityDraft(slotId, { loading: false })
      setError(err instanceof Error ? err.message : 'No se pudieron buscar lugares.')
    }
  }

  const onUpdateSlotTitle = async (slotId: number) => {
    if (!groupId || !accessToken || !editingSlotTitle.trim()) return
    await runAction(async () => {
      await subgroupScheduleService.updateSlot(groupId, slotId, { title: editingSlotTitle.trim() }, accessToken)
      setEditingSlotId(null)
      setEditingSlotTitle('')
      await load()
    })
  }

  const onDeleteSlot = async (slotId: number) => {
    if (!groupId || !accessToken) return
    if (!window.confirm('Eliminar este horario y todo su contenido?')) return
    await runAction(async () => {
      await subgroupScheduleService.deleteSlot(groupId, slotId, accessToken)
      await load()
    })
  }

  const onJoin = async (slotId: number, subgroupId: number | null) => {
    if (!groupId || !accessToken) return
    await runAction(async () => {
      await subgroupScheduleService.joinSubgroup(groupId, slotId, subgroupId, accessToken)
      await load()
    })
  }

  const onCreateActivity = async (slotId: number, subgroupId: number) => {
    if (!groupId || !accessToken) return
    const title = (activityTitleBySubgroup[subgroupId] ?? '').trim()
    if (!title) return
    await runAction(async () => {
      await subgroupScheduleService.createSubgroupActivity(groupId, slotId, subgroupId, { title }, accessToken)
      setActivityTitleBySubgroup((prev) => ({ ...prev, [subgroupId]: '' }))
      await load()
    })
  }

  const onDeleteActivity = async (slotId: number, activityId: number) => {
    if (!groupId || !accessToken) return
    await runAction(async () => {
      await subgroupScheduleService.deleteSubgroupActivity(groupId, slotId, activityId, accessToken)
      await load()
    })
  }

  const onUpdateSubgroupName = async (slotId: number, subgroupId: number) => {
    if (!groupId || !accessToken || !editingSubgroupName.trim()) return
    await runAction(async () => {
      await subgroupScheduleService.updateSubgroup(groupId, slotId, subgroupId, { name: editingSubgroupName.trim() }, accessToken)
      setEditingSubgroupId(null)
      setEditingSubgroupName('')
      await load()
    })
  }

  const onDeleteSubgroup = async (slotId: number, subgroupId: number) => {
    if (!groupId || !accessToken) return
    if (!window.confirm('Eliminar esta actividad de subgrupo?')) return
    await runAction(async () => {
      await subgroupScheduleService.deleteSubgroup(groupId, slotId, subgroupId, accessToken)
      await load()
    })
  }

  return (
    <>
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">Horario para subgrupos</h2>
          <p className="text-sm text-[#64748B]">Actividad especial del itinerario, sin votaciones.</p>
        </div>
        <p className="text-sm text-[#64748B]">Cada persona elige libremente una opcion o queda libre.</p>
      </div>

      {isAdmin && (
        <div className="mb-5 grid gap-2 md:grid-cols-4">
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Nombre del horario"
            value={newSlotTitle}
            onChange={(event) => setNewSlotTitle(event.target.value)}
          />
          <input
            className="rounded-lg border px-3 py-2"
            type="datetime-local"
            min={minDateTime}
            max={maxDateTime}
            step={1800}
            value={newSlotStart}
            onChange={(event) => setNewSlotStart(event.target.value)}
          />
          <input
            className="rounded-lg border px-3 py-2"
            type="datetime-local"
            min={minDateTime}
            max={maxDateTime}
            step={1800}
            value={newSlotEnd}
            onChange={(event) => setNewSlotEnd(event.target.value)}
          />
          <button type="button" onClick={() => void onCreateSlot()} className="rounded-lg bg-[#1E6FD9] px-4 py-2 font-semibold text-white">
            Crear horario
          </button>
        </div>
      )}

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-sm text-[#64748B]">Cargando...</p>}

      <div className="space-y-4">
        {!loading && slots.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
            <p className="font-semibold text-[#1E0A4E]">Todavia no hay horarios de subgrupos.</p>
            <p className="mt-1 text-sm text-[#64748B]">
              Crea un horario con inicio y fin para que las personas propongan actividades dentro de ese bloque.
            </p>
          </div>
        )}

        {slots.map((slot) => {
          const myMembership = slot.memberships.find((membership) => {
            const mUid = membership.user_id != null ? String(membership.user_id) : String(membership.usuarios?.id_usuario)
            return String(mUid) === String(myUserId)
          })
          const mySubgroupId = myMembership?.subgroup_id != null ? String(myMembership.subgroup_id) : null
          const mySubgroup = slot.subgroups.find((sg) => mySubgroupId != null && String(sg.id) === mySubgroupId)

          const draft = activityDraftBySlot[slot.id] ?? {
            query: '',
            description: '',
            timeValue: toLocalTimeValue(slot.starts_at),
            results: [],
            selectedPlace: null,
            loading: false,
          }

          return (
            <div key={slot.id} className="rounded-xl border border-[#E2E8F0] p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  {editingSlotId === slot.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="rounded-md border px-2 py-1 text-sm"
                        value={editingSlotTitle}
                        onChange={(event) => setEditingSlotTitle(event.target.value)}
                      />
                      <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => void onUpdateSlotTitle(slot.id)}>
                        Guardar
                      </button>
                      <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => setEditingSlotId(null)}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-heading text-lg font-bold text-[#1E0A4E]">{slot.title}</h3>
                  )}
                  <p className="text-sm text-[#64748B]">{dt(slot.starts_at)} - {dt(slot.ends_at)}</p>
                  <p className="mt-1 text-sm text-[#475569]">
                    Tu estado: <span className="font-semibold">{mySubgroup ? `En ${mySubgroup.name}` : 'Libre'}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void onJoin(slot.id, null)} className="rounded-md border px-3 py-1.5 text-sm">
                    {myMembership?.subgroup_id ? 'Quedar libre' : 'Estoy libre'}
                  </button>
                  {isAdmin && (
                    <>
                      <button type="button" className="rounded-md border px-3 py-1.5 text-xs" onClick={() => { setEditingSlotId(slot.id); setEditingSlotTitle(slot.title) }}>
                        Editar horario
                      </button>
                      <button type="button" className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600" onClick={() => void onDeleteSlot(slot.id)}>
                        Eliminar horario
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1E0A4E]/60">Buscar lugar o actividad</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm outline-none transition focus:border-bluePrimary focus:ring-2 focus:ring-bluePrimary/10"
                    placeholder="Ej: restaurante, playa, museo..."
                    value={draft.query}
                    onChange={(event) => setActivityDraft(slot.id, { query: event.target.value, selectedPlace: null })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void onSearchPlace(slot.id)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void onSearchPlace(slot.id)}
                    disabled={draft.loading}
                    className="rounded-xl bg-purpleNavbar px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {draft.loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#1E0A4E]/60">
                    Descripcion opcional
                  </label>
                  <textarea
                    className="w-full resize-none rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm outline-none transition focus:border-bluePrimary focus:ring-2 focus:ring-bluePrimary/10"
                    rows={3}
                    placeholder="Ej: visitar por la tarde, revisar horarios, llevar efectivo..."
                    value={draft.description}
                    onChange={(event) => setActivityDraft(slot.id, { description: event.target.value })}
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#1E0A4E]/60">
                    Hora estimada
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm outline-none transition focus:border-bluePrimary focus:ring-2 focus:ring-bluePrimary/10"
                    type="time"
                    value={draft.timeValue}
                    onChange={(event) => setActivityDraft(slot.id, { timeValue: event.target.value })}
                  />
                </div>

                {draft.selectedPlace && (
                  <div className="mt-4 rounded-xl border border-bluePrimary/30 bg-bluePrimary/5 px-4 py-3">
                    <p className="text-sm font-bold text-purpleNavbar">
                      Seleccionado: {draft.selectedPlace.name || 'Lugar sin nombre'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray500">
                      {draft.selectedPlace.formattedAddress || 'Direccion no disponible'}
                    </p>
                  </div>
                )}

                {draft.results.length > 0 && (
                  <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white">
                    {draft.results.map((place) => {
                      const isSelected = draft.selectedPlace?.id === place.id
                      return (
                        <button
                          key={place.id || `${place.name}-${place.formattedAddress}`}
                          type="button"
                          onClick={() => setActivityDraft(slot.id, { selectedPlace: place })}
                          className={`block w-full border-b border-[#F1F5F9] px-4 py-3 text-left last:border-b-0 ${
                            isSelected ? 'bg-bluePrimary/10' : 'bg-white hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <p className="text-sm font-bold text-purpleNavbar">{place.name || 'Lugar sin nombre'}</p>
                          <p className="mt-0.5 text-xs text-gray500">{place.formattedAddress || 'Direccion no disponible'}</p>
                          {place.primaryCategory && (
                            <p className="mt-1 text-[11px] text-bluePrimary">{place.primaryCategory}</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void onCreateSubgroup(slot)}
                  disabled={!draft.selectedPlace}
                  className="mt-4 rounded-xl bg-bluePrimary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Crear actividad
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {slot.subgroups.map((subgroup) => {
                  const canManageSubgroup = isAdmin || Number(subgroup.created_by) === Number(myUserId)
                  const isMine = mySubgroupId != null && String(mySubgroupId) === String(subgroup.id)
                  const details = primaryActivity(subgroup)

                  return (
                    <div key={subgroup.id} className={`rounded-xl border p-4 ${isMine ? 'border-[#1E6FD9] bg-[#F8FBFF]' : 'border-[#DCE3F0]'}`}>
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-full bg-[#DBEAFE] px-2 py-1 text-xs font-bold text-[#1E6FD9]">Actividad</span>
                            <span className="rounded-full bg-[#F3EEFF] px-2 py-1 text-xs font-bold text-[#5B35B1]">Sin votacion</span>
                          </div>
                          {editingSubgroupId === subgroup.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                className="rounded-md border px-2 py-1 text-xs"
                                value={editingSubgroupName}
                                onChange={(event) => setEditingSubgroupName(event.target.value)}
                              />
                              <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => void onUpdateSubgroupName(slot.id, subgroup.id)}>
                                Guardar
                              </button>
                              <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => setEditingSubgroupId(null)}>
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-heading text-lg font-bold text-[#1E0A4E]">{details?.title ?? subgroup.name}</h4>
                              {details?.starts_at && <p className="text-sm text-[#64748B]">Hora estimada: {dt(details.starts_at)}</p>}
                              {details?.description && <p className="mt-1 text-sm text-[#475569]">{details.description}</p>}
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => void onJoin(slot.id, subgroup.id)} className="rounded-md bg-[#EEF4FF] px-3 py-1.5 text-xs font-semibold text-[#1E6FD9]">
                            {isMine ? 'Estoy aqui' : 'Unirme'}
                          </button>
                          {canManageSubgroup && (
                            <>
                              <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => { setEditingSubgroupId(subgroup.id); setEditingSubgroupName(subgroup.name) }}>
                                Editar
                              </button>
                              <button type="button" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => void onDeleteSubgroup(slot.id, subgroup.id)}>
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mb-3 rounded-lg bg-[#F8FAFC] px-3 py-2">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Personas dentro</p>
                        <MemberCircles members={subgroup.members} />
                        {subgroup.members.length > 0 && (
                          <p className="mt-2 text-sm text-[#475569]">{subgroup.members.map(memberName).join(', ')}</p>
                        )}
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2">
                        {onOpenBudget && (
                          <button
                            type="button"
                            onClick={onOpenBudget}
                            className="rounded-md border border-[#1E6FD9]/30 bg-[#EEF4FF] px-2 py-1 text-xs font-semibold text-[#1E6FD9]"
                          >
                            Registrar gasto
                          </button>
                        )}
                        {onOpenVault && (
                          <button
                            type="button"
                            onClick={onOpenVault}
                            className="rounded-md border border-[#7A4FD6]/30 bg-[#F3EEFF] px-2 py-1 text-xs font-semibold text-[#5B35B1]"
                          >
                            Subir documento
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setChatSubgroup({ slotId: slot.id, subgroupId: subgroup.id, name: subgroup.name })}
                          className="rounded-md border border-[#35C56A]/30 bg-[#ECFDF5] px-2 py-1 text-xs font-semibold text-[#0A8A3E]"
                        >
                          Chat
                        </button>
                      </div>

                      {subgroup.activities.slice(1).map((activity) => (
                        <div key={activity.id} className="mb-1 flex items-center justify-between rounded-md bg-[#F8FAFC] px-2 py-1.5 text-sm">
                          <span>{activity.title}</span>
                          {(isAdmin || Number(activity.created_by) === Number(myUserId)) && (
                            <button type="button" onClick={() => void onDeleteActivity(slot.id, activity.id)} className="text-xs text-red-600">
                              Eliminar
                            </button>
                          )}
                        </div>
                      ))}

                      <div className="mt-2 flex gap-2">
                        <input
                          className="w-full rounded-md border px-2 py-1.5 text-sm"
                          placeholder="Plan interno"
                          value={activityTitleBySubgroup[subgroup.id] ?? ''}
                          onChange={(event) => setActivityTitleBySubgroup((prev) => ({ ...prev, [subgroup.id]: event.target.value }))}
                        />
                        <button type="button" onClick={() => void onCreateActivity(slot.id, subgroup.id)} className="rounded-md border px-2 py-1 text-xs">
                          Agregar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>

    {chatSubgroup && (
      <SubgroupChatDrawer
        open={chatSubgroup !== null}
        onClose={() => setChatSubgroup(null)}
        groupId={groupId}
        slotId={chatSubgroup.slotId}
        subgroupId={chatSubgroup.subgroupId}
        subgroupName={chatSubgroup.name}
        socket={socket}
        isSocketConnected={isSocketConnected}
        accessToken={accessToken}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        participants={
          (slots
            .find((s) => s.id === chatSubgroup.slotId)
            ?.subgroups.find((sg) => sg.id === chatSubgroup.subgroupId)
            ?.members ?? []
          ).map((m, i) => ({
            id: String(m.user_id),
            name: m.usuarios?.nombre ?? `Usuario ${m.user_id}`,
            color: ['#7A4FD6', '#1E6FD9', '#35C56A', '#F59E0B', '#EF4444', '#06B6D4'][i % 6],
            avatarUrl: m.usuarios?.avatar_url ?? null,
          }))
        }
      />
    )}
    </>
  )
}
