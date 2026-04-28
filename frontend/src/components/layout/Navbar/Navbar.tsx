import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../ui/Logo'
import { useAuth } from '../../../context/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NavLink {
  href: string
  label: string
}

export interface TripInfo {
  name: string
  subtitle: string
}

export interface NavUserInfo {
  name: string
  role: string
  initials: string
  color?: string
}

interface LandingNavbarProps {
  variant: 'landing'
  navLinks?: NavLink[]
}

interface DashboardNavbarProps {
  variant: 'dashboard'
  trip?: TripInfo
  user?: NavUserInfo
  notificationCount?: number
  isOnline?: boolean
  showTripSelector?: boolean
  centerTitle?: string
  onToggleSidebar?: () => void
  onTripSelect?: () => void
  onNotifications?: () => void
  onUserMenu?: () => void
}

export type NavbarProps = LandingNavbarProps | DashboardNavbarProps

// ── Shared icons ──────────────────────────────────────────────────────────────

function IconChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── Landing variant ───────────────────────────────────────────────────────────

const DEFAULT_LANDING_LINKS: NavLink[] = [
  { href: '#features', label: 'Explorar' },
  { href: '#how',      label: 'Cómo funciona' },
]

function LandingDesktopRight() {
  return (
    <div className="ml-auto flex items-center gap-3">
      <a
        href="#"
        className="hidden md:block font-body text-sm text-gray500 hover:text-purpleNavbar transition-colors"
      >
        Mis viajes
      </a>
      <a
        href="/login"
        className="font-body text-sm border border-[#E2E8F0] text-gray700 rounded-lg px-4 py-1.5 hover:border-bluePrimary hover:text-bluePrimary transition-colors"
      >
        Iniciar sesión
      </a>
      <a
        href="/register"
        className="font-body text-sm font-medium bg-bluePrimary text-white rounded-full px-4 py-1.5 hover:opacity-90 transition-opacity"
      >
        Crear cuenta
      </a>
    </div>
  )
}

function LandingMobileMenu({ navLinks }: { navLinks: NavLink[] }) {
  return (
    <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-[#E2E8F0] shadow-lg px-6 py-4 flex flex-col gap-3 z-40">
      {navLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="font-body text-sm text-gray500 hover:text-purpleNavbar py-1 transition-colors"
        >
          {link.label}
        </a>
      ))}
      <div className="border-t border-[#E2E8F0] pt-3 flex flex-col gap-2">
        <a
          href="/login"
          className="font-body text-sm text-center border border-[#E2E8F0] text-gray700 rounded-lg px-4 py-2 hover:border-bluePrimary hover:text-bluePrimary transition-colors"
        >
          Iniciar sesión
        </a>
        <a
          href="/register"
          className="font-body text-sm font-medium text-center bg-bluePrimary text-white rounded-full px-4 py-2 hover:opacity-90 transition-opacity"
        >
          Crear cuenta
        </a>
      </div>
    </div>
  )
}

function LandingNavContent({
  navLinks,
  mobileOpen,
}: {
  navLinks: NavLink[]
  mobileOpen: boolean
}) {
  return (
    <>
      <div className="hidden md:flex items-center gap-6 ml-8">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="font-body text-sm text-gray500 hover:text-purpleNavbar transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>
      <LandingDesktopRight />
      {mobileOpen && <LandingMobileMenu navLinks={navLinks} />}
    </>
  )
}

// ── Dashboard variant ─────────────────────────────────────────────────────────

const DEFAULT_TRIP: TripInfo    = { name: 'Cancún 2025', subtitle: 'Riviera Maya, México' }
const DEFAULT_USER: NavUserInfo = {
  name: 'Cargando...',
  role: '',
  initials: '--',
  color: '#1E6FD9',
}

