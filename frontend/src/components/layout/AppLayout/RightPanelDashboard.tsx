import { useEffect, useMemo, useRef, useState } from 'react'
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

function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
  onOpenChat,
  unreadCount = 0,
  totalBudget,
  committedBudget,
}: {
  members?: MemberFromBackend[]
  group?: Group | null
  isLoading?: boolean
  socket?: Socket | null
  onOpenChat?: () => void
  unreadCount?: number
  totalBudget?: number
  committedBudget?: number
}) {
  const { accessToken } = useAuth()
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [search, setSearch] = useState('')
  const popoverRef = useRef<HTMLDivElement | null>(null)

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

  // Presence-only socket listener — room joining is handled by ChatDrawer
  useEffect(() => {
    if (!socket || !groupId) return

    const handlePresenceUpdate = (payload: { tripId: string; onlineUserIds: string[] }) => {
      if (String(payload.tripId) !== groupId) return
      setOnlineUserIds(payload.onlineUserIds.map(String))
    }

    socket.on('presence_update', handlePresenceUpdate)

    return () => {
      socket.off('presence_update', handlePresenceUpdate)
      setOnlineUserIds([])
    }
  }, [socket, groupId])

  // Close popover on click outside
  useEffect(() => {
    if (!popoverOpen) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
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
        <p className="font-body text-[10px] font-semibold text-gray500 uppercase tracking-widest mb-3">
          Participantes
        </p>

        {/* Trigger: avatars + summary text — wrapped with popover in same ref for click-outside */}
        <div ref={popoverRef} className="relative">
          <button
            type="button"
            onClick={() => { setPopoverOpen((o) => !o); setSearch('') }}
            className="w-full text-left"
          >
            {participants.length > 0 && (
              <div className="flex -space-x-2 mb-2">
                {participants.map((participant) => (
                  <ParticipantAvatar
                    key={participant.id}
                    name={participant.name}
                    color={participant.color}
                    avatarUrl={participant.avatarUrl}
                    className="w-9 h-9 border-2 border-white text-sm"
                  />
                ))}
              </div>
            )}
            <p className="font-body text-xs text-gray500 hover:text-gray700 transition-colors">
              {participants.length} participante{participants.length !== 1 ? 's' : ''} · {onlineCount} en línea
            </p>
          </button>

          {/* Popover */}
          {popoverOpen && (
            <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-[#E2E8F0] z-50 overflow-hidden">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#E2E8F0]">
                <IconSearch />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar miembro..."
                  autoFocus
                  className="flex-1 font-body text-xs outline-none text-gray700 placeholder-gray-400 bg-transparent"
                />
              </div>

              {/* List */}
              <div className="max-h-[280px] overflow-y-auto">
                {filteredParticipants.length === 0 ? (
                  <p className="font-body text-xs text-gray500 text-center py-4">Sin resultados</p>
                ) : (
                  filteredParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F0EEF8] transition-colors"
                    >
                      <ParticipantAvatar
                        name={participant.name}
                        color={participant.color}
                        avatarUrl={participant.avatarUrl}
                        className="w-7 h-7 text-[10px]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-semibold text-gray700 truncate leading-none">
                          {participant.name}
                        </p>
                        <p
                          className="font-body text-[10px] mt-0.5 leading-none"
                          style={{ color: participant.color }}
                        >
                          {participant.role}
                        </p>
                      </div>
                      {participant.isOnline && (
                        <span className="w-2 h-2 rounded-full bg-greenAccent shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Mini map */}
      <section className="shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-body text-[10px] font-semibold text-gray500 uppercase tracking-widest">
            Punto de partida
          </p>
          {startLocation?.source === 'hotel_reservado' && (
            <span className="rounded-full bg-greenAccent/10 px-2 py-0.5 font-body text-[10px] font-bold text-greenAccent">
              Hotel reservado
            </span>
          )}
        </div>

        <div className="mb-2">
          <GoogleMiniMap
            lat={startLocation?.latitude}
            lng={startLocation?.longitude}
            title={startLocation?.label || group?.nombre || 'Punto de partida'}
          />
        </div>

        <p className="font-body text-xs font-bold text-purpleNavbar leading-none">
          {startLocation?.label || 'Punto de partida pendiente'}
        </p>

        <p className="font-body text-[11px] text-gray500 mt-0.5 leading-none">
          {startLocation?.formattedAddress || 'Ubicación no disponible'}
        </p>

        {startLocation?.latitude != null && startLocation?.longitude != null && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${startLocation.latitude},${startLocation.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="font-body text-[11px] text-bluePrimary mt-1.5 hover:underline inline-block"
          >
            Ver en mapa completo →
          </a>
        )}
      </section>

      {/* Mini budget */}
      <section className="shrink-0">
        <p className="font-body text-[10px] font-semibold text-gray500 uppercase tracking-widest mb-3">
          Presupuesto
        </p>

        {budgetData === null ? (
          <p className="font-body text-xs text-gray500">Sin presupuesto definido</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 mb-3">
              <div className="flex items-center justify-between">
                <span className="font-body text-[11px] text-gray500">Total</span>
                <span className="font-body text-[11px] font-semibold text-[#1E0A4E]">
                  {formatMXN(totalBudget!)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-[11px] text-gray500">Comprometido</span>
                <span className={`font-body text-[11px] font-semibold ${budgetData.isOverBudget ? 'text-[#B91C1C]' : 'text-[#EF4444]'}`}>
                  {formatMXN(budgetData.committed)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-[11px] text-gray500">Disponible</span>
                <span className={`font-body text-[11px] font-semibold ${budgetData.available < 0 ? 'text-[#B91C1C]' : 'text-[#35C56A]'}`}>
                  {formatMXN(budgetData.available)}
                </span>
              </div>
            </div>

            <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${budgetData.pct}%`,
                  background: 'linear-gradient(90deg, #1E6FD9, #7A4FD6)',
                }}
              />
            </div>
            <p className="font-body text-[10px] text-gray500 text-right">
              {budgetData.isOverBudget ? 'Presupuesto excedido' : `${budgetData.pct.toFixed(0)}% comprometido`}
            </p>
          </>
        )}
      </section>

      {/* Open chat button */}
      <section className="shrink-0">
        <button
          type="button"
          onClick={onOpenChat}
          disabled={!onOpenChat}
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 hover:bg-[#F0EEF8] hover:border-[#7A4FD6]/30 transition-colors group shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #1E0A4E, #7A4FD6)' }}
            >
              <IconChat />
            </div>
            <div className="text-left">
              <p className="font-body text-sm font-semibold text-[#1E0A4E] leading-none">
                Chat del grupo
              </p>
              <p className="font-body text-[11px] text-gray500 mt-0.5 leading-none">
                {onlineCount > 0 ? `${onlineCount} en línea` : 'Abrir chat'}
              </p>
            </div>
          </div>

          {unreadCount > 0 ? (
            <span className="w-5 h-5 rounded-full bg-[#EF4444] flex items-center justify-center font-body text-[10px] font-bold text-white shrink-0">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-gray500 group-hover:text-[#7A4FD6] transition-colors shrink-0"
              aria-hidden="true"
            >
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </section>
    </>
  )
}
