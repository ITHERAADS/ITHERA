import { useState, useRef, useImperativeHandle, forwardRef, type ReactNode } from 'react'
import type { ContextEntitySummary } from '../../../services/context-links'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Activity {
  id: string
  kind?: 'activity' | 'subgroup-slot'
  proposalId?: string | null
  createdBy?: string | null
  hasVoted?: boolean
  myVote?: 'a_favor' | 'en_contra' | 'abstencion' | null
  title: string
  description: string
  category: 'transporte' | 'hospedaje' | 'actividad'
  status: 'confirmada' | 'pendiente'
  price: number
  currency: string
  time: string
  location?: string
  votes?: number
  proposedBy?: string
  image: string
  externalReference?: string | null
  latitude?: number | null
  longitude?: number | null
  routeDistanceText?: string | null
  routeDurationText?: string | null
  routeTravelMode?: string | null
  adminDecisionType?: 'A' | 'B' | 'C' | null
  linkedContext?: ContextEntitySummary[]
  startsAt?: string | null
  endsAt?: string | null
  subgroupSlot?: {
    slotId: number
    startsAt: string
    endsAt: string
    groupCount: number
    participantCount: number
    targetSubgroupId?: number | null
  }
}

export interface DayViewProps {
  dayNumber: number
  date: string
  activities: Activity[]
  isActive?: boolean
  defaultExpanded?: boolean
  isExpanded?: boolean
  onSelect?: (dayNumber: number) => void
  onAccept?: (activityId: string) => void | Promise<void>
  onReject?: (activityId: string) => void | Promise<void>
  onDelete?: (activityId: string) => void | Promise<void>
  onEdit?: (activityId: string) => void
  onManageContext?: (activity: Activity) => void
  onOpenBudget?: () => void
  onOpenVault?: () => void
  currentUserId?: string | number | null
  currentUserRole?: 'admin' | 'viajero' | string | null
  onAddActivity?: (dayNumber: number) => void
  renderConfirmedActions?: (activity: Activity) => ReactNode
  renderPendingActions?: (activity: Activity) => ReactNode
}

export interface DayViewHandle {
  scrollIntoView: () => void
}

// ── Inline icons ──────────────────────────────────────────────────────────────

