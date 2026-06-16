import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../ui/Logo'
import { useAuth } from '../../../context/useAuth'
import { useNotifications } from '../../../hooks/useNotifications'
import { groupsService, saveCurrentGroup } from '../../../services/groups'
import type { Group, GroupHistoryItem } from '../../../types/groups'
import type { NotificationItem } from '../../../services/notifications'

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
  isOnline?: boolean
  showTripSelector?: boolean
  centerTitle?: string
  onToggleSidebar?: () => void
  onTripSelect?: () => void
  onNotifications?: () => void
  onUserMenu?: () => void
  onOpenChat?: () => void
  chatUnreadCount?: number
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

function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

function LandingDesktopRight({ isScrolled }: { isScrolled: boolean }) {
  const { localUser, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropdownOpen])

  const subtleText = isScrolled ? 'text-gray500 hover:text-purpleNavbar' : 'text-white/70 hover:text-white'
  const loginClass = isScrolled
    ? 'border-[#E2E8F0] bg-white text-gray700 hover:border-bluePrimary hover:text-bluePrimary'
    : 'border-white/20 bg-white/10 text-white hover:bg-white/20'

  if (localUser) {
    const initials = (localUser.nombre || 'U')
      .split(' ')
      .map((w: string) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

    return (
      <div className="ml-auto flex items-center gap-3">
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 transition-colors ${isScrolled ? 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]' : 'border-white/15 bg-white/10 hover:bg-white/15'}`}
          >
            {localUser.avatar_url ? (
              <img src={localUser.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#1E6FD9] to-[#7A4FD6] font-body text-xs font-bold text-white">
                {initials}
              </span>
            )}
            <div className="flex flex-col items-start">
              <span className={`font-body text-xs font-semibold leading-none ${isScrolled ? 'text-[#1E0A4E]' : 'text-white'}`}>
                {(localUser.nombre || 'Usuario').split(' ')[0]}
              </span>
              <span className="mt-0.5 flex items-center gap-1 font-body text-[10px] font-medium text-[#35C56A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#35C56A]" />
                En línea
              </span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`ml-1 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''} ${isScrolled ? 'text-gray-400' : 'text-white/50'}`} aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
              <div className="border-b border-[#F1F5F9] px-4 py-3">
                <p className="font-body text-sm font-semibold text-[#1E0A4E]">{localUser.nombre || 'Usuario'}</p>
                <p className="truncate font-body text-xs text-[#64748B]">{localUser.email}</p>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); navigate('/my-trips') }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-body text-sm font-semibold text-[#1E0A4E] transition-colors hover:bg-[#F0EEF8]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#1E6FD9]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  Ir a la plataforma
                </button>
                <button
                  type="button"
                  onClick={async () => { setDropdownOpen(false); await logout(); navigate('/') }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-body text-sm font-semibold text-[#EF4444] transition-colors hover:bg-[#FFF5F5]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF5F5] text-[#EF4444]">
                    <IconLogout />
                  </span>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ml-auto flex items-center gap-3">
      <a
        href="/login"
        className={`hidden font-body text-sm font-semibold transition-colors md:block ${subtleText}`}
      >
        Mis viajes
      </a>
      <a
        href="/login"
        className={`rounded-xl border px-4 py-2 font-body text-sm font-semibold shadow-sm backdrop-blur transition-colors ${loginClass}`}
      >
        Iniciar sesión
      </a>
      <a
        href="/register"
        className="rounded-xl bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] px-4 py-2 font-body text-sm font-bold text-white shadow-[0_10px_24px_rgba(30,111,217,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(30,111,217,0.34)]"
      >
        Crear cuenta
      </a>
    </div>
  )
}

function LandingMobileMenu({ navLinks, isScrolled }: { navLinks: NavLink[]; isScrolled: boolean }) {
  const { localUser, logout } = useAuth()
  const navigate = useNavigate()
  const menuClass = isScrolled
    ? 'border-[#E2E8F0] bg-white shadow-lg'
    : 'border-white/15 bg-[#1E0A4E]/95 shadow-[0_20px_50px_rgba(9,5,28,0.34)] backdrop-blur-xl'
  const linkClass = isScrolled
    ? 'text-gray500 hover:text-purpleNavbar'
    : 'text-white/70 hover:text-white'

  return (
    <div className={`absolute left-0 right-0 top-full z-40 flex flex-col gap-3 border-b px-6 py-4 md:hidden ${menuClass}`}>
      {navLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={`py-1 font-body text-sm font-semibold transition-colors ${linkClass}`}
        >
          {link.label}
        </a>
      ))}
      <div className={`flex flex-col gap-2 border-t pt-3 ${isScrolled ? 'border-[#E2E8F0]' : 'border-white/10'}`}>
        {localUser ? (
          <>
            <div className={`rounded-xl border px-4 py-3 ${isScrolled ? 'border-[#E2E8F0] bg-[#F8FAFC]' : 'border-white/10 bg-white/[0.07]'}`}>
              <p className={`font-body text-sm font-semibold ${isScrolled ? 'text-[#1E0A4E]' : 'text-white'}`}>{localUser.nombre || 'Usuario'}</p>
              <p className="mt-0.5 flex items-center gap-1 font-body text-xs text-[#35C56A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#35C56A]" /> En línea
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/my-trips')}
              className={`rounded-xl border px-4 py-2 text-center font-body text-sm font-semibold transition-colors ${isScrolled ? 'border-[#E2E8F0] text-[#1E0A4E] hover:bg-[#F0EEF8]' : 'border-white/20 text-white hover:bg-white/10'}`}
            >
              Ir a la plataforma
            </button>
            <button
              type="button"
              onClick={async () => { await logout(); navigate('/') }}
              className="rounded-xl bg-[#FFF5F5] px-4 py-2 text-center font-body text-sm font-semibold text-[#EF4444] transition-opacity hover:opacity-80"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <a
              href="/login"
              className={`rounded-xl border px-4 py-2 text-center font-body text-sm font-semibold transition-colors ${isScrolled ? 'border-[#E2E8F0] text-gray700 hover:border-bluePrimary hover:text-bluePrimary' : 'border-white/20 text-white hover:bg-white/10'}`}
            >
              Iniciar sesión
            </a>
            <a
              href="/register"
              className="rounded-xl bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] px-4 py-2 text-center font-body text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Crear cuenta
            </a>
          </>
        )}
      </div>
    </div>
  )
}

