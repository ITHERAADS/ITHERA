import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { subgroupScheduleService, type SubgroupSlot } from '../../services/subgroups'

interface Props {
  groupId: string | null
  isAdmin: boolean
  tripStartDate?: string | null
  tripEndDate?: string | null
  onOpenBudget?: () => void
  onOpenVault?: () => void
}

const dt = (value?: string | null) => {
  if (!value) return 'Sin hora'
  const d = new Date(value)
  return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const isThirtyMinute = (value: string): boolean => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  return d.getMinutes() % 30 === 0 && d.getSeconds() === 0
}

export function SubgroupSchedulePanel({
  groupId,
  isAdmin,
  tripStartDate,
  tripEndDate,
  onOpenBudget,
  onOpenVault,
}: Props) {
  const { accessToken } = useAuth()
  const [slots, setSlots] = useState<SubgroupSlot[]>([])
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newSlotTitle, setNewSlotTitle] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('')
  const [newSlotEnd, setNewSlotEnd] = useState('')

  const [subgroupNameBySlot, setSubgroupNameBySlot] = useState<Record<number, string>>({})
  const [activityTitleBySubgroup, setActivityTitleBySubgroup] = useState<Record<number, string>>({})
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null)
  const [editingSlotTitle, setEditingSlotTitle] = useState('')
  const [editingSubgroupId, setEditingSubgroupId] = useState<number | null>(null)
  const [editingSubgroupName, setEditingSubgroupName] = useState('')

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

  const minDateTime = tripStartDate ? `${tripStartDate}T00:00` : undefined
  const maxDateTime = tripEndDate ? `${tripEndDate}T23:30` : undefined

  const onCreateSlot = async () => {
    if (!groupId || !accessToken || !newSlotTitle.trim() || !newSlotStart || !newSlotEnd) return
    const start = new Date(newSlotStart)
    const end = new Date(newSlotEnd)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      setError('Rango de fecha inválido para el horario')
      return
    }
    if (!isThirtyMinute(newSlotStart) || !isThirtyMinute(newSlotEnd)) {
      setError('Las horas deben estar en múltiplos de 30 minutos')
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
    await subgroupScheduleService.createSlot(groupId, {
      title: newSlotTitle.trim(),
      starts_at: new Date(newSlotStart).toISOString(),
      ends_at: new Date(newSlotEnd).toISOString(),
    }, accessToken)
    setNewSlotTitle('')
    setNewSlotStart('')
    setNewSlotEnd('')
    await load()
  }

  const onCreateSubgroup = async (slotId: number) => {
    if (!groupId || !accessToken) return
    const name = (subgroupNameBySlot[slotId] ?? '').trim()
    if (!name) return
    await subgroupScheduleService.createSubgroup(groupId, slotId, { name }, accessToken)
    setSubgroupNameBySlot((prev) => ({ ...prev, [slotId]: '' }))
    await load()
  }

  const onUpdateSlotTitle = async (slotId: number) => {
    if (!groupId || !accessToken || !editingSlotTitle.trim()) return
    await subgroupScheduleService.updateSlot(groupId, slotId, { title: editingSlotTitle.trim() }, accessToken)
    setEditingSlotId(null)
    setEditingSlotTitle('')
    await load()
  }

  const onDeleteSlot = async (slotId: number) => {
    if (!groupId || !accessToken) return
    if (!window.confirm('Eliminar este horario y todo su contenido?')) return
    await subgroupScheduleService.deleteSlot(groupId, slotId, accessToken)
    await load()
  }

  const onJoin = async (slotId: number, subgroupId: number | null) => {
    if (!groupId || !accessToken) return
    await subgroupScheduleService.joinSubgroup(groupId, slotId, subgroupId, accessToken)
    await load()
  }

  const onCreateActivity = async (slotId: number, subgroupId: number) => {
    if (!groupId || !accessToken) return
    const title = (activityTitleBySubgroup[subgroupId] ?? '').trim()
    if (!title) return
    await subgroupScheduleService.createSubgroupActivity(groupId, slotId, subgroupId, { title }, accessToken)
    setActivityTitleBySubgroup((prev) => ({ ...prev, [subgroupId]: '' }))
    await load()
  }

  const onDeleteActivity = async (slotId: number, activityId: number) => {
    if (!groupId || !accessToken) return
    await subgroupScheduleService.deleteSubgroupActivity(groupId, slotId, activityId, accessToken)
    await load()
  }

  const onUpdateSubgroupName = async (slotId: number, subgroupId: number) => {
    if (!groupId || !accessToken || !editingSubgroupName.trim()) return
    await subgroupScheduleService.updateSubgroup(groupId, slotId, subgroupId, { name: editingSubgroupName.trim() }, accessToken)
    setEditingSubgroupId(null)
    setEditingSubgroupName('')
    await load()
  }

  const onDeleteSubgroup = async (slotId: number, subgroupId: number) => {
    if (!groupId || !accessToken) return
    if (!window.confirm('Eliminar este subgrupo?')) return
    await subgroupScheduleService.deleteSubgroup(groupId, slotId, subgroupId, accessToken)
    await load()
  }

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">Horario para subgrupos</h2>
          <p className="text-sm text-[#64748B]">Actividad especial del itinerario</p>
        </div>

        {isAdmin && (
          <div className="mb-5 grid gap-2 md:grid-cols-4">
            <input className="rounded-lg border px-3 py-2" placeholder="Nombre del horario" value={newSlotTitle} onChange={(e) => setNewSlotTitle(e.target.value)} />
            <input className="rounded-lg border px-3 py-2" type="datetime-local" min={minDateTime} max={maxDateTime} step={1800} value={newSlotStart} onChange={(e) => setNewSlotStart(e.target.value)} />
            <input className="rounded-lg border px-3 py-2" type="datetime-local" min={minDateTime} max={maxDateTime} step={1800} value={newSlotEnd} onChange={(e) => setNewSlotEnd(e.target.value)} />
            <button type="button" onClick={() => void onCreateSlot()} className="rounded-lg bg-[#1E6FD9] px-4 py-2 font-semibold text-white">
              Crear horario
            </button>
          </div>
        )}

        {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {loading && <p className="text-sm text-[#64748B]">Cargando...</p>}

        <div className="space-y-4">
          {slots.map((slot) => {
            const myMembership = slot.memberships.find((m) =>
              Number(m.user_id) === Number(myUserId) || Number(m.usuarios?.id_usuario) === Number(myUserId),
            )
            return (
              <div key={slot.id} className="rounded-xl border border-[#E2E8F0] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    {editingSlotId === slot.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="rounded-md border px-2 py-1 text-sm"
                          value={editingSlotTitle}
                          onChange={(e) => setEditingSlotTitle(e.target.value)}
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
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void onJoin(slot.id, null)} className="rounded-md border px-3 py-1.5 text-sm">
                      Quedar libre
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

                <div className="mb-3 text-sm text-[#475569]">
                  Tu estado:{' '}
                  <span className="font-semibold">
                    {myMembership?.subgroup_id ? `En subgrupo #${myMembership.subgroup_id}` : 'Libre'}
                  </span>
                </div>

                <div className="mb-3 flex gap-2">
                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Nombre del subgrupo"
                    value={subgroupNameBySlot[slot.id] ?? ''}
                    onChange={(e) => setSubgroupNameBySlot((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                  />
                  <button type="button" onClick={() => void onCreateSubgroup(slot.id)} className="rounded-lg border px-3 py-2 text-sm font-semibold">
                    Crear subgrupo
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {slot.subgroups.map((subgroup) => (
                    <div key={subgroup.id} className="rounded-lg border border-[#DCE3F0] p-3">
                      {(() => {
                        const canManageSubgroup = isAdmin || Number(subgroup.created_by) === Number(myUserId)
                        return (
                      <>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        {editingSubgroupId === subgroup.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="rounded-md border px-2 py-1 text-xs"
                              value={editingSubgroupName}
                              onChange={(e) => setEditingSubgroupName(e.target.value)}
                            />
                            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => void onUpdateSubgroupName(slot.id, subgroup.id)}>
                              Guardar
                            </button>
                            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => setEditingSubgroupId(null)}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <p className="font-semibold text-[#1E0A4E]">{subgroup.name}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => void onJoin(slot.id, subgroup.id)} className="rounded-md bg-[#EEF4FF] px-2 py-1 text-xs font-semibold text-[#1E6FD9]">
                            Unirme
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
                      <p className="mb-2 text-xs text-[#64748B]">Miembros: {subgroup.members.length}</p>
                      <div className="mb-2 flex flex-wrap gap-2">
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
                      </div>
                      <div className="space-y-1">
                        {subgroup.activities.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between rounded-md bg-[#F8FAFC] px-2 py-1.5 text-sm">
                            <span>{activity.title}</span>
                            {(isAdmin || Number(activity.created_by) === Number(myUserId)) && (
                              <button type="button" onClick={() => void onDeleteActivity(slot.id, activity.id)} className="text-xs text-red-600">
                                Eliminar
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          className="w-full rounded-md border px-2 py-1.5 text-sm"
                          placeholder="Nueva actividad"
                          value={activityTitleBySubgroup[subgroup.id] ?? ''}
                          onChange={(e) => setActivityTitleBySubgroup((prev) => ({ ...prev, [subgroup.id]: e.target.value }))}
                        />
                        <button type="button" onClick={() => void onCreateActivity(slot.id, subgroup.id)} className="rounded-md border px-2 py-1 text-xs">
                          Agregar
                        </button>
                      </div>
                      </>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
    </div>
  )
}
