import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCurrentGroup, groupsService } from '../../services/groups'
import type { ItineraryDay } from '../../services/groups'
import { useAuth } from '../../context/useAuth'
import { AppLayout, RightPanelDashboard, SidebarDashboard } from '../../components/layout/AppLayout'
import { DayView } from '../../components/ui/DayView'
import type { Activity as DayActivity, DayViewHandle } from '../../components/ui/DayView'
import { ProposalCard } from '../../components/ProposalCard/ProposalCard'
import { ComparisonPage } from '../Comparison/ComparisonPage'
import { useLocation } from 'react-router-dom'
import { ActivityProposalModal } from '../../components/ActivityProposalModal/ActivityProposalModal'
import { useSocket } from '../../hooks/useSocket'


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
}: {
  activeDay: number | null
  totalDays: number
  selectedDay?: ItineraryDay
  group: ReturnType<typeof getCurrentGroup> | null
  onAdd: () => void
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
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/50 px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-white/10">
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

function InfoBanner() {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-bluePrimary/20 bg-[#EEF4FF] px-4 py-3">
      <span className="mt-0.5 shrink-0 text-bluePrimary">
        <IconInfo size={16} />
      </span>
      <div>
        <p className="font-body text-sm font-semibold leading-tight text-gray700">Acepta propuestas para confirmarlas</p>
        <p className="mt-0.5 font-body text-xs leading-relaxed text-gray500">
          Las actividades con votos necesitan tu aprobación para ser incluidas en el itinerario final del grupo.
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
  const selectedDay = activeDay !== null ? days.find((day) => day.dayNumber === activeDay) : undefined

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

      if (isMounted) {
        setGroup(groupRes.group)
        setMembers(membersRes.members)
        setDays(itineraryRes.days)
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
    setDays(itineraryRes.days)
  }, [groupIdFromState, groupId, currentGroup?.id, accessToken])

  const handleDeleteActivity = useCallback(async (activityId: string) => {
    const resolvedGroupId = groupIdFromState || groupId || currentGroup?.id

    if (!resolvedGroupId || !accessToken) return

    await groupsService.deleteActivity(String(resolvedGroupId), activityId, accessToken)
    await reloadDashboard()
  }, [groupIdFromState, groupId, currentGroup?.id, accessToken, reloadDashboard])

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
      ) : (
        <div className="flex-1 overflow-y-auto bg-surface px-6 py-6">
          <HeroCard
            activeDay={activeDay}
            totalDays={days.length}
            selectedDay={selectedDay}
            group={group}
            onAdd={() => openActivityModalForDay(activeDay ?? days[0]?.dayNumber ?? 1)}
          />
          <InfoBanner />
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
              isActive={day.dayNumber === activeDay}
              isExpanded={day.dayNumber === expandedDay}
              onSelect={handleDayChange}
              onAddActivity={openActivityModalForDay}
              onAccept={(id) => console.log('aceptar', id)}
              onDelete={(id) => void handleDeleteActivity(id)}
            />
            ))}
          </div>

          {/* ── Propuestas pendientes ── */}
          {(() => {
            const pending = days.flatMap((d) => d.activities).filter((a) => a.status === 'pendiente')
            if (pending.length === 0) return null
            return (
              <div className="mt-6">
                <h2 className="font-heading font-bold text-[#1E0A4E] text-base mb-3">
                  Propuestas pendientes
                </h2>
                <div className="flex flex-col gap-3">
                  {pending.map((activity) => (
                    <ProposalCard
                      key={activity.id}
                      activity={activity}
                      proposalStatus="pendiente"
                      onAccept={(id) => console.log('aceptar', id)}
                      onDelete={(id) => void handleDeleteActivity(id)}
                      onEdit={(id) => {
                        const activity = days.flatMap((d) => d.activities).find((a) => a.id === id)
                        if (activity) {
                          setEditingActivity(activity)
                          setShowActivityModal(true)
                        }
                      }}
                    />
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
        onClose={() => {
          setEditingActivity(null)
          setShowActivityModal(false)
        }}
        onCreated={reloadDashboard}
        editingActivity={editingActivity}
      />

      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />
    </AppLayout>
  )
}
