import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getCurrentGroup, groupsService } from '../../services/groups'
import type { ItineraryDay } from '../../services/groups'
import { mapsService } from '../../services/maps'
import { proposalsService, type ProposalComment, type VoteResult } from '../../services/proposals'
import { useAuth } from '../../context/useAuth'
import { AppLayout, RightPanelDashboard, SidebarDashboard } from '../../components/layout/AppLayout'
import { DayView } from '../../components/ui/DayView'
import type { Activity as DayActivity, DayViewHandle } from '../../components/ui/DayView'
import { ProposalCard } from '../../components/ProposalCard/ProposalCard'
import { ComparisonPage } from '../Comparison/ComparisonPage'
import { ActivityProposalModal } from '../../components/ActivityProposalModal/ActivityProposalModal'
import { useSocket } from '../../hooks/useSocket'
import type { Group } from '../../types/groups'


function IconDownload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconInfo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SkeletonPulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />
}

function SkeletonView() {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <SkeletonPulse className="h-52 rounded-2xl" />
      <SkeletonPulse className="h-14 rounded-2xl" />
      <SkeletonPulse className="h-12 rounded-xl" />
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <SkeletonPulse className="mb-4 h-6 w-40" />
          <SkeletonPulse className="mb-2 h-4 w-full" />
          <SkeletonPulse className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-bluePrimary/10">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-bluePrimary" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
          <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="mb-2 font-heading text-lg font-bold text-purpleNavbar">Tu itinerario está vacío</h3>
      <p className="mb-6 max-w-xs font-body text-sm leading-relaxed text-gray500">
        Empieza proponiendo actividades, vuelos u hoteles para este día. El grupo podrá votar y confirmar.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl bg-bluePrimary px-5 py-3 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <IconPlus size={14} />
        Proponer primera actividad
      </button>
    </div>
  )
}

