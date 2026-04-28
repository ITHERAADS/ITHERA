import { useState, useRef, useImperativeHandle, forwardRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Activity {
  id: string
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
}

export interface DayViewProps {
  dayNumber: number
  date: string
  activities: Activity[]
  isActive?: boolean
  defaultExpanded?: boolean
  isExpanded?: boolean
  onSelect?: (dayNumber: number) => void
  onAccept?: (activityId: string) => void
  onDelete?: (activityId: string) => void
  onEdit?: (activityId: string) => void
  onAddActivity?: (dayNumber: number) => void
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

function formatPrice(price: number, currency: string): string {
  return `$${price.toLocaleString('es-MX')} ${currency}`
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

// ── ActivityCardConfirmed ─────────────────────────────────────────────────────

function ActivityCardConfirmed({ activity }: { activity: Activity }) {
  const iconColor = getCategoryColor(activity.category)

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden mb-3">
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
        {/* Price badge */}
        <span className="absolute top-3 right-3 font-body text-xs font-semibold text-white bg-[#1E0A4E]/70 backdrop-blur-sm rounded-full px-3 py-1">
          {formatPrice(activity.price, activity.currency)} / pers.
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
        </div>

        {/* Confirmation status */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-greenAccent shrink-0" />
          <span className="font-body text-xs text-greenAccent font-medium">
            Reservación confirmada
          </span>
        </div>
      </div>
    </div>
  )
}

// ── ActivityCardPending ───────────────────────────────────────────────────────

function ActivityCardPending({ activity, onAccept, onDelete, onEdit }: { activity: Activity; onAccept?: (id: string) => void; onDelete?: (id: string) => void; onEdit?: (id: string) => void }) {
  const iconColor = getCategoryColor(activity.category)

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-[#E2E8F0] overflow-hidden mb-3">
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
        {/* Price badge */}
        <span className="absolute top-3 right-3 font-body text-xs font-semibold text-white bg-[#1E0A4E]/70 backdrop-blur-sm rounded-full px-3 py-1">
          {formatPrice(activity.price, activity.currency)} / pers.
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

        {/* Accept / Delete row */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onAccept?.(activity.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 font-body text-sm font-bold text-white bg-bluePrimary rounded-xl h-11 hover:bg-bluePrimary/90 transition-colors"
          >
            <IconCheck size={12} />
            Aceptar propuesta
          </button>
          <button
            onClick={() => onDelete?.(activity.id)}
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-gray500 hover:text-red-500 hover:border-red-200 transition-colors shrink-0"
            aria-label="Eliminar propuesta"
          >
            <IconTrash size={14} />
          </button>
          <button
            onClick={() => onEdit?.(activity.id)}
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-bluePrimary hover:bg-blue-50 hover:border-bluePrimary/30 transition-colors shrink-0"
            aria-label="Editar propuesta"
          >
            <IconEdit size={14} />
          </button>
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
      className="w-full bg-surface border border-dashed border-purpleMedium/30 rounded-2xl h-14 flex items-center justify-center gap-2 hover:border-bluePrimary/50 hover:bg-[#EEF4FF] transition-colors group"
    >
      <span className="text-gray500 group-hover:text-bluePrimary transition-colors">
        <IconSearch size={16} />
      </span>
      <span className="font-body text-[13px] text-gray500 group-hover:text-bluePrimary transition-colors">
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
  onAccept,
  onDelete,
  onAddActivity,
  onEdit,
}: {
  activities: Activity[]
  onAccept?: (id: string) => void
  onDelete?: (id: string) => void
  onAddActivity?: () => void
  onEdit?: (id: string) => void
}) {
  const transport = activities.filter((a) => a.category === 'transporte')
  const lodging   = activities.filter((a) => a.category === 'hospedaje')
  const acts      = activities.filter((a) => a.category === 'actividad')

  return (
    <div>
      {transport.length > 0 && (
        <section>
          <SectionLabel {...getSectionLabel('transporte')} />
          {transport.map((a) =>
            a.status === 'confirmada'
              ? <ActivityCardConfirmed key={a.id} activity={a} />
              : <ActivityCardPending   key={a.id} activity={a} onAccept={onAccept} onDelete={onDelete} onEdit={onEdit} />
          )}
        </section>
      )}

      {lodging.length > 0 && (
        <section>
          <SectionLabel {...getSectionLabel('hospedaje')} />
          {lodging.map((a) =>
            a.status === 'confirmada'
              ? <ActivityCardConfirmed key={a.id} activity={a} />
              : <ActivityCardPending   key={a.id} activity={a} onAccept={onAccept} onDelete={onDelete} onEdit={onEdit} />
          )}
        </section>
      )}

      {acts.length > 0 && (
        <section>
          <SectionLabel {...getSectionLabel('actividad')} />
          {acts.map((a) =>
            a.status === 'confirmada'
              ? <ActivityCardConfirmed key={a.id} activity={a} />
              : <ActivityCardPending   key={a.id} activity={a} onAccept={onAccept} onDelete={onDelete} onEdit={onEdit} />
          )}
        </section>
      )}

      <AddActivityRow onClick={onAddActivity} />
    </div>
  )
}

// ── DayView ───────────────────────────────────────────────────────────────────

export const DayView = forwardRef<DayViewHandle, DayViewProps>(function DayView(
  {
    dayNumber,
    date,
    activities,
    defaultExpanded = false,
    isExpanded: controlledExpanded,
    onSelect,
    onAccept,
    onDelete,
    onEdit,
    onAddActivity,
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
              onAccept={onAccept}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddActivity={() => onAddActivity?.(dayNumber)}
            />
          )}
        </div>
      </div>
    </div>
  )
})
