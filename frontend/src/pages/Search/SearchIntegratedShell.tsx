import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { SidebarDashboard } from '../../components/layout/AppLayout/SidebarDashboard'
import { useAuth } from '../../context/useAuth'
import { groupsService, type ItineraryDay } from '../../services/groups'
import { useNetworkMonitor } from '../../hooks/useNetworkMonitor'
import { useSocket } from '../../hooks/useSocket'
import type { NavUserInfo } from '../../components/layout/Navbar'
import type { Group } from '../../types/groups'

function formatTripDates(group?: Group | null) {
  if (!group?.fecha_inicio && !group?.fecha_fin) return 'Fechas sin definir'
  return `${group?.fecha_inicio ?? '-'} - ${group?.fecha_fin ?? '-'}`
}

function buildDashboardPath(group?: Group | null) {
  return group?.id ? `/dashboard?groupId=${encodeURIComponent(String(group.id))}` : '/dashboard'
}

type DashboardTabId = 'inicio' | 'buscar' | 'comparar' | 'mapas' | 'pagar' | 'boveda'

function buildDashboardState(group?: Group | null, activeTab: DashboardTabId = 'inicio') {
  return group ? { groupId: group.id, group, activeTab } : { activeTab }
}

function IconHome() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function IconPlane() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
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

function IconHistory() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.9 2.9L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function SearchBottomNavbar({ group }: { group?: Group | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const dashboardPath = buildDashboardPath(group)
    const tabs = [
    { id: 'inicio', label: 'Inicio', icon: <IconHome />, to: dashboardPath, dashboardTab: 'inicio' as DashboardTabId },
    { id: 'buscar', label: 'Vuelos y Hoteles', icon: <IconPlane />, to: '/search/flights-hotels', dashboardTab: 'buscar' as DashboardTabId },
    { id: 'guardados', label: 'Guardados', icon: <IconHistory />, to: '/search/history', dashboardTab: 'buscar' as DashboardTabId },
    { id: 'comparar', label: 'Comparar y Reservar', icon: <IconCompare />, to: dashboardPath, dashboardTab: 'comparar' as DashboardTabId },
    { id: 'mapas', label: 'Mapas', icon: <IconMap />, to: '/search/map-places', dashboardTab: 'mapas' as DashboardTabId },
    { id: 'pagar', label: 'Finanzas', icon: <IconMoney />, to: dashboardPath, dashboardTab: 'pagar' as DashboardTabId },
    { id: 'boveda', label: 'Archivos', icon: <IconVault />, to: dashboardPath, dashboardTab: 'boveda' as DashboardTabId },
  ]

  return (
    <div className="flex h-16 shrink-0 items-center justify-around border-t-2 border-bluePrimary/20 bg-white px-4 shadow-[0_-2px_8px_rgba(30,111,217,0.06)]">
      {tabs.map((tab) => {
        const active =
          (tab.id === 'buscar' && location.pathname === '/search/flights-hotels') ||
          (tab.id === 'mapas' && location.pathname === '/search/map-places') ||
          (tab.id === 'guardados' && location.pathname === '/search/history')

        return (
          <button
            key={tab.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              if (!tab.to) return
              navigate(tab.to, { state: buildDashboardState(group, tab.dashboardTab) })
            }}
            className={`rounded-lg px-3 py-1.5 font-body text-[11px] font-semibold transition-colors ${active ? 'bg-bluePrimary/10 text-bluePrimary' : 'text-gray500 hover:text-gray700'}`}
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
  const isBrowserOnline = useNetworkMonitor()
  const { isConnected: isSocketConnected } = useSocket(accessToken)
  const [days, setDays] = useState<ItineraryDay[]>([])
  const [activeDay, setActiveDay] = useState<number | null>(null)

  const tripMeta = group
    ? {
        name: group.nombre,
        subtitle: group.destino_formatted_address ?? group.destino ?? 'Destino sin definir',
        dates: formatTripDates(group),
        people: group.maximo_miembros
          ? `${group.maximo_miembros} personas max.`
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
          console.error('No se pudo cargar el itinerario del panel lateral de busqueda:', error)
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
            state: { ...buildDashboardState(group, 'inicio'), activeDay: dayNumber },
          })
        }}
        onOpenGroupPanel={() =>
          navigate(`/grouppanel?groupId=${encodeURIComponent(String(group.id))}`)
        }
        onOpenGroupSettings={() =>
          navigate(`/group-settings?groupId=${encodeURIComponent(String(group.id))}`)
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
      isOnline={isBrowserOnline && isSocketConnected}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        <SearchBottomNavbar group={group} />
      </div>
    </AppLayout>
  )
}