function HeroCard({
  activeDay,
  totalDays,
  selectedDay,
  group,
  onAdd,
  onExportPdf,
}: {
  activeDay: number | null
  totalDays: number
  selectedDay?: ItineraryDay
  group: ReturnType<typeof getCurrentGroup> | null
  onAdd: () => void
  onExportPdf: () => void
}) {
  const activities = selectedDay?.activities ?? []
  const pending = activities.filter((activity) => activity.status === 'pendiente').length
  const destination = group?.destino || group?.destino_formatted_address || 'Destino pendiente'
  const dateLabel = selectedDay?.date?.toUpperCase() || group?.fecha_inicio || 'Fecha pendiente'
  const heroImage =
    group?.destino_photo_url ||
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=400&fit=crop'

  return (
    <div className="relative mb-4 h-52 shrink-0 overflow-hidden rounded-2xl">
      <img
        src={heroImage}
        alt={destination}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      <div className="absolute left-4 top-4 flex gap-2">
        <span className="rounded-full bg-white/20 px-3 py-1 font-body text-[11px] font-bold text-white backdrop-blur-sm">
          {activeDay !== null ? `DÍA ${activeDay} / ${totalDays}` : `${destination.toUpperCase()}`}
        </span>
        <span className="rounded-full bg-white/20 px-3 py-1 font-body text-[11px] font-bold text-white backdrop-blur-sm">
          {dateLabel}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
        <h1 className="mb-1 font-heading text-[28px] font-bold leading-tight text-white">
          {activeDay !== null ? `Día ${activeDay}` : destination}
        </h1>
        <p className="mb-3 font-body text-[13px] text-white/70">
          {activities.length} actividad{activities.length !== 1 ? 'es' : ''} planeada{activities.length !== 1 ? 's' : ''} · {pending} pendiente{pending !== 1 ? 's' : ''} de confirmación
        </p>
        <div className="flex gap-2">
          <button
            onClick={onExportPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/50 px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <IconDownload size={13} />
            Exportar PDF
          </button>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-greenAccent px-4 py-2 font-body text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <IconPlus size={13} />
            Proponer actividad
          </button>
        </div>
      </div>
    </div>
  )
}

function TimelineStrip({
  activeDay,
  date,
  activities = [],
}: {
  activeDay: number | null
  date?: string
  activities?: DayActivity[]
}) {
  if (activeDay === null) {
    return (
      <div className="mb-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bluePrimary/10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-bluePrimary" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <p className="text-center font-body text-sm text-gray500">Selecciona un día para ver su progreso</p>
      </div>
    )
  }

  const confirmed = activities.filter((activity) => activity.status === 'confirmada').length
  const pending = activities.filter((activity) => activity.status === 'pendiente').length
  const total = activities.length
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0
  const transport = activities.filter((activity) => activity.category === 'transporte').length
  const lodging = activities.filter((activity) => activity.category === 'hospedaje').length
  const acts = activities.filter((activity) => activity.category === 'actividad').length

  return (
    <div className="mb-4 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4">
      <div className="flex items-start gap-5">
        <div className="shrink-0">
          <span className="inline-flex rounded-full bg-bluePrimary/10 px-3 py-1 font-body text-[11px] font-bold leading-none text-bluePrimary">
            DÍA {activeDay}{date ? ` · ${date.toUpperCase()}` : ''}
          </span>
          <p className="mt-2 font-heading text-sm font-bold leading-none text-purpleNavbar">Progreso del día</p>
          <p className="mt-1 font-body text-xs leading-none text-gray500">
            {confirmed} de {total} actividades confirmadas
          </p>
        </div>

        <div className="flex-1 pt-0.5">
          <div className="h-3 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #1E6FD9, #35C56A)' }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 font-body text-[11px] text-gray500">
              <span className="h-2 w-2 shrink-0 rounded-full bg-greenAccent" />
              Confirmadas · {confirmed}
            </span>
            <span className="flex items-center gap-1.5 font-body text-[11px] text-gray500">
              <span className="h-2 w-2 shrink-0 rounded-full bg-purpleMedium" />
              Por confirmar · {pending}
            </span>
          </div>
        </div>
      </div>

      {(transport > 0 || lodging > 0 || acts > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {transport > 0 && (
            <span className="rounded-full bg-[#EEF4FF] px-3 py-1 font-body text-[11px] leading-none text-bluePrimary">
              {transport} traslado{transport !== 1 ? 's' : ''}
            </span>
          )}
          {lodging > 0 && (
            <span className="rounded-full bg-[#EEF4FF] px-3 py-1 font-body text-[11px] leading-none text-bluePrimary">
              {lodging} hospedaje{lodging !== 1 ? 's' : ''}
            </span>
          )}
          {acts > 0 && (
            <span className="rounded-full bg-surface px-3 py-1 font-body text-[11px] leading-none text-purpleMedium">
              {acts} actividad{acts !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function InfoBanner({ memberCount }: { memberCount: number }) {
  const isSoloTrip = memberCount <= 1

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-bluePrimary/20 bg-[#EEF4FF] px-4 py-3">
      <span className="mt-0.5 shrink-0 text-bluePrimary">
        <IconInfo size={16} />
      </span>
      <div>
        <p className="font-body text-sm font-semibold leading-tight text-gray700">
          {isSoloTrip ? 'Tus propuestas se confirman automaticamente' : 'Acepta propuestas para confirmarlas'}
        </p>
        <p className="mt-0.5 font-body text-xs leading-relaxed text-gray500">
          {isSoloTrip
            ? 'Como eres el unico integrante, cada propuesta nueva se aprueba en cuanto la creas.'
            : 'Las actividades con votos necesitan tu aprobacion para ser incluidas en el itinerario final del grupo.'}
        </p>
      </div>
    </div>
  )
}

function BottomNavbar({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const tabs = [
    {
      id: 'buscar',
      label: 'Buscar',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'comparar',
      label: 'Comparar',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'mapas',
      label: 'Mapas',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="8" y1="2" x2="8" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="6" x2="16" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'pagar',
      label: 'Pagar',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex h-14 shrink-0 items-center justify-around border-t border-[#E2E8F0] bg-white px-4">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={[
              'rounded-lg px-3 py-1 font-body text-[10px] font-medium transition-colors',
              isActive ? 'text-bluePrimary' : 'text-gray500 hover:text-gray700',
            ].join(' ')}
          >
            <span className="flex flex-col items-center gap-0.5">
              {tab.icon}
              <span>{tab.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MapsTabView({
  days,
}: {
  days: ItineraryDay[]
}) {
  const activities = days.flatMap((day) =>
    day.activities.map((activity) => ({
      ...activity,
      dayNumber: day.dayNumber,
      dayDate: day.date,
    }))
  )

  const withCoords = activities.filter((activity) => activity.latitude != null && activity.longitude != null)

  if (withCoords.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center">
        <p className="font-body text-sm text-gray500">
          No hay actividades con ubicacion para mostrar en mapas.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {withCoords.map((activity) => (
        <div key={activity.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-bluePrimary">
            Dia {activity.dayNumber} · {activity.dayDate}
          </p>
          <h3 className="mt-1 font-heading text-base font-bold text-purpleNavbar">{activity.title}</h3>
          <p className="mt-1 font-body text-sm text-gray500">{activity.location || 'Ubicacion no disponible'}</p>
          {activity.routeDistanceText && activity.routeDurationText && (
            <p className="mt-2 font-body text-xs text-gray700">
              Ruta estimada: {activity.routeDistanceText} · {activity.routeDurationText}
            </p>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-body text-xs font-semibold text-bluePrimary hover:underline"
          >
            Abrir en Google Maps →
          </a>
        </div>
      ))}
    </div>
  )
}

const ROUTE_TRAVEL_MODE = 'DRIVE' as const

async function enrichDaysWithRoutes(
  itineraryDays: ItineraryDay[],
  group: Group | null,
  token: string
): Promise<ItineraryDay[]> {
  const originLat = group?.destino_latitud
  const originLng = group?.destino_longitud

  if (originLat == null || originLng == null) {
    return itineraryDays
  }

  const routeTasks = itineraryDays.flatMap((day) =>
    day.activities
      .filter((activity) => activity.latitude != null && activity.longitude != null)
      .map(async (activity) => {
        try {
          const response = await mapsService.computeRoute(
            {
              originLat,
              originLng,
              destinationLat: Number(activity.latitude),
              destinationLng: Number(activity.longitude),
              travelMode: ROUTE_TRAVEL_MODE,
            },
            token
          )

          return {
            activityId: activity.id,
            routeDistanceText: response.data?.distanceText ?? null,
            routeDurationText: response.data?.durationText ?? response.data?.staticDurationText ?? null,
            routeTravelMode: ROUTE_TRAVEL_MODE,
          }
        } catch {
          return {
            activityId: activity.id,
            routeDistanceText: null,
            routeDurationText: null,
            routeTravelMode: null,
          }
        }
      })
  )

  const routeResults = await Promise.all(routeTasks)
  const routeMap = new Map(routeResults.map((item) => [item.activityId, item]))

  return itineraryDays.map((day) => ({
    ...day,
    activities: day.activities.map((activity) => {
      const route = routeMap.get(activity.id)
      if (!route) return activity

      return {
        ...activity,
        routeDistanceText: route.routeDistanceText,
        routeDurationText: route.routeDurationText,
        routeTravelMode: route.routeTravelMode,
      }
    }),
  }))
}

export function DashboardPage() {

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { localUser, accessToken } = useAuth()
  const { socket, isConnected: isSocketConnected } = useSocket(accessToken)

  const location = useLocation()
  const groupIdFromState = location.state?.groupId

  const groupId = searchParams.get('groupId')
  const currentGroup = getCurrentGroup()

  const userName = localUser?.nombre || localUser?.email || 'Usuario'
  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const [activeDay,   setActiveDay]   = useState<number | null>(null)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [activeTab,   setActiveTab]   = useState('pagar')
  const [isLoading,   setIsLoading]   = useState(false)
  const [days,        setDays]        = useState<ItineraryDay[]>([])
  const [group, setGroup] = useState<typeof currentGroup>(currentGroup)
  const [members, setMembers] = useState<Parameters<typeof RightPanelDashboard>[0]['members']>([])
  const dayRefs = useRef<Record<number, DayViewHandle | null>>({})
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [selectedActivityDay, setSelectedActivityDay] = useState<number | null>(null)
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null)
  const [acceptingActivityId, setAcceptingActivityId] = useState<string | null>(null)
  const [acceptErrorActivityIds, setAcceptErrorActivityIds] = useState<Record<string, boolean>>({})
  const [votedActivityIds, setVotedActivityIds] = useState<Record<string, boolean>>({})
  const [lockedProposalIds, setLockedProposalIds] = useState<Record<string, boolean>>({})
  const [lockErrorActivityIds, setLockErrorActivityIds] = useState<Record<string, boolean>>({})
  const [voteResultByProposal, setVoteResultByProposal] = useState<Record<string, VoteResult>>({})
  const [expandedCommentsProposalId, setExpandedCommentsProposalId] = useState<string | null>(null)
  const [commentsByProposal, setCommentsByProposal] = useState<Record<string, ProposalComment[]>>({})
  const [commentDraftByProposal, setCommentDraftByProposal] = useState<Record<string, string>>({})
  const [loadingCommentsProposalId, setLoadingCommentsProposalId] = useState<string | null>(null)
  const [sendingCommentProposalId, setSendingCommentProposalId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [visibleCommentsCountByProposal, setVisibleCommentsCountByProposal] = useState<Record<string, number>>({})

  const handleDayChange = useCallback((dayNumber: number) => {
    const next = activeDay === dayNumber ? null : dayNumber
    setActiveDay(next)
    setExpandedDay(next)
  }, [activeDay])

  const openActivityModalForDay = useCallback((dayNumber: number) => {
    setActiveDay(dayNumber)
    setExpandedDay(dayNumber)
    setSelectedActivityDay(dayNumber)
    setShowActivityModal(true)
  }, [])

  // const handleDayExpand = useCallback((dayNumber: number) => {
  //   setExpandedDay((prev) => prev === dayNumber ? null : dayNumber)
  // }, [])

  const isEmpty = days.length === 0
  const resolvedGroupId = groupIdFromState || groupId || currentGroup?.id || null
  const selectedDay = activeDay !== null ? days.find((day) => day.dayNumber === activeDay) : undefined
  const safeMembers = (Array.isArray(members) ? members : []).filter(
    (member): member is NonNullable<NonNullable<typeof members>[number]> => Boolean(member),
  )
  const uniqueMemberCount = new Set(safeMembers.map((member) => String(member.usuario_id ?? member.id))).size
  const currentMember = safeMembers.find(
    (member) => String(member.usuario_id ?? member.id) === String(localUser?.id_usuario)
  )
  const currentUserRole = currentMember?.rol ?? group?.myRole ?? currentGroup?.myRole ?? 'viajero'
  const isCurrentUserAdmin = currentUserRole === 'admin' || currentUserRole === 'organizador'

  useEffect(() => {
  const resolvedGroupId = groupIdFromState || groupId || currentGroup?.id

  if (!resolvedGroupId) {
    navigate('/my-trips')
    return
  }

  if (!accessToken) return

  let isMounted = true

  const loadDashboard = async () => {
    try {
      setIsLoading(true)

      const groupRes = await groupsService.getGroupDetails(resolvedGroupId, accessToken)
      const membersRes = await groupsService.getMembers(resolvedGroupId, accessToken)
      const itineraryRes = await groupsService.getItinerary(resolvedGroupId, accessToken)
      const votesRes = await proposalsService.getVoteResults(String(resolvedGroupId), accessToken)
      const daysWithRoutes = await enrichDaysWithRoutes(itineraryRes.days, groupRes.group, accessToken)
      const nextVotesMap = (votesRes.results ?? []).reduce<Record<string, VoteResult>>((acc, item: VoteResult) => {
        acc[String(item.id_propuesta)] = item
        return acc
      }, {})

      if (isMounted) {
        setGroup(groupRes.group)
        setMembers(membersRes.members ?? [])
        setDays(daysWithRoutes)
        setVoteResultByProposal(nextVotesMap)
        setVotedActivityIds({})
      }
    } catch (error) {
      console.error('Error cargando dashboard:', error)

      if (isMounted) {
        setDays([])
      }
    } finally {
      if (isMounted) {
        setIsLoading(false)
      }
    }
  }

  void loadDashboard()

  return () => {
      isMounted = false
    }
  }, [groupIdFromState, groupId, currentGroup?.id, accessToken, navigate])

  const reloadDashboard = useCallback(async () => {
    const resolvedGroupId = groupIdFromState || groupId || currentGroup?.id

    if (!resolvedGroupId || !accessToken) return

    const itineraryRes = await groupsService.getItinerary(resolvedGroupId, accessToken)
    const daysWithRoutes = await enrichDaysWithRoutes(itineraryRes.days, group, accessToken)
    setDays(daysWithRoutes)
    setVotedActivityIds({})

    const votesRes = await proposalsService.getVoteResults(String(resolvedGroupId), accessToken)
    const nextVotesMap = (votesRes.results ?? []).reduce<Record<string, VoteResult>>((acc, item: VoteResult) => {
      acc[String(item.id_propuesta)] = item
      return acc
    }, {})
    setVoteResultByProposal(nextVotesMap)
  }, [groupIdFromState, groupId, currentGroup?.id, accessToken, group])

  const handleDeleteActivity = useCallback(async (activityId: string) => {
    const resolvedGroupId = groupIdFromState || groupId || currentGroup?.id

    if (!resolvedGroupId || !accessToken) return

    await groupsService.deleteActivity(String(resolvedGroupId), activityId, accessToken)
    await reloadDashboard()
  }, [groupIdFromState, groupId, currentGroup?.id, accessToken, reloadDashboard])

  const lockProposalForActivity = useCallback((activity: DayActivity | null) => {
    if (!socket || !activity?.proposalId) return
    socket.emit('item_lock', { propuestaId: activity.proposalId, tripId: groupId || currentGroup?.id })
  }, [socket, groupId, currentGroup?.id])

  const unlockProposalForActivity = useCallback((activity: DayActivity | null) => {
    if (!socket || !activity?.proposalId) return
    socket.emit('item_unlock', { propuestaId: activity.proposalId, tripId: groupId || currentGroup?.id })
  }, [socket, groupId, currentGroup?.id])

  const handleAcceptActivity = useCallback(async (activityId: string) => {
    const resolvedGroupId = groupIdFromState || groupId || currentGroup?.id

    if (!resolvedGroupId || !accessToken) return

    const activity = days.flatMap((day) => day.activities).find((item) => item.id === activityId)
    const proposalId = activity?.proposalId

    if (!proposalId) {
      setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: true }))
      return
    }

    try {
      setAcceptingActivityId(activityId)
      setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: false }))

      await proposalsService.voteProposal(String(resolvedGroupId), proposalId, { voto: 'a_favor' }, accessToken)
      setVotedActivityIds((prev) => ({ ...prev, [activityId]: true }))
      await reloadDashboard()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('ya emitiste tu voto')) {
        setVotedActivityIds((prev) => ({ ...prev, [activityId]: true }))
        setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: false }))
      } else {
        setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: true }))
      }
    } finally {
      setAcceptingActivityId(null)
    }
  }, [groupIdFromState, groupId, currentGroup?.id, accessToken, days, reloadDashboard])

  const handleRejectActivity = useCallback(async (activityId: string) => {
    const resolvedGroupId = groupIdFromState || groupId || currentGroup?.id

    if (!resolvedGroupId || !accessToken) return

    const activity = days.flatMap((day) => day.activities).find((item) => item.id === activityId)
    const proposalId = activity?.proposalId

    if (!proposalId) {
      setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: true }))
      return
    }

    try {
      setAcceptingActivityId(activityId)
      setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: false }))
      await proposalsService.voteProposal(String(resolvedGroupId), proposalId, { voto: 'en_contra' }, accessToken)
      setVotedActivityIds((prev) => ({ ...prev, [activityId]: true }))
      await reloadDashboard()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('ya emitiste tu voto')) {
        setVotedActivityIds((prev) => ({ ...prev, [activityId]: true }))
        setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: false }))
      } else {
        setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: true }))
      }
    } finally {
      setAcceptingActivityId(null)
    }
  }, [groupIdFromState, groupId, currentGroup?.id, accessToken, days, reloadDashboard])

  const handleAdminDecision = useCallback(async (proposalId: string, decision: 'aprobar' | 'rechazar') => {
    const resolvedGroupId = groupIdFromState || groupId || currentGroup?.id
    if (!resolvedGroupId || !accessToken) return
    await proposalsService.applyAdminDecision(String(resolvedGroupId), proposalId, { decision }, accessToken)
    await reloadDashboard()
  }, [groupIdFromState, groupId, currentGroup?.id, accessToken, reloadDashboard])

  const handleToggleComments = useCallback(async (proposalId: string) => {
    if (!accessToken || !resolvedGroupId) return

    const isSame = expandedCommentsProposalId === proposalId
    if (isSame) {
      setExpandedCommentsProposalId(null)
      return
    }

    setExpandedCommentsProposalId(proposalId)
    setVisibleCommentsCountByProposal((prev) => ({
      ...prev,
      [proposalId]: prev[proposalId] ?? 3,
    }))

    if (commentsByProposal[proposalId]) return

    try {
      setLoadingCommentsProposalId(proposalId)
      const response = await proposalsService.getComments(String(resolvedGroupId), proposalId, accessToken)
      setCommentsByProposal((prev) => ({ ...prev, [proposalId]: response.comments ?? [] }))
    } finally {
      setLoadingCommentsProposalId(null)
    }
  }, [accessToken, resolvedGroupId, expandedCommentsProposalId, commentsByProposal])

  const handleCreateComment = useCallback(async (proposalId: string) => {
    const content = commentDraftByProposal[proposalId]?.trim()
    if (!content || !accessToken || !resolvedGroupId) return

    try {
      setSendingCommentProposalId(proposalId)
      const response = await proposalsService.addComment(String(resolvedGroupId), proposalId, { contenido: content }, accessToken)
      setCommentsByProposal((prev) => ({
        ...prev,
        [proposalId]: [...(prev[proposalId] ?? []), response.comment],
      }))
      setCommentDraftByProposal((prev) => ({ ...prev, [proposalId]: '' }))
    } finally {
      setSendingCommentProposalId(null)
    }
  }, [commentDraftByProposal, accessToken, resolvedGroupId])

  const handleStartEditComment = useCallback((comment: ProposalComment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.contenido)
  }, [])

  const handleCancelEditComment = useCallback(() => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }, [])

  const handleSaveEditComment = useCallback(async (proposalId: string, commentId: string) => {
    const content = editingCommentText.trim()
    if (!content || !accessToken || !resolvedGroupId) return

    const response = await proposalsService.updateComment(
      String(resolvedGroupId),
      proposalId,
      commentId,
      { contenido: content },
      accessToken
    )

    setCommentsByProposal((prev) => ({
      ...prev,
      [proposalId]: (prev[proposalId] ?? []).map((item) =>
        item.id === commentId ? response.comment : item
      ),
    }))
    setEditingCommentId(null)
    setEditingCommentText('')
  }, [editingCommentText, accessToken, resolvedGroupId])

  const handleDeleteComment = useCallback(async (proposalId: string, commentId: string) => {
    if (!accessToken || !resolvedGroupId) return

    await proposalsService.deleteComment(String(resolvedGroupId), proposalId, commentId, accessToken)
    setCommentsByProposal((prev) => ({
      ...prev,
      [proposalId]: (prev[proposalId] ?? []).filter((item) => item.id !== commentId),
    }))
  }, [accessToken, resolvedGroupId])

  const handleExportConfirmedItineraryPdf = useCallback(() => {
    const escapeHtml = (value: string) =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')

    const confirmedByDay = days
      .map((day) => ({
        dayNumber: day.dayNumber,
        date: day.date,
        activities: day.activities.filter((activity) => activity.status === 'confirmada'),
      }))
      .filter((day) => day.activities.length > 0)

    if (confirmedByDay.length === 0) {
      window.alert('No hay actividades confirmadas para exportar.')
      return
    }

    const generatedAt = new Date().toLocaleString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const sectionsHtml = confirmedByDay
      .map((day) => {
        const items = day.activities
          .map((activity, index) => {
            const routeText =
              activity.routeDistanceText && activity.routeDurationText
                ? `${activity.routeDistanceText} · ${activity.routeDurationText}`
                : 'Ruta no disponible'

            return `
              <article class="activity-card">
                <div class="activity-index">${index + 1}</div>
                <div class="activity-content">
                  <h4>${escapeHtml(activity.title)}</h4>
                  <p class="desc">${escapeHtml(activity.description || 'Sin descripción')}</p>
                  <div class="chips">
                    <span>Hora: ${escapeHtml(activity.time || 'Hora pendiente')}</span>
                    <span>${escapeHtml(activity.location || 'Ubicación no disponible')}</span>
                    <span>${escapeHtml(routeText)}</span>
                  </div>
                </div>
              </article>
            `
          })
          .join('')

        return `
          <section class="day-section">
            <div class="day-header">
              <h3>Día ${day.dayNumber}</h3>
              <span>${escapeHtml(day.date)}</span>
            </div>
            ${items}
          </section>
        `
      })
      .join('')

    const tripName = escapeHtml(group?.nombre || 'Itinerario')
    const tripDestination = escapeHtml(group?.destino || group?.destino_formatted_address || 'Destino pendiente')
    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Itinerario Confirmado - ${tripName}</title>
          <style>
            :root { --ink:#1E0A4E; --blue:#1E6FD9; --green:#35C56A; --lav:#F6F3FF; --paper:#fff; }
            * { box-sizing: border-box; }
            body { margin:0; font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif; color:#1f2937; background:linear-gradient(145deg,#f3f0ff 0%,#eef4ff 100%); padding:28px; }
            .sheet { max-width:900px; margin:0 auto; background:var(--paper); border:1px solid #e5e7eb; border-radius:18px; overflow:hidden; box-shadow:0 16px 36px rgba(30,10,78,.12); }
            .hero { background:linear-gradient(110deg,var(--ink),#3A1B7A); color:#fff; padding:26px 28px; }
            .hero h1 { margin:0; font-size:28px; line-height:1.1; }
            .hero p { margin:8px 0 0; opacity:.88; font-size:14px; }
            .meta { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
            .meta span { background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.25); padding:6px 10px; border-radius:999px; font-size:12px; }
            .content { padding:20px 22px 26px; }
            .day-section + .day-section { margin-top:16px; }
            .day-header { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; border-bottom:1px dashed #dbe3f2; padding-bottom:8px; }
            .day-header h3 { margin:0; color:var(--ink); font-size:18px; }
            .day-header span { color:#64748b; font-size:13px; font-weight:600; }
            .activity-card { display:flex; gap:12px; background:#fafcff; border:1px solid #d9e4fb; border-radius:14px; padding:12px; margin-bottom:10px; }
            .activity-index { width:28px; height:28px; border-radius:999px; background:var(--blue); color:#fff; display:grid; place-items:center; font-size:13px; font-weight:700; flex-shrink:0; }
            .activity-content h4 { margin:0; color:var(--ink); font-size:16px; }
            .activity-content .desc { margin:5px 0 0; color:#475569; font-size:13px; line-height:1.5; }
            .chips { display:flex; gap:7px; flex-wrap:wrap; margin-top:9px; }
            .chips span { background:var(--lav); border:1px solid #dfd4ff; color:#3f2a83; font-size:11px; padding:5px 8px; border-radius:999px; }
            .footer { border-top:1px solid #e5e7eb; padding:14px 22px; color:#64748b; font-size:12px; display:flex; justify-content:space-between; align-items:center; }
            .dot { width:8px; height:8px; border-radius:999px; background:var(--green); display:inline-block; margin-right:6px; }
            @media print { body { background:#fff; padding:0; } .sheet { border:0; border-radius:0; box-shadow:none; max-width:100%; } @page { size:A4; margin:12mm; } }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="hero">
              <h1>Itinerario confirmado</h1>
              <p>${tripName} · ${tripDestination}</p>
              <div class="meta">
                <span>${confirmedByDay.length} día(s) con actividades confirmadas</span>
                <span>${confirmedByDay.reduce((acc, day) => acc + day.activities.length, 0)} actividad(es) confirmada(s)</span>
              </div>
            </header>
            <section class="content">${sectionsHtml}</section>
            <footer class="footer">
              <span><i class="dot"></i>Generado por ITHERA</span>
              <span>${escapeHtml(generatedAt)}</span>
            </footer>
          </main>
        </body>
      </html>
    `

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const win = window.open(blobUrl, '_blank')

    if (!win) {
      URL.revokeObjectURL(blobUrl)
      window.alert('No se pudo abrir la ventana de exportación. Revisa el bloqueador de ventanas.')
      return
    }

    const cleanup = () => {
      try {
        URL.revokeObjectURL(blobUrl)
      } catch {
        // noop
      }
    }

    const onLoad = () => {
      try {
        win.focus()
        win.print()
      } finally {
        cleanup()
      }
    }

    try {
      win.addEventListener('load', onLoad, { once: true })
    } catch {
      window.setTimeout(() => {
        try {
          win.focus()
          win.print()
        } finally {
          cleanup()
        }
      }, 700)
    }
  }, [days, group])

  useEffect(() => {
    if (!socket) return

    const handleItemLocked = (payload: { propuestaId?: string }) => {
      if (!payload?.propuestaId) return
      setLockedProposalIds((prev) => ({ ...prev, [payload.propuestaId!]: true }))
    }

    const handleItemUnlocked = (payload: { propuestaId?: string }) => {
      if (!payload?.propuestaId) return
      setLockedProposalIds((prev) => ({ ...prev, [payload.propuestaId!]: false }))
      setLockErrorActivityIds({})
    }

    const handleLockError = (payload: { propuestaId?: string }) => {
      const proposalId = payload?.propuestaId
      if (!proposalId) return
      const activity = days.flatMap((day) => day.activities).find((item) => item.proposalId === proposalId)
      if (!activity) return
      setLockErrorActivityIds((prev) => ({ ...prev, [activity.id]: true }))
      setLockedProposalIds((prev) => ({ ...prev, [proposalId]: true }))
    }

    socket.on('item_locked', handleItemLocked)
    socket.on('item_unlocked', handleItemUnlocked)
    socket.on('lock_error', handleLockError)

    return () => {
      socket.off('item_locked', handleItemLocked)
      socket.off('item_unlocked', handleItemUnlocked)
      socket.off('lock_error', handleLockError)
    }
  }, [socket, days])

  return (
    <AppLayout
      trip={{
        name: group?.nombre || 'Itinerario',
        subtitle: group?.destino || 'Destino pendiente',
        dates: `${group?.fecha_inicio || '—'} – ${group?.fecha_fin || '—'}`,
        people: group?.maximo_miembros ? `${group.maximo_miembros} personas máx.` : 'Miembros por definir',
      }}
      user={{
        name: userName,
        role: currentGroup?.myRole === 'admin' ? 'Organizador' : 'Viajero',
        initials,
        color: '#1E6FD9',
      }}
      notificationCount={3}
      isOnline
      sidebarContent={
        <SidebarDashboard
          activeDay={activeDay}
          days={days}
          onDayChange={handleDayChange}
          onOpenGroupPanel={() =>
            navigate(`/grouppanel?groupId=${encodeURIComponent(groupId || currentGroup?.id || '')}`)
          }
        />
      }

      rightPanel={
        <RightPanelDashboard
          members={members}
          group={group}
          isLoading={isLoading}
          socket={socket}
          isSocketConnected={isSocketConnected}
          accessToken={accessToken}
          currentUserId={localUser?.id_usuario}
          currentUserName={userName}
        />
      }
    >
      {isLoading ? (
        <SkeletonView />
      ) : isEmpty ? (
        <EmptyState onAdd={() => setShowActivityModal(true)} />
      ) : activeTab === 'comparar' ? (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <ComparisonPage onBack={() => setActiveTab('pagar')} />
        </div>
      ) : activeTab === 'mapas' ? (
        <div className="flex-1 overflow-y-auto bg-surface px-6 py-6">
          <MapsTabView days={days} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-surface px-6 py-6">
          <HeroCard
            activeDay={activeDay}
            totalDays={days.length}
            selectedDay={selectedDay}
            group={group}
            onAdd={() => openActivityModalForDay(activeDay ?? days[0]?.dayNumber ?? 1)}
            onExportPdf={handleExportConfirmedItineraryPdf}
          />
          <InfoBanner memberCount={uniqueMemberCount} />
          <TimelineStrip activeDay={activeDay} date={selectedDay?.date} activities={selectedDay?.activities} />
          <div className="flex flex-col gap-3">
            {days.map((day) => (
            <DayView
              key={day.dayNumber}
              ref={(handle) => {
                dayRefs.current[day.dayNumber] = handle
              }}
              dayNumber={day.dayNumber}
              date={day.date}
              activities={day.activities}
              currentUserId={localUser?.id_usuario}
              currentUserRole={currentUserRole}
              isActive={day.dayNumber === activeDay}
              isExpanded={day.dayNumber === expandedDay}
              onSelect={handleDayChange}
              onAddActivity={openActivityModalForDay}
              onAccept={(id) => void handleAcceptActivity(id)}
              onDelete={(id) => void handleDeleteActivity(id)}
              onEdit={(id) => {
                const activity = days.flatMap((d) => d.activities).find((a) => a.id === id)
                if (!activity) return
                lockProposalForActivity(activity)
                setEditingActivity(activity)
                setShowActivityModal(true)
              }}
            />
            ))}
          </div>

          {/* ── Propuestas pendientes ── */}
          {(() => {
            const proposalsWithThread = days
              .flatMap((d) => d.activities)
              .filter((a) => a.proposalId && (a.status === 'pendiente' || a.status === 'confirmada'))
            if (proposalsWithThread.length === 0) return null
            return (
              <div className="mt-6">
                <h2 className="font-heading font-bold text-[#1E0A4E] text-base mb-3">
                  Propuestas y comentarios
                </h2>
                <div className="flex flex-col gap-3">
                  {proposalsWithThread.map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-transparent">
                      <ProposalCard
                        activity={activity}
                        currentUserId={localUser?.id_usuario}
                        currentUserRole={currentUserRole}
                        proposalStatus={
                          activity.status === 'confirmada'
                            ? 'bloqueada'
                          : acceptingActivityId === activity.id
                            ? 'procesando'
                          : (activity.proposalId && voteResultByProposal[activity.proposalId]?.mi_voto) || activity.hasVoted || votedActivityIds[activity.id]
                            ? 'votada'
                          : activity.proposalId && lockedProposalIds[activity.proposalId]
                            ? 'bloqueada'
                          : acceptErrorActivityIds[activity.id]
                            ? 'error'
                          : lockErrorActivityIds[activity.id]
                            ? 'error'
                          : 'pendiente'
                        }
                        onAccept={(id) => void handleAcceptActivity(id)}
                        onDelete={(id) => void handleDeleteActivity(id)}
                        onEdit={(id) => {
                          const activity = days.flatMap((d) => d.activities).find((a) => a.id === id)
                          if (activity) {
                            lockProposalForActivity(activity)
                            setEditingActivity(activity)
                            setShowActivityModal(true)
                          }
                        }}
                      />

                      {activity.proposalId && (
                        <div className="mt-2 rounded-2xl border border-[#D9E2F2] bg-gradient-to-b from-white to-[#F8FAFF] px-3 py-3">
                          {(() => {
                            const voteResult = voteResultByProposal[activity.proposalId!]
                            const votesFor = voteResult?.votos_a_favor ?? voteResult?.votos ?? 0
                            const votesAgainst = voteResult?.votos_en_contra ?? 0
                            const totalMembers = Math.max(uniqueMemberCount, 1)
                            const pendingVotes = voteResult?.votos_pendientes ?? Math.max(totalMembers - (votesFor + votesAgainst), 0)
                            const requiresAdminTieBreak = Boolean(voteResult?.requiere_desempate_admin)
                            const hasUserVoted =
                              Boolean(voteResult?.mi_voto) ||
                              Boolean(activity.hasVoted) ||
                              Boolean(votedActivityIds[activity.id])
                            const commentsLoaded = commentsByProposal[activity.proposalId!]?.length ?? 0
                            const isCommentsOpen = expandedCommentsProposalId === activity.proposalId

                            return (
                              <>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 font-body text-[11px] font-semibold text-green-700">
                                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                      A favor: {votesFor}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-body text-[11px] font-semibold text-rose-700">
                                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                      En contra: {votesAgainst}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-body text-[11px] font-semibold text-amber-700">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                      Pendientes: {pendingVotes}
                                    </span>
                                    {requiresAdminTieBreak && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 font-body text-[11px] font-semibold text-purple-700">
                                        Empate: requiere desempate admin
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => void handleToggleComments(activity.proposalId!)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE0FF] bg-white px-3 py-1.5 font-body text-xs font-semibold text-bluePrimary transition-colors hover:bg-[#EEF4FF]"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {isCommentsOpen ? 'Ocultar chat' : 'Abrir chat'}
                                    <span className="rounded-full bg-bluePrimary/10 px-1.5 py-0.5 text-[10px] font-bold text-bluePrimary">
                                      {commentsLoaded}
                                    </span>
                                  </button>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E8EEF8]">
                                  <div className="h-full bg-green-500" style={{ width: `${Math.min((votesFor / totalMembers) * 100, 100)}%` }} />
                                </div>
                                {activity.status === 'pendiente' && (
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => void handleAcceptActivity(activity.id)}
                                      disabled={acceptingActivityId === activity.id || hasUserVoted}
                                      className="inline-flex min-w-[132px] items-center justify-center gap-1.5 rounded-full bg-[#1E6FD9] px-4 py-2 font-body text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#145DC0] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Votar a favor
                                    </button>
                                    <button
                                      onClick={() => void handleRejectActivity(activity.id)}
                                      disabled={acceptingActivityId === activity.id || hasUserVoted}
                                      className="inline-flex min-w-[132px] items-center justify-center gap-1.5 rounded-full border border-[#F3B1B1] bg-[#FFF5F5] px-4 py-2 font-body text-xs font-semibold text-[#C03535] transition-all hover:border-[#E79292] hover:bg-[#FFEAEA] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Votar en contra
                                    </button>
                                    {hasUserVoted && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2F7] px-3 py-1.5 font-body text-[11px] font-semibold text-[#475569]">
                                        Ya emitiste tu voto
                                      </span>
                                    )}
                                    {isCurrentUserAdmin && (
                                      <>
                                        <button
                                          onClick={() => void handleAdminDecision(activity.proposalId!, 'aprobar')}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#A8E6BF] bg-[#EAFBF1] px-3 py-1.5 font-body text-xs font-semibold text-[#1E7A45]"
                                        >
                                          Decisión admin: aprobar
                                        </button>
                                        <button
                                          onClick={() => void handleAdminDecision(activity.proposalId!, 'rechazar')}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#FBC7C7] bg-[#FFF5F5] px-3 py-1.5 font-body text-xs font-semibold text-[#C03535]"
                                        >
                                          Decisión admin: rechazar
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </>
                            )
                          })()}

                          {expandedCommentsProposalId === activity.proposalId && (
                            <div className="mt-3 space-y-2">
                              {loadingCommentsProposalId === activity.proposalId ? (
                                <p className="font-body text-xs text-gray500">Cargando comentarios...</p>
                              ) : (commentsByProposal[activity.proposalId] ?? []).length === 0 ? (
                                <p className="font-body text-xs text-gray500">Sin comentarios todavía.</p>
                              ) : (
                                <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                                  {(commentsByProposal[activity.proposalId] ?? [])
                                    .slice(
                                      0,
                                      visibleCommentsCountByProposal[activity.proposalId] ?? 3
                                    )
                                    .map((comment) => (
                                    <div key={comment.id} className="rounded-lg bg-surface px-2 py-1.5">
                                      <div className="mb-1 flex items-center justify-between gap-2">
                                        <p className="font-body text-[11px] font-semibold text-gray700">
                                          {comment.authorName || `Usuario ${comment.usuarioId}`}
                                        </p>
                                        <p className="font-body text-[10px] text-gray500">
                                          {new Date(comment.createdAt).toLocaleString('es-MX', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </p>
                                      </div>

                                      {editingCommentId === comment.id ? (
                                        <div className="space-y-2">
                                          <textarea
                                            value={editingCommentText}
                                            onChange={(e) => setEditingCommentText(e.target.value)}
                                            rows={2}
                                            className="w-full resize-none rounded-md border border-[#E2E8F0] px-2 py-1 text-xs outline-none focus:border-bluePrimary"
                                          />
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => void handleSaveEditComment(activity.proposalId!, comment.id)}
                                              className="rounded-md bg-bluePrimary px-2 py-1 font-body text-[11px] font-semibold text-white"
                                            >
                                              Guardar
                                            </button>
                                            <button
                                              onClick={handleCancelEditComment}
                                              className="rounded-md border border-[#E2E8F0] px-2 py-1 font-body text-[11px] text-gray700"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <p className="font-body text-xs text-gray700">{comment.contenido}</p>
                                          {String(comment.usuarioId) === String(localUser?.id_usuario) && (
                                            <div className="mt-1.5 flex gap-2">
                                              <button
                                                onClick={() => handleStartEditComment(comment)}
                                                className="font-body text-[11px] font-semibold text-bluePrimary hover:underline"
                                              >
                                                Editar
                                              </button>
                                              <button
                                                onClick={() => void handleDeleteComment(activity.proposalId!, comment.id)}
                                                className="font-body text-[11px] font-semibold text-red-500 hover:underline"
                                              >
                                                Eliminar
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(commentsByProposal[activity.proposalId] ?? []).length >
                                (visibleCommentsCountByProposal[activity.proposalId] ?? 3) && (
                                <button
                                  onClick={() =>
                                    setVisibleCommentsCountByProposal((prev) => ({
                                      ...prev,
                                      [activity.proposalId!]:
                                        (prev[activity.proposalId!] ?? 3) + 3,
                                    }))
                                  }
                                  className="font-body text-[11px] font-semibold text-bluePrimary hover:underline"
                                >
                                  Ver más comentarios
                                </button>
                              )}

                              {(visibleCommentsCountByProposal[activity.proposalId] ?? 3) > 3 &&
                                (commentsByProposal[activity.proposalId] ?? []).length > 3 && (
                                  <button
                                    onClick={() =>
                                      setVisibleCommentsCountByProposal((prev) => ({
                                        ...prev,
                                        [activity.proposalId!]: 3,
                                      }))
                                    }
                                    className="ml-3 font-body text-[11px] font-semibold text-gray500 hover:underline"
                                  >
                                    Ver menos
                                  </button>
                                )}

                              <div className="flex gap-2">
                                <input
                                  value={commentDraftByProposal[activity.proposalId] ?? ''}
                                  onChange={(e) =>
                                    setCommentDraftByProposal((prev) => ({
                                      ...prev,
                                      [activity.proposalId!]: e.target.value,
                                    }))
                                  }
                                  placeholder="Agregar comentario..."
                                  className="flex-1 rounded-lg border border-[#E2E8F0] px-2 py-1.5 font-body text-xs outline-none focus:border-bluePrimary"
                                />
                                <button
                                  onClick={() => void handleCreateComment(activity.proposalId!)}
                                  disabled={sendingCommentProposalId === activity.proposalId}
                                  className="rounded-lg bg-bluePrimary px-2.5 py-1.5 font-body text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  {sendingCommentProposalId === activity.proposalId ? 'Enviando...' : 'Enviar'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      <ActivityProposalModal
        open={showActivityModal}
        group={group}
        token={accessToken}
        selectedDayNumber={selectedActivityDay}
        isCurrentUserAdmin={isCurrentUserAdmin}
        onClose={() => {
          unlockProposalForActivity(editingActivity)
          setEditingActivity(null)
          setShowActivityModal(false)
        }}
        onCreated={async () => {
          unlockProposalForActivity(editingActivity)
          await reloadDashboard()
        }}
        editingActivity={editingActivity}
      />

      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />
    </AppLayout>
  )
}
