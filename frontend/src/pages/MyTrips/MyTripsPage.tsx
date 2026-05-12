import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout/AppLayout'
import { useAuth } from '../../context/useAuth'
import { groupsService, saveCurrentGroup } from '../../services/groups'
import type { GroupHistoryItem } from '../../types/groups'

// ── Date helper ───────────────────────────────────────────────────────────────
  function formatRange(
    start: string | null | undefined,
    end: string | null | undefined
  ): string {
  if (!start && !end) return 'Fechas por definir'

  const fmt = (iso: string, withYear: boolean) =>
    new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
    }).format(new Date(iso))

  if (!end) return `Desde ${fmt(start!, true)}`

  const startYear = new Date(start!).getFullYear()
  const endYear   = new Date(end).getFullYear()
  const sameYear  = startYear === endYear

  return `${fmt(start!, !sameYear)} – ${fmt(end, true)}`
}

function getFirstName(nombre: string | null | undefined): string {
  if (!nombre) return 'viajero'
  return nombre.split(' ')[0]
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

function normalizeHistoryItems(items: GroupHistoryItem[] = []): GroupHistoryItem[] {
  return items.map((item) => ({
    ...item,
    grupos_viaje: {
      ...item.grupos_viaje,
      estado: isClosedOrExpiredTrip(item) ? 'cerrado' : item.grupos_viaje.estado,
    },
  }))
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 11l8-8M18 6l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconMap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconLuggage() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="8" width="12" height="13" rx="2" stroke="#1E0A4E" strokeWidth="1.5"/>
      <path d="M9 8V6a1 1 0 011-1h4a1 1 0 011 1v2" stroke="#1E0A4E" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="11" x2="12" y2="18" stroke="#1E0A4E" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="9" y1="14.5" x2="15" y2="14.5" stroke="#1E0A4E" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconWifiOff() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="1" y1="1" x2="23" y2="23" stroke="#1E0A4E" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.8M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="#1E0A4E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-3 px-6 pt-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 rounded-2xl bg-[#E5E7EB] animate-pulse"/>
      ))}
    </div>
  )
}

// ── Join code panel ───────────────────────────────────────────────────────────

function JoinCodePanel({ onJoined }: { onJoined: () => void }) {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [info, setInfo]       = useState('')
  const { accessToken }       = useAuth()

  const handleJoin = async () => {
    if (!code.trim()) return setError('Ingresa un código de invitación.')
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (!accessToken) {
        setError('Tu sesión expiró. Vuelve a iniciar sesión.')
        return
      }

      const response = await groupsService.joinGroup(code.trim().toUpperCase(), accessToken)

      if (response.group.requiresApproval) {
        setInfo(response.message || 'Tu solicitud fue enviada. Espera a que el organizador la apruebe.')
        setCode('')
        return
      }

      saveCurrentGroup(response.group)
      onJoined()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Código inválido o expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); setInfo('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="Ej: ABCD1234"
          maxLength={8}
          className="flex-1 font-body text-sm text-[#1E0A4E] placeholder-gray-400 border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10 tracking-widest uppercase bg-white"
        />
        <button
          onClick={handleJoin}
          disabled={loading}
          className="font-body text-sm font-semibold bg-[#1E0A4E] text-white rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Uniéndome…' : 'Unirme'}
        </button>
      </div>
      {error && <p className="font-body text-xs text-red-500">{error}</p>}
      {info && (
        <p className="rounded-xl bg-[#FFF8E6] px-4 py-3 font-body text-xs text-[#8A5A00]">
          {info} Te avisaremos por notificación cuando sea aceptada o rechazada.
        </p>
      )}
    </div>
  )
}

// ── Chips ─────────────────────────────────────────────────────────────────────