function IconChevron({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconClock({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconMapPin({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconCheck({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function IconSpinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconEdit({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSearch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconCalendarEmpty({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-bluePrimary">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Category helpers ──────────────────────────────────────────────────────────

function CategoryIcon({ category, size = 13 }: { category: Activity['category']; size?: number }) {
  if (category === 'transporte') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5 18 1 16 1 14.5 2.5L11 6 2.8 4.2l-2 2 3.5 3.5L2 14l2 2 4.5-2 3.5 3.5 3.5 3.5 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (category === 'hospedaje') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 9V5a1 1 0 011-1h18a1 1 0 011 1v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <rect x="2" y="9" width="20" height="9" rx="1" stroke="currentColor" strokeWidth="2" />
        <line x1="2" y1="18" x2="2" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="18" x2="22" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function getCategoryColor(category: Activity['category']): string {
  if (category === 'transporte') return '#1E6FD9'
  if (category === 'hospedaje')  return '#7A4FD6'
  return '#F59E0B'
}

function getSectionLabel(category: Activity['category']): { emoji: string; text: string } {
  if (category === 'transporte') return { emoji: '✈', text: 'TRANSPORTE' }
  if (category === 'hospedaje')  return { emoji: '🏨', text: 'HOSPEDAJE' }
  return { emoji: '⭐', text: 'ACTIVIDADES' }
}

function getGoogleMapsRouteUrl(activity: Activity): string | null {
  if (activity.latitude == null || activity.longitude == null) return null
  const destination = `${activity.latitude},${activity.longitude}`
  const travelMode = String(activity.routeTravelMode ?? 'DRIVE').toLowerCase()
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=${encodeURIComponent(travelMode)}`
}

function IconLayers({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 12l9 4.5 9-4.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 16.5L12 21l9-4.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function IconMessageCircle({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function getMinutesFromDate(value?: string | null): number | null {
  if (!value) return null
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return null
  return parsed.getHours() * 60 + parsed.getMinutes()
}

function getMinutesFromTimeLabel(value?: string | null): number | null {
  if (!value) return null
  const match = value.match(/(\d{1,2}):([0-5]\d)\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/i)
  if (!match) return null

  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3]?.toLowerCase().replace(/\s|\./g, '')
  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  if (hours > 23) return null

  return hours * 60 + minutes
}

function getActivitySortTimestamp(activity: Activity): number {
  const labelMinutes = getMinutesFromTimeLabel(activity.time)
  if (labelMinutes !== null) return labelMinutes

  if (activity.startsAt) {
    const minutes = getMinutesFromDate(activity.startsAt)
    if (minutes !== null) return minutes
  }

  return Number.MAX_SAFE_INTEGER
}

function getActivityTimelineTimeLabel(activity: Activity): string {
  if (activity.kind === 'subgroup-slot' && activity.subgroupSlot?.startsAt) {
    return new Date(activity.subgroupSlot.startsAt).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Mexico_City',
    })
  }

  return activity.time
}

function getActivityStartTime(activity: Activity): number | null {
  if (activity.startsAt) {
    const parsed = new Date(activity.startsAt).getTime()
    if (Number.isFinite(parsed)) return parsed
  }

  return null
}

function sortActivitiesChronologically(activities: Activity[]): Activity[] {
  return [...activities].sort((left, right) => {
    const startDiff = getActivitySortTimestamp(left) - getActivitySortTimestamp(right)
    if (startDiff !== 0) return startDiff
    return left.title.localeCompare(right.title, 'es')
  })
}

function getConflictActivityIds(activities: Activity[]): Set<string> {
  const ids = new Set<string>()
  const groups = new Map<string, string[]>()

  for (const activity of activities) {
    const key = activity.startsAt ?? activity.time
    if (!key || key === 'Hora pendiente') continue
    const bucket = groups.get(key) ?? []
    bucket.push(activity.id)
    groups.set(key, bucket)
  }

  for (const bucket of groups.values()) {
    if (bucket.length <= 1) continue
    for (const activityId of bucket) ids.add(activityId)
  }

  return ids
}

type TimelineNowPosition =
  | { type: 'before'; label: string; timeLabel: string | null }
  | { type: 'on'; activityId: string; label: string }
  | { type: 'after'; label: string; timeLabel: string | null }
  | null

function isSameCalendarDay(left: number, right: number): boolean {
  return new Date(left).toDateString() === new Date(right).toDateString()
}

function getTimelineNowPosition(activities: Activity[]): TimelineNowPosition {
  const starts = activities
    .map((activity) => ({ activity, start: getActivityStartTime(activity) }))
    .filter((item): item is { activity: Activity; start: number } => item.start !== null)
    .sort((a, b) => a.start - b.start)

  if (starts.length === 0) return null

  const now = Date.now()
  const nowLabel = new Date(now).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const first = starts[0]
  const last = starts[starts.length - 1]
  const isActivityDayToday = isSameCalendarDay(first.start, now)

  if (now < first.start) {
    return { type: 'before', label: 'Aun no inicia', timeLabel: isActivityDayToday ? nowLabel : null }
  }

  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index]
    const next = starts[index + 1]
    if (now >= current.start && (!next || now < next.start)) {
      return { type: 'on', activityId: current.activity.id, label: 'Ahora' }
    }
  }

  if (now > last.start) {
    return { type: 'after', label: 'Dia completado', timeLabel: isActivityDayToday ? nowLabel : null }
  }

  return null
}

function TimelineNowMarker({ label, timeLabel }: { label: string; timeLabel: string | null }) {
  return (
    <div className="relative grid grid-cols-[64px_28px_minmax(0,1fr)] gap-3">
      <div className="relative z-10 flex justify-end pt-1">
        {timeLabel && (
          <span className="inline-flex h-7 min-w-[58px] items-center justify-center rounded-full border border-[#E2D8FF] bg-white px-2.5 font-body text-[11px] font-bold text-[#7A4FD6]">
            {timeLabel}
          </span>
        )}
      </div>
      <div className="relative z-10 flex justify-center pt-[7px]" aria-hidden="true">
        <span className="h-7 w-7 rounded-full border-[6px] border-white bg-[#7A4FD6] shadow-[0_0_0_8px_rgba(232,222,255,0.95),0_12px_28px_rgba(122,79,214,0.28)]" />
      </div>
      <div className="flex min-h-[34px] items-center">
        <span className="inline-flex rounded-full border border-[#E2D8FF] bg-[#F7F2FF] px-3 py-1.5 font-body text-[11px] font-bold text-[#5B35B1]">
          {label}
        </span>
      </div>
    </div>
  )
}

function TimelineItem({
  activity,
  hasConflict,
  isNow,
  children,
}: {
  activity: Activity
  hasConflict: boolean
  isNow: boolean
  children: ReactNode
}) {
  const accentColor = hasConflict ? '#DC2626' : isNow ? '#1E0A4E' : '#7A4FD6'

  return (
    <div className="relative grid grid-cols-[64px_28px_minmax(0,1fr)] gap-3">
      <div className="relative z-10 flex justify-end pt-1.5">
        <span
          className="inline-flex h-7 min-w-[58px] items-center justify-center rounded-full border px-2.5 font-body text-[11px] font-bold"
          style={{
            color: accentColor,
            borderColor: hasConflict ? '#FECACA' : '#E2D8FF',
            backgroundColor: hasConflict ? '#FFF7F7' : '#FFFFFF',
          }}
        >
          {getActivityTimelineTimeLabel(activity)}
        </span>
      </div>

      <div aria-hidden="true" />

      <div className="min-w-0">
        {hasConflict && (
          <span className="mb-2 inline-flex items-center rounded-full bg-[#FEF2F2] px-2.5 py-1 font-body text-[11px] font-semibold text-[#B91C1C]">
            Conflicto de horario
          </span>
        )}
        {isNow && (
          <span className="mb-2 inline-flex items-center rounded-full border border-[#E2D8FF] bg-[#F7F2FF] px-3 py-1.5 font-body text-[11px] font-bold text-[#5B35B1]">
            Ahora
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
      <span className="text-sm leading-none">{emoji}</span>
      <span className="font-body text-[11px] font-semibold text-gray500 uppercase tracking-wider">
        {text}
      </span>
    </div>
  )
}

function ActivityContextBlock({
  activity,
  onOpenBudget,
  onOpenVault,
}: {
  activity: Activity
  onManageContext?: (activity: Activity) => void
  onOpenBudget?: () => void
  onOpenVault?: () => void
}) {
  const linked = activity.linkedContext ?? []
  const expenses = linked.filter((entity) => entity.type === 'expense')
  const documents = linked.filter((entity) => entity.type === 'document')

  return (
    <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#64748B]">
          Asociaciones confirmadas
        </p>
      </div>

      {linked.length === 0 ? (
        <p className="font-body text-xs text-[#7A8799]">
          Aun no hay asociaciones confirmadas.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {expenses.map((entity) => (
            <button
              key={`${entity.type}:${entity.id}`}
              type="button"
              onClick={onOpenBudget}
              className="max-w-full rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-2.5 py-1 font-body text-[11px] font-semibold text-[#1E6FD9] hover:bg-[#E2EDFF]"
              title={entity.label}
            >
              Gasto: <span className="font-medium">{entity.label}</span>
            </button>
          ))}
          {documents.map((entity) => (
            <button
              key={`${entity.type}:${entity.id}`}
              type="button"
              onClick={onOpenVault}
              className="max-w-full rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-2.5 py-1 font-body text-[11px] font-semibold text-[#5B35B1] hover:bg-[#ECE4FF]"
              title={entity.label}
            >
              Documento: <span className="font-medium">{entity.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ActivityCardConfirmed ─────────────────────────────────────────────────────

function SubgroupSlotCard({
  activity,
  actionButtons,
}: {
  activity: Activity
  actionButtons?: ReactNode
}) {
  const slot = activity.subgroupSlot

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8C8FF] bg-[linear-gradient(135deg,#FFFFFF_0%,#F7F2FF_100%)] shadow-[0_14px_34px_rgba(122,79,214,0.10)]">
      <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-[#1E0A4E] px-3 py-1 font-body text-[11px] font-bold uppercase tracking-[0.14em] text-white">
              Subgrupos
            </span>
            <span className="inline-flex rounded-full border border-[#D8C8FF] bg-white px-3 py-1 font-body text-[11px] font-bold text-[#6D45C0]">
              {activity.time}
            </span>
          </div>
          <h3 className="font-heading text-lg font-bold leading-tight text-[#1E0A4E]">
            {activity.title}
          </h3>
          {activity.description && (
            <p className="mt-1 max-w-3xl font-body text-sm leading-6 text-[#64748B]">
              {activity.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 font-body text-xs font-semibold text-[#475569] ring-1 ring-[#E2E8F0]">
              {slot?.groupCount ?? 0} opcion{slot?.groupCount === 1 ? '' : 'es'}
            </span>
            <span className="rounded-full bg-white px-3 py-1 font-body text-xs font-semibold text-[#475569] ring-1 ring-[#E2E8F0]">
              {slot?.participantCount ?? 0} participante{slot?.participantCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {actionButtons && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actionButtons}
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityCardConfirmed({
  activity,
  currentUserId,
  currentUserRole,
  onDelete,
  onEdit,
  onManageContext,
  onOpenBudget,
  onOpenVault,
  actionButtons,
}: {
  activity: Activity
  currentUserId?: string | number | null
  currentUserRole?: 'admin' | 'viajero' | string | null
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
  onManageContext?: (activity: Activity) => void
  onOpenBudget?: () => void
  onOpenVault?: () => void
  actionButtons?: ReactNode
}) {
  if (activity.kind === 'subgroup-slot') {
    return <SubgroupSlotCard activity={activity} actionButtons={actionButtons} />
  }

  const iconColor = getCategoryColor(activity.category)
  const isOwner = String(activity.createdBy ?? '') === String(currentUserId ?? '')
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'organizador'
  const canEdit = isOwner
  const canDelete = isOwner || isAdmin
  const routeUrl = getGoogleMapsRouteUrl(activity)

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={activity.image}
          alt={activity.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Confirmed badge */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 font-body text-[11px] font-bold text-white bg-greenAccent rounded-full px-3 py-1 shadow-sm">
          <IconCheck size={10} />
          CONFIRMADO
        </span>
        {/* Category icon circle */}
        <div
          className="absolute left-4 -bottom-4 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-[#E2E8F0] shrink-0"
          style={{ color: iconColor }}
        >
          <CategoryIcon category={activity.category} size={14} />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-6 pb-4">
        <h3 className="font-heading font-bold text-purpleNavbar text-[15px] mb-1 leading-snug">
          {activity.title}
        </h3>
        <p className="font-body text-[13px] text-gray500 mb-3 leading-relaxed">
          {activity.description}
        </p>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1">
            <span className="text-bluePrimary"><IconClock /></span>
            {activity.time}
          </span>
          {activity.location && (
            <span className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1">
              <span className="text-bluePrimary"><IconMapPin /></span>
              {activity.location}
            </span>
          )}
          {activity.routeDistanceText && activity.routeDurationText && (
            <a
              href={routeUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              title={routeUrl ? 'Abrir ruta en Google Maps' : 'Ruta no disponible'}
              onClick={(event) => {
                if (!routeUrl) event.preventDefault()
              }}
              className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1 hover:bg-[#E7F0FF] transition-colors"
            >
              <span className="text-bluePrimary"><IconMapPin /></span>
              {activity.routeDistanceText} · {activity.routeDurationText}
            </a>
          )}
        </div>

        {/* Confirmation status */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-greenAccent shrink-0" />
          <span className="font-body text-xs text-greenAccent font-medium">
            Reservación confirmada
          </span>
        </div>
        <ActivityContextBlock
          activity={activity}
          onManageContext={onManageContext}
          onOpenBudget={onOpenBudget}
          onOpenVault={onOpenVault}
        />
        {(actionButtons || canEdit || canDelete) && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF2FF] pt-3">
            {actionButtons}
            {canEdit && (
              <button
                onClick={() => onEdit?.(activity.id)}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#D9E2F2] bg-white text-bluePrimary hover:bg-blue-50 hover:border-bluePrimary/30 transition-colors shrink-0"
                aria-label="Editar actividad confirmada"
                title="Editar (volverá a votación)"
              >
                <IconEdit size={14} />
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => onDelete?.(activity.id)}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#D9E2F2] bg-white text-gray500 hover:text-red-500 hover:border-red-200 transition-colors shrink-0"
                aria-label="Eliminar actividad confirmada"
              >
                <IconTrash size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ActivityCardPending ───────────────────────────────────────────────────────

function ActivityCardPending({
  activity,
  currentUserId,
  currentUserRole,
  onAccept,
  onReject,
  onDelete,
  onEdit,
  onManageContext,
  onOpenBudget,
  onOpenVault,
  actionButtons,
}: {
  activity: Activity
  currentUserId?: string | number | null
  currentUserRole?: 'admin' | 'viajero' | string | null
  onAccept?: (id: string) => void | Promise<void>
  onReject?: (id: string) => void | Promise<void>
  onDelete?: (id: string) => void | Promise<void>
  onEdit?: (id: string) => void
  onManageContext?: (activity: Activity) => void
  onOpenBudget?: () => void
  onOpenVault?: () => void
  actionButtons?: ReactNode
}) {
  const iconColor = getCategoryColor(activity.category)
  const isOwner = String(activity.createdBy ?? '') === String(currentUserId ?? '')
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'organizador'
  const canEdit = isOwner
  const canDelete = isOwner || isAdmin
  const myVote = activity.myVote ?? null
  const routeUrl = getGoogleMapsRouteUrl(activity)
  const [busyAction, setBusyAction] = useState<'accept' | 'reject' | 'delete' | null>(null)
  const isActionBusy = busyAction !== null

  const runCardAction = async (action: 'accept' | 'reject' | 'delete', callback?: (id: string) => void | Promise<void>) => {
    if (!callback || isActionBusy) return
    try {
      setBusyAction(action)
      await Promise.resolve(callback(activity.id))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-[#E2E8F0] overflow-hidden">
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={activity.image}
          alt={activity.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Pending badge */}
        <span className="absolute top-3 left-3 font-body text-[11px] font-bold text-white bg-purpleMedium rounded-full px-3 py-1">
          POR CONFIRMAR
        </span>
        {/* Category icon circle */}
        <div
          className="absolute left-4 -bottom-4 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-[#E2E8F0] shrink-0"
          style={{ color: iconColor }}
        >
          <CategoryIcon category={activity.category} size={14} />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-6 pb-4">
        <h3 className="font-heading font-bold text-purpleNavbar text-[15px] mb-1 leading-snug">
          {activity.title}
        </h3>
        <p className="font-body text-[13px] text-gray500 mb-3 leading-relaxed">
          {activity.description}
        </p>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1">
            <span className="text-bluePrimary"><IconClock /></span>
            {activity.time}
          </span>
          {activity.location && (
            <span className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1">
              <span className="text-bluePrimary"><IconMapPin /></span>
              {activity.location}
            </span>
          )}
          {activity.routeDistanceText && activity.routeDurationText && (
            <a
              href={routeUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              title={routeUrl ? 'Abrir ruta en Google Maps' : 'Ruta no disponible'}
              onClick={(event) => {
                if (!routeUrl) event.preventDefault()
              }}
              className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1 hover:bg-[#E7F0FF] transition-colors"
            >
              <span className="text-bluePrimary"><IconMapPin /></span>
              {activity.routeDistanceText} · {activity.routeDurationText}
            </a>
          )}
          {activity.votes !== undefined && (
            <span className="inline-flex items-center gap-1 font-body text-xs text-purpleMedium bg-purpleMedium/10 rounded-full px-3 py-1 font-medium">
              ↑ {activity.votes} votos
            </span>
          )}
        </div>

        {activity.proposedBy && (
          <p className="font-body text-xs text-gray500 italic mt-1 mb-3">
            Propuesto por {activity.proposedBy}
          </p>
        )}
        {activity.adminDecisionType === 'A' && (
          <p className="font-body text-xs text-[#1E6FD9] font-semibold mt-1 mb-3">
            Puesta por el admin directamente (Tipo A)
          </p>
        )}

        <ActivityContextBlock
          activity={activity}
          onManageContext={onManageContext}
          onOpenBudget={onOpenBudget}
          onOpenVault={onOpenVault}
        />

        {/* Accept / Delete row */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#EEF2FF] pt-3">
          <div className="grid h-11 flex-1 grid-cols-2 overflow-hidden rounded-xl border border-[#D9E2F2] bg-white">
            <button
              type="button"
              onClick={() => void runCardAction('accept', onAccept)}
              disabled={isActionBusy}
              aria-busy={busyAction === 'accept'}
              className={`inline-flex items-center justify-center gap-1.5 border-r border-[#D9E2F2] px-3 font-body text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                myVote === 'a_favor'
                  ? 'bg-[#16A34A] text-white hover:bg-[#15803D]'
                  : 'bg-[#ECFDF3] text-[#166534] hover:bg-[#DCFCE7]'
              }`}
            >
              {busyAction === 'accept' ? <IconSpinner size={13} /> : <IconCheck size={12} />}
              {busyAction === 'accept' ? 'Votando...' : 'A favor'}
            </button>
            <button
              type="button"
              onClick={() => void runCardAction('reject', onReject)}
              disabled={isActionBusy}
              aria-busy={busyAction === 'reject'}
              className={`inline-flex items-center justify-center gap-1.5 px-3 font-body text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                myVote === 'en_contra'
                  ? 'bg-[#BE123C] text-white hover:bg-[#9F1239]'
                  : 'text-[#BE123C] hover:bg-[#FFF1F2]'
              }`}
            >
              {busyAction === 'reject' && <IconSpinner size={13} />}
              {busyAction === 'reject' ? 'Votando...' : 'En contra'}
            </button>
          </div>

          {(actionButtons || canDelete || canEdit) && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {actionButtons}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void runCardAction('delete', onDelete)}
                  disabled={isActionBusy}
                  aria-busy={busyAction === 'delete'}
                  className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#D9E2F2] bg-white text-gray500 hover:text-red-500 hover:border-red-200 transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Eliminar propuesta"
                >
                  {busyAction === 'delete' ? <IconSpinner size={13} /> : <IconTrash size={14} />}
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit?.(activity.id)}
                  disabled={isActionBusy}
                  className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#D9E2F2] bg-white text-bluePrimary hover:bg-blue-50 hover:border-bluePrimary/30 transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Editar propuesta"
                >
                  <IconEdit size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AddActivityRow ────────────────────────────────────────────────────────────

function AddActivityRow({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[58px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#AFC4F4] bg-white px-4 py-3 hover:border-bluePrimary/50 hover:bg-[#EEF4FF] transition-colors group"
    >
      <span className="text-gray500 group-hover:text-bluePrimary transition-colors">
        <IconSearch size={16} />
      </span>
      <span className="font-body text-[13px] font-semibold text-gray500 group-hover:text-bluePrimary transition-colors">
        Buscar y proponer actividad
      </span>
    </button>
  )
}

// ── EmptyDayState ─────────────────────────────────────────────────────────────

function EmptyDayState({ onClick }: { onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-bluePrimary/10 flex items-center justify-center mb-3">
        <IconCalendarEmpty size={28} />
      </div>
      <p className="font-body text-sm text-gray500 mb-4">
        No hay actividades para este día aún
      </p>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-white bg-bluePrimary rounded-xl px-4 py-2.5 hover:bg-bluePrimary/90 transition-colors"
      >
        <IconPlus size={14} />
        Agregar primera actividad
      </button>
    </div>
  )
}

// ── ActivitiesBody ────────────────────────────────────────────────────────────

function ActivitiesBody({
  activities,
  currentUserId,
  currentUserRole,
  onAccept,
  onReject,
  onDelete,
  onAddActivity,
  onEdit,
  onManageContext,
  onOpenBudget,
  onOpenVault,
  renderConfirmedActions,
  renderPendingActions,
}: {
  activities: Activity[]
  currentUserId?: string | number | null
  currentUserRole?: 'admin' | 'viajero' | string | null
  onAccept?: (id: string) => void | Promise<void>
  onReject?: (id: string) => void | Promise<void>
  onDelete?: (id: string) => void | Promise<void>
  onAddActivity?: () => void
  onEdit?: (id: string) => void
  onManageContext?: (activity: Activity) => void
  onOpenBudget?: () => void
  onOpenVault?: () => void
  renderConfirmedActions?: (activity: Activity) => ReactNode
  renderPendingActions?: (activity: Activity) => ReactNode
}) {
  const [activeSection, setActiveSection] = useState<'confirmadas' | 'pendientes'>('confirmadas')
  const orderedActivities = sortActivitiesChronologically(activities)
  const conflictActivityIds = getConflictActivityIds(orderedActivities)
  const confirmedActivities = orderedActivities.filter((a) => a.status === 'confirmada')
  const pendingActivities = orderedActivities.filter((a) => a.status === 'pendiente')
  const activitySectionLabel = getSectionLabel('actividad')
  const visibleSection =
    activeSection === 'confirmadas' && confirmedActivities.length === 0 && pendingActivities.length > 0
      ? 'pendientes'
      : activeSection
  const visibleActivities = visibleSection === 'confirmadas' ? confirmedActivities : pendingActivities
  const nowPosition = getTimelineNowPosition(visibleActivities)

  const renderConfirmedTimeline = () =>
    confirmedActivities.length > 0 ? (
      <div className="relative space-y-6">
        <div
          className="absolute bottom-4 left-[89px] top-4 z-0 w-[3px] rounded-full bg-[linear-gradient(180deg,#7A4FD6_0%,#1E6FD9_52%,#7A4FD6_100%)] shadow-[0_0_18px_rgba(122,79,214,0.22)]"
          aria-hidden="true"
        />
        {nowPosition?.type === 'before' && (
          <TimelineNowMarker label={nowPosition.label} timeLabel={nowPosition.timeLabel} />
        )}
        {confirmedActivities.map((a) => (
          <TimelineItem
            key={`confirmed-${a.id}`}
            activity={a}
            hasConflict={conflictActivityIds.has(a.id)}
            isNow={nowPosition?.type === 'on' && nowPosition.activityId === a.id}
          >
            <ActivityCardConfirmed
              activity={a}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onDelete={onDelete}
              onEdit={onEdit}
              onManageContext={onManageContext}
              onOpenBudget={onOpenBudget}
              onOpenVault={onOpenVault}
              actionButtons={renderConfirmedActions?.(a)}
            />
          </TimelineItem>
        ))}
        {nowPosition?.type === 'after' && (
          <TimelineNowMarker label={nowPosition.label} timeLabel={nowPosition.timeLabel} />
        )}
      </div>
    ) : (
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
        <p className="font-body text-xs text-gray500">Aun no hay actividades confirmadas para este dia.</p>
      </div>
    )

  const renderPendingTimeline = () =>
    pendingActivities.length > 0 ? (
      <div className="relative space-y-6">
        <div
          className="absolute bottom-4 left-[89px] top-4 z-0 w-[3px] rounded-full bg-[linear-gradient(180deg,#7A4FD6_0%,#1E6FD9_52%,#7A4FD6_100%)] shadow-[0_0_18px_rgba(122,79,214,0.22)]"
          aria-hidden="true"
        />
        {nowPosition?.type === 'before' && (
          <TimelineNowMarker label={nowPosition.label} timeLabel={nowPosition.timeLabel} />
        )}
        {pendingActivities.map((a) => (
          <TimelineItem
            key={`pending-${a.id}`}
            activity={a}
            hasConflict={conflictActivityIds.has(a.id)}
            isNow={nowPosition?.type === 'on' && nowPosition.activityId === a.id}
          >
            <ActivityCardPending
              activity={a}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onAccept={onAccept}
              onReject={onReject}
              onDelete={onDelete}
              onEdit={onEdit}
              onManageContext={onManageContext}
              onOpenBudget={onOpenBudget}
              onOpenVault={onOpenVault}
              actionButtons={renderPendingActions?.(a)}
            />
          </TimelineItem>
        ))}
        {nowPosition?.type === 'after' && (
          <TimelineNowMarker label={nowPosition.label} timeLabel={nowPosition.timeLabel} />
        )}
      </div>
    ) : (
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
        <p className="font-body text-xs text-gray500">No hay propuestas pendientes para este dia.</p>
      </div>
    )

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#D9E4F7] bg-[#F8FAFF] px-4 py-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_260px]">
          <div className="xl:contents">
            <DaySectionSwitcher
              label="Linea de tiempo confirmada"
              count={confirmedActivities.length}
              accent="blue"
              icon={<IconLayers size={16} />}
              active={visibleSection === 'confirmadas'}
              onClick={() => setActiveSection('confirmadas')}
            />
            <DaySectionSwitcher
              label="Propuestas por confirmar"
              count={pendingActivities.length}
              accent="purple"
              icon={<IconMessageCircle size={16} />}
              active={visibleSection === 'pendientes'}
              onClick={() => setActiveSection('pendientes')}
            />
          </div>
          <div className="w-full">
            <AddActivityRow onClick={onAddActivity} />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionLabel
            emoji={activitySectionLabel.emoji}
            text={visibleSection === 'confirmadas' ? 'CONFIRMADAS' : 'PROPUESTAS POR CONFIRMAR'}
          />
          <span
            className={[
              'rounded-full px-3 py-1 font-body text-[11px] font-semibold',
              visibleSection === 'confirmadas'
                ? 'bg-greenAccent/10 text-greenAccent'
                : 'bg-purpleMedium/10 text-purpleMedium',
            ].join(' ')}
          >
            {visibleSection === 'confirmadas' ? confirmedActivities.length : pendingActivities.length}
          </span>
        </div>
        {visibleSection === 'confirmadas' ? renderConfirmedTimeline() : renderPendingTimeline()}
      </section>
    </div>
  )
}

function DaySectionSwitcher({
  label,
  count,
  accent,
  icon,
  active,
  onClick,
}: {
  label: string
  count: number
  accent: 'blue' | 'purple'
  icon: ReactNode
  active: boolean
  onClick: () => void
}) {
  const styles =
    active
      ? accent === 'blue'
        ? 'border-[#1E6FD9]/35 bg-[#F8FAFF] text-[#1E0A4E] shadow-[0_8px_22px_rgba(30,111,217,0.08)]'
        : 'border-[#7A4FD6]/35 bg-[#FBF8FF] text-[#1E0A4E] shadow-[0_8px_22px_rgba(122,79,214,0.08)]'
      : accent === 'blue'
        ? 'border-[#DCE7FA] bg-white text-[#1E0A4E] hover:border-[#1E6FD9]/40 hover:bg-[#F8FAFF]'
        : 'border-[#E6DBFF] bg-white text-[#1E0A4E] hover:border-[#7A4FD6]/40 hover:bg-[#FBF8FF]'

  const badgeStyles =
    accent === 'blue'
      ? 'bg-[#EEF4FF] text-[#1E6FD9]'
      : 'bg-[#F3EEFF] text-[#7A4FD6]'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[58px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${styles}`}
    >
      <span className="flex items-center gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${badgeStyles}`}>
          {icon}
        </span>
        <span>
          <span className="block font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
            Seccion
          </span>
          <span className="mt-0.5 block font-heading text-sm font-bold">{label}</span>
        </span>
      </span>
      <span className={`rounded-full px-2.5 py-1 font-body text-xs font-semibold ${badgeStyles}`}>
        {count}
      </span>
    </button>
  )
}

function DaySectionModal({
  title,
  subtitle,
  open,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#E2E8F0] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                Vista del día
              </p>
              <h3 className="mt-2 font-heading text-2xl font-bold text-[#1E0A4E]">
                {title}
              </h3>
              <p className="mt-1 font-body text-sm text-[#64748B]">
                {subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#E2E8F0] px-3 py-2 font-body text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
            >
              Cerrar
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── DayView ───────────────────────────────────────────────────────────────────

void DaySectionModal

export const DayView = forwardRef<DayViewHandle, DayViewProps>(function DayView(
  {
    dayNumber,
    date,
    activities,
    defaultExpanded = false,
    isExpanded: controlledExpanded,
    onSelect,
    onAccept,
    onReject,
    onDelete,
    onEdit,
    onAddActivity,
    onManageContext,
    onOpenBudget,
    onOpenVault,
    currentUserId,
    currentUserRole,
    renderConfirmedActions,
    renderPendingActions,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)

  const isControlled = controlledExpanded !== undefined
  const expanded     = isControlled ? controlledExpanded : internalExpanded

  useImperativeHandle(ref, () => ({
    scrollIntoView() {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  }))

  function handleHeaderClick() {
    onSelect?.(dayNumber)
    if (!isControlled) setInternalExpanded((v) => !v)
  }

  const pendingCount = activities.filter((a) => a.status === 'pendiente').length
  const isEmpty      = activities.length === 0

  return (
    <div ref={rootRef} className="rounded-2xl shadow-sm scroll-mt-4">
      {/* ── Header ── */}
      <button
        onClick={handleHeaderClick}
        className={[
          'w-full bg-white flex items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50/80',
          expanded
            ? 'rounded-t-2xl border-b border-[#E2E8F0]'
            : 'rounded-2xl',
          'border border-[#E2E8F0]',
        ].join(' ')}
        aria-expanded={expanded}
      >
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Day badge */}
          <span className="font-body text-[11px] font-bold text-bluePrimary bg-bluePrimary/10 rounded-full px-3 py-1 shrink-0 leading-none">
            DÍA {dayNumber}
          </span>

          <div className="flex flex-col items-start gap-0.5">
            <span className="font-body text-sm font-bold text-gray700 leading-none">
              {date}
            </span>
            <span className="font-body text-[13px] text-gray500 leading-none">
              {isEmpty ? 'Sin actividades' : `${activities.length} actividad${activities.length !== 1 ? 'es' : ''}`}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {pendingCount > 0 && (
            <span className="font-body text-[11px] text-purpleMedium bg-purpleMedium/10 rounded-full px-3 py-1 leading-none">
              {pendingCount} por confirmar
            </span>
          )}
          <span
            className={[
              'text-gray500 transition-transform duration-300',
              expanded ? 'rotate-180' : 'rotate-0',
            ].join(' ')}
            aria-hidden="true"
          >
            <IconChevron size={16} />
          </span>
        </div>
      </button>

      {/* ── Expandable body ── */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? '9999px' : 0 }}
      >
        <div className="bg-white border-x border-b border-[#E2E8F0] rounded-b-2xl px-5 pb-5 pt-4">
          {isEmpty ? (
            <EmptyDayState onClick={() => onAddActivity?.(dayNumber)} />
          ) : (
            <ActivitiesBody
              activities={activities}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onAccept={onAccept}
              onReject={onReject}
              onDelete={onDelete}
              onEdit={onEdit}
              onManageContext={onManageContext}
              onOpenBudget={onOpenBudget}
              onOpenVault={onOpenVault}
              renderConfirmedActions={renderConfirmedActions}
              renderPendingActions={renderPendingActions}
              onAddActivity={() => onAddActivity?.(dayNumber)}
            />
          )}
        </div>
      </div>
    </div>
  )
})