function LandingNavContent({
  navLinks,
  mobileOpen,
  isScrolled,
}: {
  navLinks: NavLink[]
  mobileOpen: boolean
  isScrolled: boolean
}) {
  const linkClass = isScrolled
    ? 'text-gray500 hover:text-purpleNavbar'
    : 'text-white/75 hover:text-white'

  return (
    <>
      <div className={`ml-8 hidden items-center gap-1 rounded-2xl border px-2 py-1.5 backdrop-blur md:flex ${isScrolled ? 'border-[#E2E8F0] bg-[#F8FAFC]' : 'border-white/15 bg-white/10'}`}>
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`rounded-xl px-4 py-2 font-body text-sm font-semibold transition-all duration-200 hover:bg-white/10 ${linkClass}`}
          >
            {link.label}
          </a>
        ))}
      </div>
      <LandingDesktopRight isScrolled={isScrolled} />
      {mobileOpen && <LandingMobileMenu navLinks={navLinks} isScrolled={isScrolled} />}
    </>
  )
}


function readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getNotificationAction(notification: NotificationItem): { label: string; url: string } | null {
  const metadata = notification.metadata ?? {}
  const actionUrl = readMetadataString(metadata, 'actionUrl')
  if (actionUrl) {
    return {
      label: readMetadataString(metadata, 'actionLabel') ?? 'Abrir',
      url: actionUrl,
    }
  }

  const groupId = notification.grupo_id
  if (!groupId) return null

  const baseUrl = `/dashboard?groupId=${encodeURIComponent(String(groupId))}`
  const tipo = String(notification.tipo ?? '').toLowerCase()
  const entidadTipo = String(notification.entidad_tipo ?? '').toLowerCase()

  if (tipo.includes('gasto') || tipo.includes('finanza') || tipo.includes('presupuesto') || entidadTipo === 'expense') {
    return { label: 'Ver finanzas', url: `${baseUrl}&tab=pagar` }
  }

  if (tipo.includes('documento') || entidadTipo === 'document') {
    return { label: 'Ver archivos', url: `${baseUrl}&tab=boveda` }
  }

  if (tipo.includes('vuelo') || tipo.includes('hospedaje') || tipo.includes('hotel')) {
    return { label: 'Ver propuesta', url: baseUrl }
  }

  if (
    tipo.includes('actividad') ||
    tipo.includes('propuesta') ||
    tipo.includes('voto') ||
    tipo.includes('comentario') ||
    tipo.includes('subgrupo') ||
    tipo.includes('itinerario') ||
    tipo.includes('solicitud_union') ||
    tipo.includes('invitacion') ||
    tipo.includes('miembro') ||
    tipo.includes('delegacion') ||
    tipo.includes('grupo')
  ) {
    return { label: 'Abrir viaje', url: baseUrl }
  }

  return null
}