function StatusChip({ estado }: { estado: string }) {
  const map: Record<string, { label: string; className: string }> = {
    activo:     { label: 'ACTIVO',     className: 'bg-[#35C56A] text-white' },
    finalizado: { label: 'FINALIZADO', className: 'bg-[#E5E7EB] text-[#6B7280]' },
    cerrado:    { label: 'CERRADO',    className: 'bg-[#D1D5DB] text-[#374151]' },
    archivado:  { label: 'ARCHIVADO',  className: 'bg-[#D1D5DB] text-[#374151]' },
  }
  const cfg = map[estado] ?? { label: estado.toUpperCase(), className: 'bg-[#E5E7EB] text-[#6B7280]' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 font-body text-[10px] font-bold tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── Past (readonly) trip card ─────────────────────────────────────────────────
// Usada exclusivamente para viajes cerrados/archivados/finalizados.
// El botón de acción abre el viaje en modo solo lectura.

function PastTripCard({ item, onClick }: { item: GroupHistoryItem; onClick: () => void }) {
  const g = item.grupos_viaje

  return (
    <button
      onClick={onClick}
      className="w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 text-left shadow-sm transition-all hover:shadow-md hover:border-[#C3D3EC]"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <StatusChip estado={g.estado} />
        <RolBadge rol={item.rol} />
      </div>

      <h2 className="font-heading text-lg font-bold leading-tight mb-1 text-[#1E0A4E]">
        {g.nombre}
      </h2>

      {g.destino && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[#9CA3AF]"><IconMap /></span>
          <p className="font-body text-[13px] text-[#6B7280]">{g.destino}</p>
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-4">
        <span className="text-[#9CA3AF]"><IconClock /></span>
        <p className="font-body text-[12px] text-[#9CA3AF]">
          {formatRange(g.fecha_inicio, g.fecha_fin)}
        </p>
      </div>

      {/* Aviso de solo lectura */}
      <div className="mb-3 rounded-xl bg-[#F1F5F9] px-3 py-2">
        <p className="font-body text-[11px] text-[#64748B] leading-relaxed">
          Este viaje ya finalizó. Puedes consultar el itinerario y el resumen financiero en modo lectura.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-body text-xs text-[#6B7280]">
          {item.rol === 'admin' ? 'Tú organizaste este viaje' : 'Participaste como viajero'}
        </span>
        <span className="inline-flex min-w-[132px] items-center justify-center rounded-full border border-[#C3D3EC] bg-[#F8FAFC] px-5 py-2.5 font-body text-[13px] font-semibold text-[#64748B] shadow-sm transition-all">
          Ver historial →
        </span>
      </div>
    </button>
  )
}

function RolBadge({ rol, dark = false }: { rol: string; dark?: boolean }) {
  const isAdmin = rol === 'admin'

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 font-body text-[10px] font-bold ${
        isAdmin
          ? dark
            ? 'bg-white text-[#1E0A4E]'
            : 'bg-[#1E0A4E] text-white'
          : 'bg-[#1E6FD9] text-white'
      }`}
    >
      {isAdmin ? 'Organizador' : 'Viajero'}
    </span>
  )
}

// ── Featured active card ──────────────────────────────────────────────────────

function FeaturedCard({ item, onClick }: { item: GroupHistoryItem; onClick: () => void }) {
  const g = item.grupos_viaje
  return (
    <div className="overflow-hidden rounded-2xl border border-[#2D1266] bg-[#1E0A4E] p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <StatusChip estado="activo"/>
        <RolBadge rol={item.rol} dark />
      </div>
      <h2 className="font-heading text-xl font-bold text-white leading-tight mb-1">
        {g.nombre}
      </h2>
      {g.destino && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-white/50"><IconMap /></span>
          <p className="font-body text-[13px] text-white/70">{g.destino}</p>
        </div>
      )}
      <div className="flex items-center gap-1.5 mb-4">
        <span className="text-white/50"><IconClock /></span>
        <p className="font-body text-[12px] text-white/50">
          {formatRange(g.fecha_inicio, g.fecha_fin)}
        </p>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onClick}
          className="inline-flex min-w-[132px] items-center justify-center rounded-full border border-white/80 bg-white px-5 py-2.5 font-body text-[13px] font-semibold text-[#1E0A4E] shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md"
        >
          Abrir viaje →
        </button>
      </div>
    </div>
  )
}

// ── Secondary trip card ───────────────────────────────────────────────────────

function TripCard({ item, onClick }: { item: GroupHistoryItem; onClick: () => void }) {
  const g = item.grupos_viaje
  const isAdmin = item.rol === 'admin'

  return (
    <button
      onClick={onClick}
      className={`w-full overflow-hidden rounded-2xl border p-5 text-left shadow-sm transition-all hover:shadow-md ${
        isAdmin
          ? 'border-[#2D1266] bg-[#1E0A4E] text-white'
          : 'border-[#C3D3EC] bg-white text-[#1E0A4E] shadow-[0_8px_22px_rgba(30,10,78,0.08)] hover:border-[#1E6FD9]/50'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <StatusChip estado={g.estado} />
        <RolBadge rol={item.rol} />
      </div>

      <h2 className={`font-heading text-lg font-bold leading-tight mb-1 ${
        isAdmin ? 'text-white' : 'text-[#1E0A4E]'
      }`}>
        {g.nombre}
      </h2>

      {g.destino && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className={isAdmin ? 'text-white/50' : 'text-[#9CA3AF]'}>
            <IconMap />
          </span>
          <p className={`font-body text-[13px] ${
            isAdmin ? 'text-white/70' : 'text-[#6B7280]'
          }`}>
            {g.destino}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-4">
        <span className={isAdmin ? 'text-white/50' : 'text-[#9CA3AF]'}>
          <IconClock />
        </span>
        <p className={`font-body text-[12px] ${
          isAdmin ? 'text-white/50' : 'text-[#9CA3AF]'
        }`}>
          {formatRange(g.fecha_inicio, g.fecha_fin)}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className={`font-body text-xs ${
          isAdmin ? 'text-white/60' : 'text-[#6B7280]'
        }`}>
          {isAdmin ? 'Tú organizas este viaje' : 'Participas como viajero'}
        </span>

        <span className={`inline-flex min-w-[132px] items-center justify-center rounded-full border px-5 py-2.5 font-body text-[13px] font-semibold shadow-sm transition-all ${
          isAdmin
            ? 'border-white/80 bg-white text-[#1E0A4E]'
            : 'border-[#9FC0F4] bg-[#EAF2FF] text-[#1E6FD9]'
        }`}>
          Abrir viaje →
        </span>
      </div>
    </button>
  )
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E0A4E]/5">
        <IconWifiOff/>
      </div>
      <h2 className="mb-2 font-heading text-lg font-bold text-[#1E0A4E]">Sin conexión</h2>
      <p className="mb-5 font-body text-sm text-[#6B7280]">No pudimos cargar tus viajes.</p>
      <button
        onClick={onRetry}
        className="rounded-xl bg-[#1E6FD9] px-6 py-3 font-body text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      >
        Reintentar
      </button>
    </div>
  )
}

// ── MyTripsPage ───────────────────────────────────────────────────────────────

export function MyTripsPage() {
  const { accessToken, localUser } = useAuth()
  const navigate = useNavigate()

  const [activos, setActivos] = useState<GroupHistoryItem[]>([])
  const [pasados, setPasados] = useState<GroupHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  async function fetchTrips() {
  if (!accessToken) return

  setLoading(true)
  setError(false)

  try {
    const data = await groupsService.getMyHistory(accessToken)
    const allTrips = normalizeHistoryItems([...(data.activos ?? []), ...(data.pasados ?? [])])
    setActivos(allTrips.filter((item) => !isClosedOrExpiredTrip(item)))
    setPasados(allTrips.filter((item) => isClosedOrExpiredTrip(item)))
  } catch {
    setError(true)
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    fetchTrips()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])


  function openTrip(item: GroupHistoryItem) {
    saveCurrentGroup({
      ...item.grupos_viaje,
      myRole: item.rol,
    })

    navigate(`/dashboard?groupId=${encodeURIComponent(item.grupos_viaje.id)}`)
  }

  const hasTrips = activos.length > 0 || pasados.length > 0
  const featured = activos.find((item) => item.rol === 'admin') ?? activos[0]
  const extraActivos = activos.filter(
    (item) => item.grupos_viaje.id !== featured?.grupos_viaje.id
  )
  const firstName = getFirstName(localUser?.nombre)
  const fullName = localUser?.nombre || localUser?.email || 'Usuario'
  const initials = fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const navUser = {
    name: fullName,
    role: 'Usuario',
    initials,
  }

  return (
    <AppLayout showTripSelector={false} user={navUser}>
      {loading ? (
        <SkeletonCards/>
      ) : error ? (
        <ErrorState onRetry={fetchTrips}/>
      ) : (
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">

          {/* ── Header ── */}
          <div className="bg-white border-b border-[#E2E8F0] px-6 py-5">
            <h1 className="font-heading text-2xl font-bold text-[#1E0A4E] mb-0.5">
              Hola, {firstName} 👋
            </h1>
            <p className="font-body text-sm text-[#6B7280]">
              {hasTrips
                ? `Tienes ${activos.length} viaje${activos.length !== 1 ? 's' : ''} activo${activos.length !== 1 ? 's' : ''}`
                : 'Empieza creando tu primer viaje o únete a uno existente'}
            </p>
          </div>

          {/* ── Quick actions ── */}
          <div className="px-6 py-4 flex gap-3">
            <button
              onClick={() => navigate('/create-group')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1E6FD9] text-white font-body text-sm font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity shadow-sm"
            >
              <IconPlus/>
              Crear viaje
            </button>
            <button
              onClick={() => setShowJoin((v) => !v)}
              className={`flex-1 flex items-center justify-center gap-2 font-body text-sm font-semibold rounded-xl py-3 border transition-all shadow-sm
                ${showJoin
                  ? 'bg-[#1E0A4E] text-white border-[#1E0A4E]'
                  : 'bg-white text-[#1E0A4E] border-[#E2E8F0] hover:border-[#1E0A4E]/30'
                }`}
            >
              <IconKey/>
              Unirme con código
            </button>
          </div>

          {/* ── Join panel ── */}
          {showJoin && (
            <div className="px-6 pb-4">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm">
                <p className="font-body text-xs font-semibold text-[#1E0A4E]/50 uppercase tracking-wide mb-3">
                  Código de invitación
                </p>
                <JoinCodePanel onJoined={() => { setShowJoin(false); fetchTrips() }}/>
              </div>
            </div>
          )}

          <div className="px-6 pb-8 flex flex-col gap-5">

            {/* ── Sin viajes ── */}
            {!hasTrips && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1E0A4E]/5">
                  <IconLuggage/>
                </div>
                <h2 className="mb-2 font-heading text-lg font-bold text-[#1E0A4E]">
                  Aún no tienes viajes
                </h2>
                <p className="mb-2 font-body text-sm text-[#6B7280] max-w-xs leading-relaxed">
                  Crea tu primer grupo de viaje e invita a tus amigos, o únete a uno con un código de invitación.
                </p>

                {/* Tips */}
                <div className="mt-6 w-full max-w-sm flex flex-col gap-3 text-left">
                  {[
                    { icon: <IconPlus/>, title: 'Crea un viaje', desc: 'Define destino, fechas e invita a tu equipo.' },
                    { icon: <IconKey/>,  title: 'Únete con código', desc: 'Alguien ya organizó el viaje? Ingresa el código.' },
                    { icon: <IconUsers/>, title: 'Planeen juntos', desc: 'Propón actividades, voten y coordínense.' },
                  ].map((tip) => (
                    <div key={tip.title} className="flex items-start gap-3 bg-white border border-[#E2E8F0] rounded-2xl p-4">
                      <div className="w-8 h-8 rounded-xl bg-[#1E6FD9]/10 flex items-center justify-center shrink-0 text-[#1E6FD9]">
                        {tip.icon}
                      </div>
                      <div>
                        <p className="font-body text-sm font-semibold text-[#1E0A4E]">{tip.title}</p>
                        <p className="font-body text-xs text-[#6B7280]">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Viaje activo destacado ── */}
            {featured && (
              <section>
                <p className="mb-2 font-body text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  {featured.rol === 'admin' ? 'Viaje que organizas' : 'Viaje activo'}
                </p>
                <FeaturedCard item={featured} onClick={() => openTrip(featured)}/>
              </section>
            )}

            {/* ── Activos adicionales ── */}
            {extraActivos.length > 0 && (
              <div className="flex flex-col gap-3">
                {extraActivos.map((item) => (
                  <TripCard
                    key={item.grupos_viaje.id}
                    item={item}
                    onClick={() => openTrip(item)}
                  />
                ))}
              </div>
            )}

            {/* ── Historial (viajes cerrados / archivados / finalizados) ── */}
            {pasados.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowHistory((value) => !value)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#F8FAFC]"
                  aria-expanded={showHistory}
                >
                  <div>
                    <p className="font-body text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Historial
                    </p>
                    <p className="mt-1 font-body text-sm text-[#1E0A4E]">
                      {pasados.length} viaje{pasados.length !== 1 ? 's' : ''} cerrado{pasados.length !== 1 ? 's' : ''} disponible{pasados.length !== 1 ? 's' : ''} para consulta.
                    </p>
                  </div>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] transition-transform ${showHistory ? 'rotate-180' : ''}`}>
                    <IconChevronDown />
                  </span>
                </button>

                {showHistory && (
                  <div className="flex flex-col gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    {pasados.map((item) => (
                      <PastTripCard
                        key={item.grupos_viaje.id}
                        item={item}
                        onClick={() => openTrip(item)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>
        </div>
      )}
    </AppLayout>
  )
}