function DashboardMobileMenu({ trip, user }: { trip: TripInfo; user: NavUserInfo }) {
  const { localUser } = useAuth()
  const avatarUrl = localUser?.avatar_url
  return (
    <div className="md:hidden absolute top-full left-0 right-0 bg-purpleNavbar border-b border-white/10 shadow-lg px-6 py-4 flex flex-col gap-4 z-40">
      {/* Trip info */}
      <div className="flex flex-col gap-1 py-2 border-b border-white/10">
        <p className="font-body text-[10px] font-semibold text-white/40 uppercase tracking-widest">
          Viaje activo
        </p>
        <p className="font-body text-sm font-bold text-white">{trip.name}</p>
        <p className="font-body text-xs text-white/60">{trip.subtitle}</p>
      </div>
      {/* User info */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-body font-bold text-sm shrink-0 overflow-hidden"
          style={{ backgroundColor: user.color ?? '#1E6FD9' }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            user.initials
          )}
        </div>
        <div>
          <p className="font-body text-sm font-bold text-white">{user.name}</p>
          <p className="font-body text-xs text-white/50">{user.role}</p>
        </div>
      </div>
    </div>
  )
}

interface DashboardContentProps {
  trip: TripInfo
  user: NavUserInfo
  notificationCount: number
  isOnline: boolean
  mobileOpen: boolean
  showTripSelector: boolean
  centerTitle: string
  onTripSelect?: () => void
  onUserMenu?: () => void
}

const SAMPLE_NOTIFICATIONS = [
  { id: 1, text: 'Kevin aceptó una propuesta',               time: 'hace 5 min',  unread: true  },
  { id: 2, text: 'Nueva actividad agregada al Día 2',        time: 'hace 18 min', unread: true  },
  { id: 3, text: 'El grupo votó por Hotel Malecón',          time: 'hace 1 h',    unread: true  },
]

