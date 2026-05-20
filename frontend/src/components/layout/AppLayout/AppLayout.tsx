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

function IconHome() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10.5V20h13v-9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 20v-5h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCompass() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a1.8 1.8 0 00.36 1.98l.04.04a2.1 2.1 0 01-2.97 2.97l-.04-.04a1.8 1.8 0 00-1.98-.36 1.8 1.8 0 00-1.1 1.66V21a2.1 2.1 0 01-4.2 0v-.06a1.8 1.8 0 00-1.18-1.65 1.8 1.8 0 00-1.98.36l-.04.04a2.1 2.1 0 01-2.97-2.97l.04-.04A1.8 1.8 0 003.6 15a1.8 1.8 0 00-1.66-1.1H2a2.1 2.1 0 010-4.2h.06A1.8 1.8 0 003.7 8.52a1.8 1.8 0 00-.36-1.98l-.04-.04a2.1 2.1 0 012.97-2.97l.04.04a1.8 1.8 0 001.98.36H8.4A1.8 1.8 0 009.5 2.26V2a2.1 2.1 0 014.2 0v.06a1.8 1.8 0 001.1 1.66 1.8 1.8 0 001.98-.36l.04-.04a2.1 2.1 0 012.97 2.97l-.04.04a1.8 1.8 0 00-.36 1.98v.1a1.8 1.8 0 001.66 1.1H22a2.1 2.1 0 010 4.2h-.06A1.8 1.8 0 0019.4 15z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSuitcaseSmall() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="7" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const GENERAL_NAV = [
  { to: '/my-trips', label: 'Inicio', icon: <IconHome /> },
  { to: '/create-group', label: 'Grupos', icon: <IconCompass /> },
  { to: '/profile', label: 'Configuración', icon: <IconSettings /> },
]

function GeneralNav({ currentPath, onNavigate }: { currentPath: string; onNavigate: (to: string) => void }) {
  return (
    <nav className="flex h-full flex-col space-y-5">
      <div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#35C56A]/15 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-widest text-[#9AF0B8]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#35C56A]" />
          Navegación
        </p>
        <ul className="flex flex-col gap-1">
          {GENERAL_NAV.map((item) => {
            const isActive = currentPath === item.to
            return (
              <li key={`${item.to}-${item.label}`}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.to)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-body text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-[#1E0A4E] shadow-[0_12px_26px_rgba(0,0,0,0.16)]'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-[#EAF2FF] text-[#1E6FD9]' : 'bg-white/10 text-[#BFD7FF]'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-t border-white/10 pt-5">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#1E6FD9]/20 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-widest text-[#BFD7FF]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2C8BE6]" />
          Viajes
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/my-trips')}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-body text-sm font-semibold text-white/75 transition-colors duration-150 hover:bg-white/10 hover:text-white"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#9AF0B8]">
            <IconSuitcaseSmall />
          </span>
          Mis viajes
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/my-trips#viajes-pasados')}
          className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-body text-sm font-semibold text-white/75 transition-colors duration-150 hover:bg-white/10 hover:text-white"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FFD166]">
            <IconCalendar />
          </span>
          Viajes pasados
        </button>
      </div>

      <div className="mt-auto overflow-hidden rounded-3xl border border-white/15 bg-[linear-gradient(135deg,rgba(122,79,214,0.36),rgba(30,10,78,0.50)_48%,rgba(30,111,217,0.18))] p-4 shadow-[0_14px_32px_rgba(0,0,0,0.16)]">
        <p className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[#D8C8FF]">
          Próxima ruta
        </p>
        <p className="mt-2 font-heading text-base font-extrabold leading-tight text-white">
          Organiza, invita y despega.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#9B7CFF,#2C8BE6)]" />
        </div>
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
            'shrink-0 overflow-hidden bg-[linear-gradient(180deg,#24105E_0%,#1E0A4E_42%,#34106F_100%)] transition-all duration-300 ease-in-out',
            sidebarOpen ? 'w-[256px]' : 'w-0',
          ].join(' ')}
        >
          <div className="flex h-full w-[256px] min-w-0 flex-col overflow-x-hidden overflow-y-auto px-4 pb-4 pt-6">
            {trip ? (
              <>
                <div className="mb-4 rounded-2xl border border-white/15 bg-white/[0.07] shadow-[0_14px_32px_rgba(0,0,0,0.18)]">
                  <div className="relative overflow-hidden rounded-2xl px-3.5 pb-3.5 pt-3.5">
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#1E6FD9]/25 blur-2xl" />
                    <div className="absolute -bottom-10 left-4 h-20 w-20 rounded-full bg-[#35C56A]/20 blur-2xl" />
                    <div className="relative">
                      <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 font-body text-[9px] font-bold uppercase tracking-[0.16em] text-[#9AF0B8]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#35C56A]" />
                        Viaje activo
                      </p>
                      <h2 className="max-w-full break-words font-heading text-[16px] font-extrabold leading-tight text-white" title={trip.name}>
                        {trip.name}
                      </h2>
                      <p className="mt-1 line-clamp-2 max-w-full break-words font-body text-[12px] leading-snug text-white/60" title={trip.subtitle}>
                        {trip.subtitle}
                      </p>

                      <div className="mt-3 grid gap-2">
                        <div className="flex max-w-full items-start gap-2 rounded-xl border border-[#BFD7FF]/20 bg-[#1E6FD9]/20 px-2.5 py-2">
                          <span className="mt-0.5 shrink-0 text-[#BFD7FF]"><IconCalendar /></span>
                          <span className="min-w-0 break-words font-body text-[10.5px] font-semibold leading-snug text-[#D9E8FF]">{trip.dates}</span>
                        </div>
                        <div className="flex max-w-full items-center gap-2 rounded-xl border border-[#BFF4CE]/20 bg-[#35C56A]/15 px-2.5 py-2">
                          <span className="mt-0.5 shrink-0 text-[#9AF0B8]"><IconUsers /></span>
                          <span className="min-w-0 break-words font-body text-[10.5px] font-semibold leading-snug text-[#D7FBE2]">{trip.people}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <GeneralNav currentPath={location.pathname} onNavigate={navigate} />
            )}

            {sidebarContent && (
              <div className="min-h-0 shrink-0">
                {sidebarContent}
              </div>
            )}

            {trip && (
              <div className="mt-4 shrink-0 border-t border-white/10 pt-4">
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#35C56A]/15 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-widest text-[#9AF0B8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#35C56A]" />
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
          <aside className="hidden w-[280px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-[#E2E8F0] bg-[#FAF9FD] px-5 py-4 xl:flex">
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  )
}
