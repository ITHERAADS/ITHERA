import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Socket } from 'socket.io-client'
import { GoogleMiniMap } from '../../GoogleMiniMap/GoogleMiniMap'
import { useAuth } from '../../../context/useAuth'
import { groupsService } from '../../../services/groups'
import type { Group, TravelStartLocation } from '../../../types/groups'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  role: 'Organizador' | 'Miembro'
  color: string
  isOnline: boolean
  avatarUrl?: string | null
}

interface MemberFromBackend {
  id: string
  usuario_id?: string
  nombre?: string
  email?: string
  avatar_url?: string | null
  rol: 'admin' | 'viajero' | string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

function ParticipantAvatar({
  name,
  color,
  avatarUrl,
  className,
}: {
  name: string
  color: string
  avatarUrl?: string | null
  className: string
}) {
  return (
    <div
      className={`${className} overflow-hidden rounded-full flex items-center justify-center text-white font-body font-bold shrink-0`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        name[0] ?? '?'
      )}
    </div>
  )
}

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-gray-400">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}


function SectionDivider({
  label,
  color,
  background,
}: {
  label: string
  color: string
  background: string
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-body text-xs font-bold uppercase tracking-widest"
        style={{ color, backgroundColor: background }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="h-px flex-1 rounded-full bg-[#E2E8F0]" />
    </div>
  )
}

function formatLocationShort(label: string | null | undefined, formattedAddress: string | null | undefined): string {
  const source = label || formattedAddress || ''
  if (!source) return 'Ubicación no disponible'

  const parts = source.split(', ').map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 2) return source

  // Find the part that starts with a zip code (e.g., "77500 Cancún") and extract city from it
  const zipIdx = parts.findIndex((p) => /^\d{4,6}\s+\S/.test(p))
  if (zipIdx !== -1) {
    const cityWithZip = parts[zipIdx] ?? ''
    const city = cityWithZip.replace(/^\d+\s*/, '')
    const rest = parts.slice(zipIdx + 1)
    return [city, ...rest].filter(Boolean).join(', ')
  }

  // If no zip found but looks like a street address (starts with number or common street words),
  // skip the first 2 parts and show the rest
  const looksLikeStreet = /^\d|^(blvd|calle|av\.|ave|carretera|km\.)/i.test(parts[0] ?? '')
  if (looksLikeStreet && parts.length > 3) {
    return parts.slice(2).join(', ')
  }

  return source
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function buildSidebarStartLocation(group?: Group | null): TravelStartLocation | null {
  if (!group) return null

  const persistedLat = toNumberOrNull(group.punto_partida_latitud)
  const persistedLng = toNumberOrNull(group.punto_partida_longitud)
  const hasReservedHotel = group.punto_partida_tipo === 'hotel_reservado' && persistedLat !== null && persistedLng !== null

  if (hasReservedHotel) {
    return {
      source: 'hotel_reservado',
      label: group.punto_partida_nombre || 'Hotel reservado',
      formattedAddress: group.punto_partida_direccion || group.punto_partida_nombre || null,
      latitude: persistedLat,
      longitude: persistedLng,
      placeId: group.punto_partida_place_id || null,
      photoUrl: null,
      hotelId: group.punto_partida_hospedaje_id ? String(group.punto_partida_hospedaje_id) : null,
    }
  }

  return {
    source: 'destino_viaje',
    label: group.destino || group.destino_formatted_address || group.nombre || 'Destino',
    formattedAddress: group.destino_formatted_address || group.destino || null,
    latitude: toNumberOrNull(group.destino_latitud),
    longitude: toNumberOrNull(group.destino_longitud),
    placeId: group.destino_place_id || null,
    photoUrl: group.destino_photo_url || null,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RightPanelDashboard({
  members = [],
  group,
  isLoading = false,
  socket,
  onOpenBudget,
  onOpenGroupPanel,
  onOpenMap,
  isMapViewActive = false,
  totalBudget,
  committedBudget,
}: {
  members?: MemberFromBackend[]
  group?: Group | null
  isLoading?: boolean
  socket?: Socket | null
  onOpenBudget?: () => void
  onOpenGroupPanel?: () => void
  onOpenMap?: () => void
  isMapViewActive?: boolean
  totalBudget?: number
  committedBudget?: number
}) {
  const { accessToken } = useAuth()
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [search, setSearch] = useState('')
  const participantTriggerRef = useRef<HTMLDivElement | null>(null)
  const floatingPopoverRef = useRef<HTMLDivElement | null>(null)
  const [popoverAnchorY, setPopoverAnchorY] = useState(0)

  const groupId = group?.id ? String(group.id) : null
  const fallbackStartLocation = useMemo(() => buildSidebarStartLocation(group), [group])
  const [startLocation, setStartLocation] = useState<TravelStartLocation | null>(fallbackStartLocation)

  useEffect(() => {
    setStartLocation(fallbackStartLocation)
  }, [fallbackStartLocation])

  useEffect(() => {
    let isMounted = true

    const loadStartLocation = async () => {
      if (!accessToken || !groupId) return

      try {
        const response = await groupsService.getTravelContext(groupId, accessToken)
        if (!isMounted) return
        setStartLocation(response.data?.startLocation ?? fallbackStartLocation)
      } catch {
        if (!isMounted) return
        setStartLocation(fallbackStartLocation)
      }
    }

    void loadStartLocation()

    return () => {
      isMounted = false
    }
  }, [accessToken, fallbackStartLocation, groupId])


  const participants: Participant[] = useMemo(() => {
    const uniqueMembers: MemberFromBackend[] = []
    const seen = new Set<string>()

    for (const member of members) {
      const key = String(member.usuario_id ?? member.id)
      if (seen.has(key)) continue
      seen.add(key)
      uniqueMembers.push(member)
    }

    return uniqueMembers.map((member, index) => {
      const name = member.nombre || member.email || 'Usuario'
      const colors = ['#1E6FD9', '#35C56A', '#7A4FD6', '#F59E0B']

      return {
        id: String(member.usuario_id ?? member.id),
        name,
        role: member.rol === 'admin' ? 'Organizador' : 'Miembro',
        color: colors[index % colors.length],
        isOnline: onlineUserIds.includes(String(member.usuario_id ?? member.id)),
        avatarUrl: member.avatar_url ?? null,
      }
    })
  }, [members, onlineUserIds])

  const onlineCount = participants.filter((p) => p.isOnline).length

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return participants
    return participants.filter((p) => p.name.toLowerCase().includes(q))
  }, [participants, search])

  const maxVisibleParticipants = 6
  const visibleParticipants = participants.slice(0, maxVisibleParticipants)
  const hiddenParticipantsCount = Math.max(participants.length - maxVisibleParticipants, 0)

  // Budget derived values
  const budgetData = totalBudget != null && totalBudget > 0
    ? (() => {
        const committed = committedBudget ?? 0
        const available = totalBudget - committed
        const pct = totalBudget > 0 ? Math.min((committed / totalBudget) * 100, 100) : 0
        const isOverBudget = totalBudget > 0 && committed > totalBudget
        return { committed, available, pct, isOverBudget }
      })()
    : null

  // Presence socket listener. The right panel joins the group room so the
  // online state works even when the chat drawer is closed.
  useEffect(() => {
    if (!socket || !groupId) return

    socket.emit('join_room', { tripId: groupId })

    const handlePresenceUpdate = (payload: { tripId: string; onlineUserIds: string[] }) => {
      if (String(payload.tripId) !== groupId) return
      setOnlineUserIds(payload.onlineUserIds.map(String))
    }

    socket.on('presence_update', handlePresenceUpdate)

    return () => {
      socket.emit('leave_room', { tripId: groupId })
      socket.off('presence_update', handlePresenceUpdate)
      setOnlineUserIds([])
    }
  }, [socket, groupId])

  // Close popover on click outside
  useEffect(() => {
    if (!popoverOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !participantTriggerRef.current?.contains(target) &&
        !floatingPopoverRef.current?.contains(target)
      ) {
        setPopoverOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popoverOpen])

  if (isLoading) {
    return (
      <>
        <section className="shrink-0">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-gray-200" />
          <div className="mb-2 flex gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
            ))}
          </div>
          <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
        </section>

        <section className="shrink-0">
          <div className="mb-2 h-3 w-20 animate-pulse rounded bg-gray-200" />
          <div className="mb-2 h-28 w-full animate-pulse rounded-xl bg-gray-200" />
          <div className="mb-1 h-3 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
        </section>

        <section className="shrink-0">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-gray-200" />
          <div className="flex flex-col gap-1.5 mb-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex justify-between">
                <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full animate-pulse rounded-full bg-gray-200" />
        </section>

        <section className="shrink-0">
          <div className="h-14 w-full animate-pulse rounded-2xl bg-gray-200" />
        </section>
      </>
    )
  }

  return (
    <>
      {/* Participants */}
      <section className="shrink-0">
        <SectionDivider label="Participantes" color="#1E6FD9" background="#EEF4FF" />

        <div className="overflow-hidden rounded-2xl border border-[#BFDBFE] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]">
          {/* Avatars row */}
          <div ref={participantTriggerRef} className="px-4 pt-3 pb-2">
            <button
              type="button"
              onClick={() => {
                if (participantTriggerRef.current) {
                  const rect = participantTriggerRef.current.getBoundingClientRect()
                  setPopoverAnchorY(rect.top)
                }
                setPopoverOpen((o) => !o)
                setSearch('')
              }}
              className="w-full text-left"
            >
              {participants.length > 0 && (
                <div className="mb-2 flex items-center -space-x-2 overflow-hidden">
                  {visibleParticipants.map((participant) => (
                    <ParticipantAvatar
                      key={participant.id}
                      name={participant.name}
                      color={participant.color}
                      avatarUrl={participant.avatarUrl}
                      className="w-9 h-9 border-2 border-white text-sm"
                    />
                  ))}
                  {hiddenParticipantsCount > 0 && (
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#1E0A4E] text-[13px] font-bold text-white"
                      title={`${hiddenParticipantsCount} participante(s) más`}
                    >
                      +{hiddenParticipantsCount}
                    </div>
                  )}
                </div>
              )}
              <p className="font-body text-sm font-semibold text-[#1E40AF] transition-colors hover:text-[#1E3A8A]">
                {participants.length} participante{participants.length !== 1 ? 's' : ''} · <span className="text-[#059669]">{onlineCount} en línea</span>
              </p>
            </button>
          </div>

          {onOpenGroupPanel && (
            <div className="border-t border-[#BFDBFE] px-4 py-2.5">
              <button
                type="button"
                onClick={onOpenGroupPanel}
                className="w-full font-body text-sm font-semibold text-[#1D4ED8] transition-colors hover:text-[#1E40AF]"
              >
                Invitar o gestionar miembros →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Mini map */}
      <section className="shrink-0">
        <SectionDivider label="Punto de partida" color="#7A4FD6" background="#F3EEFF" />

        <div className="overflow-hidden rounded-2xl border border-[#DDD6FE] bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE]">
          {/* Map */}
          <div className="relative overflow-hidden">
            <GoogleMiniMap
              lat={startLocation?.latitude}
              lng={startLocation?.longitude}
              title={startLocation?.label || group?.nombre || 'Punto de partida'}
            />
            {startLocation?.source === 'hotel_reservado' && (
              <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 font-body text-[11px] font-bold text-greenAccent shadow-sm">
                Hotel
              </span>
            )}
          </div>

          {/* Location label */}
          <div className="px-3 py-2.5">
            <p
              className="line-clamp-1 font-body text-sm font-semibold text-[#5B21B6] leading-snug"
              title={startLocation?.formattedAddress || startLocation?.label || ''}
            >
              {formatLocationShort(startLocation?.label, startLocation?.formattedAddress)}
            </p>
          </div>

          {startLocation?.latitude != null && startLocation?.longitude != null && (
            <div className="flex gap-0 border-t border-[#DDD6FE] divide-x divide-[#DDD6FE]">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${startLocation.latitude},${startLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 text-center font-body text-xs font-semibold text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors"
              >
                Abrir mapa
              </a>
              {onOpenMap && (
                <button
                  type="button"
                  onClick={onOpenMap}
                  aria-pressed={isMapViewActive}
                  className={`flex-1 py-2 font-body text-xs font-semibold transition-colors ${
                    isMapViewActive
                      ? 'bg-[#EDE9FE] text-[#5B21B6]'
                      : 'text-[#6D28D9] hover:bg-[#EDE9FE]'
                  }`}
                >
                  {isMapViewActive ? 'Rutas activas' : 'Ver rutas'}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Mini budget */}
      <section className="shrink-0">
        <SectionDivider label="Presupuesto" color="#35C56A" background="#EAFBF1" />

        {budgetData === null ? (
          <div className="rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] px-4 py-3">
            <p className="font-body text-sm text-[#6B7280]">Sin presupuesto definido</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#D1FAE5] bg-gradient-to-br from-[#F0FDF4] to-[#ECFDF5]">
            {/* Total destacado */}
            <div className="border-b border-[#D1FAE5] px-4 py-3">
              <p className="font-body text-xs font-bold uppercase tracking-wide text-[#047857]">Presupuesto total</p>
              <p className="mt-0.5 font-heading text-2xl font-extrabold text-[#065F46]">
                {formatMXN(totalBudget!)}
              </p>
            </div>

            {/* Comprometido y disponible */}
            <div className="grid grid-cols-2 divide-x divide-[#D1FAE5]">
              <div className="px-4 py-3">
                <p className="font-body text-xs font-bold uppercase tracking-wide text-[#B91C1C]">Comprometido</p>
                <p className={`mt-0.5 font-heading text-lg font-bold ${budgetData.isOverBudget ? 'text-[#B91C1C]' : 'text-[#DC2626]'}`}>
                  {formatMXN(budgetData.committed)}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="font-body text-xs font-bold uppercase tracking-wide text-[#047857]">Disponible</p>
                <p className={`mt-0.5 font-heading text-lg font-bold ${budgetData.available < 0 ? 'text-[#B91C1C]' : 'text-[#059669]'}`}>
                  {formatMXN(budgetData.available)}
                </p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="px-4 pb-3">
              <div className="h-2 overflow-hidden rounded-full bg-[#D1FAE5]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${budgetData.pct}%`,
                    background: budgetData.isOverBudget
                      ? 'linear-gradient(90deg, #EF4444, #B91C1C)'
                      : 'linear-gradient(90deg, #34D399, #059669)',
                  }}
                />
              </div>
              <p className={`mt-1 font-body text-xs font-semibold text-right ${budgetData.isOverBudget ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                {budgetData.isOverBudget ? '⚠ Presupuesto excedido' : `${budgetData.pct.toFixed(0)}% comprometido`}
              </p>
            </div>

            {onOpenBudget && (
              <div className="border-t border-[#D1FAE5] px-4 py-2.5">
                <button
                  type="button"
                  onClick={onOpenBudget}
                  className="w-full font-body text-sm font-semibold text-[#059669] transition-colors hover:text-[#047857]"
                >
                  Ajustar presupuesto →
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Participant search portal — floats to the left of the right panel */}
      {popoverOpen && createPortal(
        <div
          ref={floatingPopoverRef}
          className="fixed z-[200] w-[260px] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
          style={{ right: 292, top: popoverAnchorY }}
        >
          <div className="border-b border-[#E2E8F0] px-4 py-3">
            <p className="font-body text-sm font-bold text-[#1E0A4E]">Participantes del viaje</p>
          </div>
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-3 py-2.5">
            <IconSearch />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar miembro..."
              autoFocus
              className="flex-1 bg-transparent font-body text-sm text-gray700 outline-none placeholder-gray-400"
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {filteredParticipants.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-gray500">Sin resultados</p>
            ) : (
              filteredParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#F0EEF8]"
                >
                  <ParticipantAvatar
                    name={participant.name}
                    color={participant.color}
                    avatarUrl={participant.avatarUrl}
                    className="h-8 w-8 shrink-0 text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-semibold leading-none text-gray700">
                      {participant.name}
                    </p>
                    <p className="mt-0.5 font-body text-xs leading-none" style={{ color: participant.color }}>
                      {participant.role}
                    </p>
                  </div>
                  {participant.isOnline && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-greenAccent" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

    </>
  )
}
