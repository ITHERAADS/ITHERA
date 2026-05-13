import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { SidebarDashboard } from '../../components/layout/AppLayout/SidebarDashboard'
import { useAuth } from '../../context/useAuth'
import { groupsService, type ItineraryDay } from '../../services/groups'
import type { NavUserInfo } from '../../components/layout/Navbar'
import type { Group } from '../../types/groups'

function formatTripDates(group?: Group | null) {
  if (!group?.fecha_inicio && !group?.fecha_fin) return 'Fechas sin definir'
  return `${group?.fecha_inicio ?? '—'} – ${group?.fecha_fin ?? '—'}`
}

function buildDashboardPath(group?: Group | null) {
  return group?.id ? `/dashboard?groupId=${encodeURIComponent(String(group.id))}` : '/dashboard'
}

function buildSearchState(group?: Group | null) {
  return group ? { groupId: group.id, group, activeTab: 'buscar' } : { activeTab: 'buscar' }
}

function IconHome() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function IconSearch() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}

function IconCompare() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}

function IconMap() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 2v16M16 6v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}

function IconMoney() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}

function IconVault() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 8a2 2 0 00-2-2h-3l-2-2h-4L8 6H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
}

function SearchBottomNavbar({ group }: { group?: Group | null }) {
  const navigate = useNavigate()
  const dashboardPath = buildDashboardPath(group)
  const dashboardState = buildSearchState(group)
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: <IconHome />, to: dashboardPath },
    { id: 'buscar', label: 'Buscar', icon: <IconSearch />, to: null },
    { id: 'comparar', label: 'Comparar', icon: <IconCompare />, to: dashboardPath },
    { id: 'mapas', label: 'Mapas', icon: <IconMap />, to: '/search/map-places' },
    { id: 'pagar', label: 'Finanzas', icon: <IconMoney />, to: dashboardPath },
    { id: 'boveda', label: 'Bóveda', icon: <IconVault />, to: dashboardPath },
  ]

  return (
    <div className="flex h-14 shrink-0 items-center justify-around border-t border-[#E2E8F0] bg-white px-4">
      {tabs.map((tab) => {
        const active = tab.id === 'buscar'
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (!tab.to) return
              navigate(tab.to, { state: dashboardState })
            }}
            className={`rounded-lg px-3 py-1 font-body text-[10px] font-medium transition-colors ${active ? 'text-bluePrimary' : 'text-gray500 hover:text-gray700'}`}
          >
            <span className="flex flex-col items-center gap-0.5">{tab.icon}{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function SearchIntegratedShell({ children, group, user }: { children: ReactNode; group?: Group | null; user: NavUserInfo }) {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [days, setDays] = useState<ItineraryDay[]>([])
  const [activeDay, setActiveDay] = useState<number | null>(null)

  const tripMeta = group
    ? {
        name: group.nombre,
        subtitle: group.destino_formatted_address ?? group.destino ?? 'Destino sin definir',
        dates: formatTripDates(group),
        people: group.maximo_miembros
          ? `${group.maximo_miembros} personas máx.`
          : group.memberCount
            ? `${group.memberCount} participante${group.memberCount === 1 ? '' : 's'}`
            : 'Miembros por definir',
      }
    : undefined

  useEffect(() => {
    let cancelled = false

    async function loadSidebarItinerary() {
      if (!group?.id || !accessToken) {
        setDays([])
        setActiveDay(null)
        return
      }

      try {
        const response = await groupsService.getItinerary(String(group.id), accessToken)
        if (cancelled) return

        const nextDays = Array.isArray(response.days) ? response.days : []
        setDays(nextDays)
        setActiveDay((currentDay) => {
          if (currentDay && nextDays.some((day) => day.dayNumber === currentDay)) return currentDay
          return nextDays[0]?.dayNumber ?? null
        })
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudo cargar el itinerario del panel lateral de búsqueda:', error)
          setDays([])
          setActiveDay(null)
        }
      }
    }

    loadSidebarItinerary()

    return () => {
      cancelled = true
    }
  }, [accessToken, group?.id])

  const sidebarContent = useMemo(() => {
    if (!group) return undefined

    return (
      <SidebarDashboard
        activeDay={activeDay}
        days={days}
        group={group}
        onDayChange={(dayNumber) => {
          setActiveDay(dayNumber)
          navigate(buildDashboardPath(group), {
            state: { ...buildSearchState(group), activeTab: 'inicio', activeDay: dayNumber },
          })
        }}
        onOpenGroupPanel={() =>
          navigate(`/grouppanel?groupId=${encodeURIComponent(String(group.id))}`)
        }
      />
    )
  }, [activeDay, days, group, navigate])

  return (
    <AppLayout
      showTripSelector={Boolean(group)}
      showRightPanel={false}
      trip={tripMeta}
      user={user}
      sidebarContent={sidebarContent}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        <SearchBottomNavbar group={group} />
      </div>
    </AppLayout>
  )
}