function DashboardNavContent({
  trip,
  user,
  notificationCount,
  isOnline,
  mobileOpen,
  showTripSelector,
  centerTitle,
  onTripSelect,
}: DashboardContentProps) {
  const navigate = useNavigate()
  const { logout, localUser } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [notifOpen,   setNotifOpen]   = useState(false)
  const [unreadCount, setUnreadCount] = useState(notificationCount)
  const notifRef = useRef<HTMLDivElement>(null)
  const avatarUrl = localUser?.avatar_url

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  useEffect(() => {
    if (!notifOpen) return
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [notifOpen])

  function handleToggleNotif() {
    setNotifOpen((o) => !o)
    setUnreadCount(0)
  }

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Center — trip selector or plain title */}
      {showTripSelector ? (
        <button
          onClick={onTripSelect}
          className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 hover:bg-white/20 transition-colors"
          aria-label="Seleccionar viaje"
        >
          <span className="text-white/60 shrink-0">
            <IconGlobe />
          </span>
          <div className="flex flex-col items-start">
            <span className="font-body text-sm font-bold text-white leading-tight">{trip.name}</span>
            <span className="font-body text-[11px] text-white/60 leading-tight">{trip.subtitle}</span>
          </div>
          <span className="text-white/60 ml-0.5 shrink-0">
            <IconChevronDown />
          </span>
        </button>
      ) : centerTitle ? (
        <span className="hidden md:block absolute left-1/2 -translate-x-1/2 font-heading font-bold text-white text-base pointer-events-none select-none">
          {centerTitle}
        </span>
      ) : null}

      {/* Right section */}
      <div className="ml-auto flex items-center gap-1">
        {/* Notifications bell */}
        <div ref={notifRef} className="relative hidden md:flex">
          <button
            onClick={handleToggleNotif}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={`Notificaciones${unreadCount > 0 ? ` — ${unreadCount} sin leer` : ''}`}
            aria-expanded={notifOpen}
          >
            <IconBell />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-redError text-white rounded-full text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                <span className="font-heading font-bold text-[#1E0A4E] text-sm">Notificaciones</span>
                <span className="font-body text-[11px] text-[#1E6FD9] bg-[#1E6FD9]/10 px-2 py-0.5 rounded-full">3 nuevas</span>
              </div>
              {SAMPLE_NOTIFICATIONS.map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors border-b border-[#E2E8F0] last:border-none cursor-default">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.unread ? 'bg-[#1E6FD9]' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-[#1E0A4E] leading-snug">{n.text}</p>
                    <p className="font-body text-[11px] text-[#1E0A4E]/40 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <span className="hidden md:block w-px h-5 bg-white/10 mx-1" />

        {/* Online chip */}
        {isOnline && (
          <div className="hidden md:flex items-center gap-1.5 bg-greenAccent/20 border border-greenAccent/30 rounded-full px-3 py-1">
            <span className="relative flex w-2 h-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-greenAccent opacity-75" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-greenAccent" />
            </span>
            <span className="font-body text-xs font-medium text-greenAccent">En línea</span>
          </div>
        )}

        {/* Divider */}
        <span className="hidden md:block w-px h-5 bg-white/10 mx-1" />

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors"
            aria-label="Menú de usuario"
            aria-expanded={menuOpen}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-body font-bold text-xs shrink-0 overflow-hidden"
              style={{ backgroundColor: user.color ?? '#1E6FD9' }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                user.initials
              )}
            </div>
            
            <div className="hidden md:flex flex-col items-start">
              <span className="font-body text-[13px] font-bold text-white leading-tight">{user.name}</span>
              <span className="font-body text-[11px] text-white/50 leading-tight">{user.role}</span>
            </div>
            <span className={`hidden md:block text-white/50 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}>
              <IconChevronDown />
            </span>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50">
              <button
                onClick={() => { setMenuOpen(false); navigate('/profile') }}
                className="w-full flex items-center gap-3 px-4 py-3 font-body text-sm text-[#1E0A4E] hover:bg-[#F8FAFC] transition-colors"
              >
                <span className="text-[#1E0A4E]/60"><IconUser /></span>
                Mi perfil
              </button>
              <div className="h-px bg-[#E2E8F0] mx-3" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 font-body text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
              >
                <span className="text-[#EF4444]/70"><IconLogout /></span>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && <DashboardMobileMenu trip={trip} user={user} />}
    </>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export function Navbar(props: NavbarProps) {
  const [scrolled,   setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isDashboard = props.variant === 'dashboard'

  const navBase = 'fixed top-0 left-0 right-0 z-50 h-20 px-6 flex items-center transition-shadow duration-300'
  const navTheme = isDashboard
    ? 'bg-purpleNavbar border-b border-white/10'
    : 'bg-white border-b border-[#E2E8F0]'
  const navShadow = scrolled
    ? isDashboard ? 'shadow-[0_2px_12px_rgba(0,0,0,0.4)]' : 'shadow-sm'
    : ''

  const hamburgerTheme = isDashboard
    ? 'text-white/70 hover:text-white hover:bg-white/10'
    : 'text-gray700 hover:bg-neutralBg'

  return (
    <nav className={[navBase, navTheme, navShadow].join(' ')}>
      {/* Logo */}
      <a href={isDashboard ? '/my-trips' : '/'} className="shrink-0" aria-label="Ithera">
        <Logo variant={isDashboard ? 'white' : 'color'} height={64} />
      </a>

      {/* Sidebar toggle — dashboard only, always visible */}
      {isDashboard && (
        <button
          onClick={(props as DashboardNavbarProps).onToggleSidebar}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors ml-2 shrink-0"
          aria-label="Alternar sidebar"
        >
          <IconMenu />
        </button>
      )}

      {/* Variant content */}
      {isDashboard ? (
        <DashboardNavContent
          trip={props.trip ?? DEFAULT_TRIP}
          user={props.user ?? DEFAULT_USER}
          notificationCount={props.notificationCount ?? 0}
          isOnline={props.isOnline ?? true}
          mobileOpen={mobileOpen}
          showTripSelector={props.showTripSelector ?? true}
          centerTitle={props.centerTitle ?? ''}
          onTripSelect={props.onTripSelect}
        />
      ) : (
        <LandingNavContent
          navLinks={props.navLinks ?? DEFAULT_LANDING_LINKS}
          mobileOpen={mobileOpen}
        />
      )}

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen((o) => !o)}
        className={`md:hidden ml-auto p-2 rounded-lg transition-colors ${hamburgerTheme}`}
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <IconClose /> : <IconMenu />}
      </button>
    </nav>
  )
}