function getTodayIsoDate(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function isClosedOrExpiredTrip(item: GroupHistoryItem): boolean {
  const group = item.grupos_viaje
  const status = group?.estado?.toLowerCase?.()
  const isClosedStatus = status === 'cerrado' || status === 'archivado' || status === 'finalizado'
  const isExpiredByDate = Boolean(group?.fecha_fin && group.fecha_fin.slice(0, 10) < getTodayIsoDate())
  return isClosedStatus || isExpiredByDate
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000))

  if (diffMinutes < 1) return 'Ahora'
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Hace ${diffHours} h`

  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatScheduledInfo(metadata: Record<string, unknown>): string | null {
  const scheduledAt = readMetadataString(metadata, 'scheduledAt')
  const scheduledEndAt = readMetadataString(metadata, 'scheduledEndAt')
  const location = readMetadataString(metadata, 'location')
  const origin = readMetadataString(metadata, 'origin')
  const destination = readMetadataString(metadata, 'destination')
  const parts: string[] = []

  if (scheduledAt) {
    const date = new Date(scheduledAt)
    if (!Number.isNaN(date.getTime())) {
      parts.push(date.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }))
    }
  }

  if (scheduledEndAt && !scheduledAt) {
    const date = new Date(scheduledEndAt)
    if (!Number.isNaN(date.getTime())) {
      parts.push(`Hasta ${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`)
    }
  }

  if (origin && destination) parts.push(`${origin} → ${destination}`)
  else if (location) parts.push(location)

  return parts.length > 0 ? parts.join(' • ') : null
}

// ── Dashboard variant ─────────────────────────────────────────────────────────

const DEFAULT_TRIP: TripInfo    = { name: 'Cancún 2025', subtitle: 'Riviera Maya, México' }
const DEFAULT_USER: NavUserInfo = {
  name: 'Cargando...',
  role: '',
  initials: '--',
  color: '#1E6FD9',
}

function formatTripRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Fechas pendientes'
  if (start && end) return `${start} – ${end}`
  return start ?? end ?? 'Fechas pendientes'
}

function TripThumbnail({ group }: { group: Group }) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = group.destino_photo_url
  const label = group.destino || group.destino_formatted_address || group.nombre || 'Viaje'

  if (imageUrl && !imageFailed) {
    return (
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#EEF4FF] shadow-sm">
        <img
          src={imageUrl}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1E6FD9]/10 font-body text-xs font-bold text-[#1E6FD9]">
      {(group.nombre || 'V')[0]}
    </div>
  )
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
        <p className="break-words font-body text-sm font-bold leading-tight text-white">{trip.name}</p>
        <p className="break-words font-body text-xs leading-tight text-white/60">{trip.subtitle}</p>
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
  isOnline: boolean
  mobileOpen: boolean
  showTripSelector: boolean
  centerTitle: string
  onTripSelect?: () => void
  onUserMenu?: () => void
  onOpenChat?: () => void
  chatUnreadCount?: number
}

function DashboardNavContent({
  trip,
  user,
  isOnline,
  mobileOpen,
  showTripSelector,
  centerTitle,
  onTripSelect,
  onOpenChat,
  chatUnreadCount = 0,
}: DashboardContentProps) {
  const navigate = useNavigate()
  const { logout, localUser, accessToken } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [notifOpen,   setNotifOpen]   = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const notifRef = useRef<HTMLDivElement>(null)
  const avatarUrl = localUser?.avatar_url
  const [tripMenuOpen, setTripMenuOpen] = useState(false)
  const [tripHistory, setTripHistory] = useState<GroupHistoryItem[]>([])
  const [tripMenuLoading, setTripMenuLoading] = useState(false)
  const [tripMenuError, setTripMenuError] = useState<string | null>(null)
  const [tripSwitchingId, setTripSwitchingId] = useState<string | null>(null)
  const tripMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTripSwitchingId(null)
  }, [trip.name, trip.subtitle])

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

  useEffect(() => {
    if (!tripMenuOpen) return
    function handleOutside(e: MouseEvent) {
      if (tripMenuRef.current && !tripMenuRef.current.contains(e.target as Node)) {
        setTripMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [tripMenuOpen])

  useEffect(() => {
    if (!tripMenuOpen || !accessToken) return

    let isMounted = true

    const loadTrips = async () => {
      try {
        setTripMenuLoading(true)
        setTripMenuError(null)
        const response = await groupsService.getMyHistory(accessToken)
        if (!isMounted) return
        setTripHistory((response.activos ?? []).filter((item) => !isClosedOrExpiredTrip(item)))
      } catch (error) {
        if (!isMounted) return
        setTripMenuError(error instanceof Error ? error.message : 'No se pudieron cargar tus grupos')
      } finally {
        if (isMounted) setTripMenuLoading(false)
      }
    }

    void loadTrips()

    return () => {
      isMounted = false
    }
  }, [tripMenuOpen, accessToken])

  function handleToggleNotif() {
    setNotifOpen((o) => !o)
  }

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/login')
  }

  function handleTripSelect(item: GroupHistoryItem) {
    const selectedGroup = item.grupos_viaje
    if (!selectedGroup?.id) return

    const nextGroupId = String(selectedGroup.id)
    setTripSwitchingId(nextGroupId)
    setTripMenuError(null)

    saveCurrentGroup({
      ...selectedGroup,
      id: nextGroupId,
      myRole: item.rol,
    })
    setTripMenuOpen(false)
    navigate(`/dashboard?groupId=${encodeURIComponent(nextGroupId)}`, {
      state: {
        groupId: nextGroupId,
        switchingGroup: {
          id: nextGroupId,
          nombre: selectedGroup.nombre,
          destino: selectedGroup.destino,
          destino_formatted_address: selectedGroup.destino_formatted_address,
          destino_photo_url: selectedGroup.destino_photo_url,
          fecha_inicio: selectedGroup.fecha_inicio,
          fecha_fin: selectedGroup.fecha_fin,
          myRole: item.rol,
        },
      },
    })
  }

  return (
    <>
      {/* Center — trip selector or plain title */}
      {showTripSelector ? (
        <div ref={tripMenuRef} className="hidden md:block absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              onTripSelect?.()
              setTripMenuOpen((open) => !open)
            }}
            className="flex min-w-[250px] items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 hover:bg-white/20 transition-colors"
            aria-label="Seleccionar viaje"
            aria-expanded={tripMenuOpen}
          >
            <span className="text-white/60 shrink-0">
              <IconGlobe />
            </span>
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <span className="max-w-[170px] truncate font-body text-sm font-bold text-white leading-tight">{trip.name}</span>
              <span className="max-w-[170px] truncate font-body text-[11px] text-white/60 leading-tight">{trip.subtitle}</span>
            </div>
            <span className={`text-white/60 ml-0.5 shrink-0 transition-transform duration-200 ${tripMenuOpen ? 'rotate-180' : ''}`}>
              <IconChevronDown />
            </span>
          </button>

          {tripMenuOpen && (
            <div className="absolute left-1/2 top-full z-50 mt-2 w-[360px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <p className="font-heading text-sm font-bold text-[#1E0A4E]">Cambiar de grupo</p>
                <p className="mt-0.5 font-body text-[11px] text-gray500">Selecciona otro viaje sin volver a Mis viajes.</p>
              </div>

              <div className="max-h-80 overflow-y-auto py-2">
                {tripMenuLoading && (
                  <p className="px-4 py-4 font-body text-sm text-gray500">Cargando tus grupos...</p>
                )}

                {!tripMenuLoading && tripMenuError && (
                  <p className="px-4 py-4 font-body text-sm text-red-500">{tripMenuError}</p>
                )}

                {!tripMenuLoading && !tripMenuError && tripHistory.length === 0 && (
                  <p className="px-4 py-4 font-body text-sm text-gray500">No tienes otros grupos disponibles.</p>
                )}

                {!tripMenuLoading && !tripMenuError && tripHistory.map((item) => {
                  const option = item.grupos_viaje
                  const isActive = option?.nombre === trip.name && (option?.destino || 'Destino pendiente') === trip.subtitle

                  return (
                    <button
                      key={`${option.id}-${item.rol}`}
                      onClick={() => handleTripSelect(item)}
                      disabled={tripSwitchingId === String(option.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] disabled:cursor-wait disabled:opacity-70 ${isActive ? 'bg-[#F4F1FF]' : ''}`}
                    >
                      <TripThumbnail group={option} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-body text-sm font-bold text-[#1E0A4E]">{option.nombre}</p>
                          {isActive && (
                            <span className="rounded-full bg-greenAccent/10 px-2 py-0.5 font-body text-[10px] font-semibold text-greenAccent">Activo</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-body text-[11px] text-gray500">
                          {option.destino || option.destino_formatted_address || 'Destino pendiente'}
                        </p>
                        <p className="mt-0.5 font-body text-[10px] text-gray500/80">
                          {formatTripRange(option.fecha_inicio, option.fecha_fin)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#EEF4FF] px-2 py-1 font-body text-[10px] font-semibold text-[#1E6FD9]">
                        {tripSwitchingId === String(option.id) ? 'Cambiando...' : item.rol === 'admin' ? 'Organizador' : 'Viajero'}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                <button
                  onClick={() => { setTripMenuOpen(false); navigate('/my-trips') }}
                  className="font-body text-xs font-semibold text-[#1E6FD9] hover:underline"
                >
                  Ver todos mis viajes →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : centerTitle ? (
        <span className="hidden md:block absolute left-1/2 -translate-x-1/2 font-heading font-bold text-white text-base pointer-events-none select-none">
          {centerTitle}
        </span>
      ) : null}

      {/* Right section */}
      <div className="ml-auto flex items-center gap-1">
        {/* Chat button */}
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="relative hidden md:flex items-center justify-center w-9 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={`Chat del grupo${chatUnreadCount > 0 ? ` — ${chatUnreadCount} sin leer` : ''}`}
          >
            <IconChat />
            {chatUnreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#DB2777] font-body text-[10px] font-bold leading-none text-white">
                {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
              </span>
            )}
          </button>
        )}

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
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 bg-white">
                <span className="font-heading font-bold text-[#1E0A4E] text-sm">Notificaciones</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                      className="text-[10px] text-gray500 hover:text-bluePrimary underline whitespace-nowrap"
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <span className="font-body text-[11px] text-[#1E6FD9] bg-[#1E6FD9]/10 px-2 py-0.5 rounded-full">{unreadCount} nuevas</span>
                  )}
                </div>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray500 text-sm">
                  No tienes notificaciones
                </div>
              ) : (
                notifications.map((n) => {
                  const action = getNotificationAction(n)

                  return (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.leida) markAsRead(n.id); }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors border-b border-[#E2E8F0] last:border-none ${!n.leida ? 'cursor-pointer bg-[#F8FAFC]/50' : 'cursor-default opacity-70'}`}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.leida ? 'bg-[#1E6FD9]' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-body text-sm font-semibold text-[#1E0A4E] leading-snug">{n.titulo}</p>
                          <span className="font-body text-[10px] text-[#1E0A4E]/40 whitespace-nowrap mt-0.5">
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </div>
                        <p className="font-body text-xs text-gray700 leading-snug mt-1">{n.mensaje}</p>
                        {formatScheduledInfo(n.metadata) && (
                          <p className="font-body text-[11px] text-[#1E6FD9] bg-[#1E6FD9]/10 rounded-md px-2 py-1 mt-2 line-clamp-2">
                            {formatScheduledInfo(n.metadata)}
                          </p>
                        )}
                        {action && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              if (!n.leida) markAsRead(n.id)
                              setNotifOpen(false)
                              navigate(action.url)
                            }}
                            className="mt-2 inline-flex rounded-lg bg-[#1E6FD9] px-3 py-1.5 font-body text-[11px] font-semibold text-white hover:bg-[#2C8BE6]"
                          >
                            {action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <span className="hidden md:block w-px h-5 bg-white/10 mx-1" />

        {/* Online chip */}
        <div
          className={`hidden md:flex items-center gap-1.5 rounded-full border px-3 py-1 ${
            isOnline
              ? 'border-greenAccent/30 bg-greenAccent/20'
              : 'border-red-300/40 bg-red-500/15'
          }`}
          title={isOnline ? 'Conectado y sincronizando en tiempo real' : 'Sin conexión o WebSocket desconectado'}
        >
          <span className="relative flex w-2 h-2 shrink-0">
            {isOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-greenAccent opacity-75" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isOnline ? 'bg-greenAccent' : 'bg-red-400'}`} />
          </span>
          <span className={`font-body text-xs font-medium ${isOnline ? 'text-greenAccent' : 'text-red-100'}`}>
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>

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

  const navBase = 'fixed top-0 left-0 right-0 z-50 h-20 px-6 flex items-center transition-all duration-300'
  const navTheme = isDashboard
    ? 'border-b border-white/10 bg-[linear-gradient(90deg,#24105E_0%,#2B1163_44%,#5B2BC0_100%)]'
    : scrolled
      ? 'bg-white/90 border-b border-[#E2E8F0] shadow-sm backdrop-blur-xl'
      : 'bg-[#1E0A4E]/20 border-b border-white/10 backdrop-blur-xl'
  const navShadow = scrolled
    ? isDashboard ? 'shadow-[0_2px_12px_rgba(0,0,0,0.4)]' : 'shadow-[0_18px_44px_rgba(15,23,42,0.08)]'
    : ''

  const hamburgerTheme = isDashboard
    ? 'text-white/70 hover:text-white hover:bg-white/10'
    : scrolled
      ? 'text-gray700 hover:bg-neutralBg'
      : 'text-white/75 hover:bg-white/10 hover:text-white'

  return (
    <nav className={[navBase, navTheme, navShadow].join(' ')}>
      {/* Logo */}
      <a href="/" className="shrink-0" aria-label="Ithera">
        <Logo
          variant={isDashboard || !scrolled ? 'white' : 'color'}
          height={isDashboard ? 64 : scrolled ? 54 : 58}
        />
      </a>

      {/* Sidebar toggle — dashboard only on tablet/desktop; mobile uses its own menu button */}
      {isDashboard && (
        <button
          onClick={(props as DashboardNavbarProps).onToggleSidebar}
          className="ml-2 hidden shrink-0 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:flex"
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
          isOnline={props.isOnline ?? true}
          mobileOpen={mobileOpen}
          showTripSelector={props.showTripSelector ?? true}
          centerTitle={props.centerTitle ?? ''}
          onTripSelect={props.onTripSelect}
          onOpenChat={props.onOpenChat}
          chatUnreadCount={props.chatUnreadCount}
        />
      ) : (
        <LandingNavContent
          navLinks={props.navLinks ?? DEFAULT_LANDING_LINKS}
          mobileOpen={mobileOpen}
          isScrolled={scrolled}
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
