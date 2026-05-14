import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Navbar } from '../Navbar'
import type { NavUserInfo, TripInfo } from '../Navbar'

export interface TripMeta {
  name: string
  subtitle: string
  dates: string
  people: string
}

export interface AppLayoutProps {
  children: React.ReactNode
  sidebarContent?: React.ReactNode
  rightPanel?: React.ReactNode
  showRightPanel?: boolean
  showTripSelector?: boolean
  centerTitle?: string
  trip?: TripMeta
  user?: NavUserInfo
  isOnline?: boolean
}

function IconCalendar() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const GENERAL_NAV = [
  { to: '/my-trips', label: 'Inicio' },
  { to: '/create-group', label: 'Grupos' },
  { to: '/profile', label: 'Configuración' },
]

function GeneralNav({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <nav className="space-y-4">
      <div>
        <p className="mb-3 font-body text-[10px] uppercase tracking-widest text-white/40">Navegación</p>
        <ul className="flex flex-col gap-1">
          {GENERAL_NAV.map((item) => (
            <li key={`${item.to}-${item.label}`}>
              <button
                type="button"
                onClick={() => onNavigate(item.to)}
                className="flex w-full items-center rounded-xl px-3 py-2.5 text-left font-body text-sm text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="mb-3 font-body text-[10px] uppercase tracking-widest text-white/40">Viajes</p>
        <button
          type="button"
          onClick={() => onNavigate('/my-trips')}
          className="flex w-full items-center rounded-xl px-3 py-2.5 text-left font-body text-sm text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
        >
          Mis viajes
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/my-trips#viajes-pasados')}
          className="mt-2 flex w-full items-center rounded-xl px-3 py-2.5 text-left font-body text-sm text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
        >
          Viajes pasados
        </button>
      </div>
    </nav>
  )
}

export function AppLayout({
  children,
  sidebarContent,
  rightPanel,
  showRightPanel = true,
  showTripSelector = true,
  centerTitle,
  trip,
  user,
  isOnline = true,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  const navigate = useNavigate()
  const location = useLocation()

  const goToCurrentTrips = () => {
    if (location.pathname === '/my-trips' && location.hash) {
      navigate('/my-trips')
      return
    }
    navigate('/my-trips')
  }

  const tripInfo: TripInfo | undefined = trip
    ? { name: trip.name, subtitle: trip.subtitle }
    : undefined

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface font-body">
      <Navbar
        variant="dashboard"
        trip={tripInfo}
        user={user}
        isOnline={isOnline}
        showTripSelector={showTripSelector}
        centerTitle={centerTitle}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex min-w-0 flex-1 overflow-hidden pt-20">
        <aside
          className={[
            'shrink-0 overflow-hidden bg-purpleNavbar transition-all duration-300 ease-in-out',
            sidebarOpen ? 'w-[240px]' : 'w-0',
          ].join(' ')}
        >
          <div className="flex h-full w-[240px] min-w-0 flex-col overflow-x-hidden overflow-y-auto px-4 pb-4 pt-6">
            {trip ? (
              <>
                <div className="mb-4 min-w-0">
                  <h2 className="max-w-full break-words font-heading text-base font-bold leading-tight text-white" title={trip.name}>
                    {trip.name}
                  </h2>
                  <p className="mt-0.5 max-w-full break-words font-body text-xs leading-tight text-white/50" title={trip.subtitle}>
                    {trip.subtitle}
                  </p>
                </div>

                <div className="mb-5 flex max-w-full flex-wrap gap-2">
                  <div className="flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                    <span className="text-white/70"><IconCalendar /></span>
                    <span className="min-w-0 break-words font-body text-[11px] leading-tight text-white/70">{trip.dates}</span>
                  </div>
                  <div className="flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                    <span className="text-white/70"><IconUsers /></span>
                    <span className="min-w-0 break-words font-body text-[11px] leading-tight text-white/70">{trip.people}</span>
                  </div>
                </div>

                <div className="mb-4 border-t border-white/10" />
              </>
            ) : (
              <GeneralNav onNavigate={navigate} />
            )}

            {sidebarContent}

            {trip && (
              <div className="mt-auto border-t border-white/10 pt-4">
                <p className="mb-2 px-3 font-body text-[10px] uppercase tracking-widest text-white/40">
                  Viajes
                </p>
                <button
                  onClick={goToCurrentTrips}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 font-body text-sm text-white/60 transition-colors duration-150 hover:bg-white/10 hover:text-white"
                >
                  <span>Mis viajes</span>
                  <span className="text-white/40">›</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F0EEF8]">
          {children}
        </main>

        {showRightPanel && rightPanel && (
          <aside className="hidden w-[280px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-[#E2E8F0] bg-[#FAF9FD] px-5 py-5 xl:flex">
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  )
}
