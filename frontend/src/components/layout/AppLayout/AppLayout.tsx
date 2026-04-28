import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../Navbar'
import type { NavUserInfo, TripInfo } from '../Navbar'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  notificationCount?: number
  isOnline?: boolean
}

// ── Sidebar icons ─────────────────────────────────────────────────────────────

function IconCalendar() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── General navigation (when no active trip) ──────────────────────────────────

const GENERAL_NAV = [
  { href: '/dashboard', label: 'Inicio'       },
  { href: '/my-trips',  label: 'Mis viajes'   },
  { href: '/groups',    label: 'Grupos'       },
  { href: '/settings',  label: 'Configuración'},
]

function GeneralNav() {
  return (
    <nav>
      <p className="font-body text-[10px] text-white/40 uppercase tracking-widest mb-3">
        Navegación
      </p>
      <ul className="flex flex-col gap-1">
        {GENERAL_NAV.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="flex items-center px-3 py-2.5 rounded-xl font-body text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ── AppLayout ─────────────────────────────────────────────────────────────────

export function AppLayout({
  children,
  sidebarContent,
  rightPanel,
  showRightPanel = true,
  showTripSelector = true,
  centerTitle,
  trip,
  user,
  notificationCount = 0,
  isOnline = true,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  const navigate = useNavigate()

  const tripInfo: TripInfo | undefined = trip
    ? { name: trip.name, subtitle: trip.subtitle }
    : undefined

  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden font-body">
      {/* Fixed top navbar */}
      <Navbar
        variant="dashboard"
        trip={tripInfo}
        user={user}
        notificationCount={notificationCount}
        isOnline={isOnline}
        showTripSelector={showTripSelector}
        centerTitle={centerTitle}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      {/* Main layout — three columns, below navbar */}
      <div className="flex flex-1 overflow-hidden pt-20">

        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={[
            'shrink-0 bg-purpleNavbar overflow-hidden transition-all duration-300 ease-in-out',
            sidebarOpen ? 'w-[240px]' : 'w-0',
          ].join(' ')}
        >
          <div className="w-[240px] flex flex-col h-full px-4 pt-6 pb-4 overflow-y-auto">

            {/* Fixed: trip header */}
            {trip ? (
              <>
                <div className="mb-4">
                  <h2 className="font-heading font-bold text-white text-base leading-tight">
                    {trip.name}
                  </h2>
                  <p className="font-body text-xs text-white/50 mt-0.5">{trip.subtitle}</p>
                </div>

                {/* Metadata pills */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                    <span className="text-white/70"><IconCalendar /></span>
                    <span className="font-body text-[11px] text-white/70">{trip.dates}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                    <span className="text-white/70"><IconUsers /></span>
                    <span className="font-body text-[11px] text-white/70">{trip.people}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10 mb-4" />
              </>
            ) : (
              <GeneralNav />
            )}

            {/* Variable: page-specific sidebar content */}
            {sidebarContent}

            {/* Back to Mis Viajes — only when inside a trip */}
            {trip && (
              <div className="mt-auto pt-4 border-t border-white/10">
                <button
                  onClick={() => navigate('/my-trips')}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl font-body text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Mis viajes
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Central content ───────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#F0EEF8]">
          {children}
        </main>

        {/* ── Right panel ───────────────────────────────────────────────────── */}
        {showRightPanel && rightPanel && (
          <aside className="hidden xl:flex flex-col w-[280px] shrink-0 bg-[#FAF9FD] border-l border-[#E2E8F0] px-5 py-5 overflow-hidden gap-4">
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  )
}
