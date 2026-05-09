import { useMemo, useState } from 'react'
import type { ItineraryDay } from '../../../services/groups'
import type { Group } from '../../../types/groups'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SidebarDashboardProps {
  activeDay: number | null
  days: ItineraryDay[]
  onDayChange: (day: number) => void
  onOpenGroupPanel?: () => void
  group?: Group | null
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCalendarMini() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SidebarDashboard({
  activeDay,
  days,
  onDayChange,
  onOpenGroupPanel,
  group,
}: SidebarDashboardProps) {
  const [itineraryOpen, setItineraryOpen] = useState(false)
  const destinationImage = group?.destino_photo_url
  const destinationLabel = group?.destino || group?.destino_formatted_address || 'Destino pendiente'

  const selectedDay = useMemo(() => {
    if (days.length === 0) return null
    return days.find((day) => day.dayNumber === activeDay) || days[0]
  }, [activeDay, days])

  const totalActivities = useMemo(
    () => days.reduce((total, day) => total + day.activities.length, 0),
    [days]
  )

  const renderDayButton = (day: ItineraryDay, compact = false) => {
    const isActive = day.dayNumber === selectedDay?.dayNumber
    const count = day.activities.length

    return (
      <button
        type="button"
        onClick={() => {
          onDayChange(day.dayNumber)
          setItineraryOpen(false)
        }}
        className={[
          'w-full rounded-xl text-left transition-all duration-200',
          compact ? 'px-3 py-2' : 'px-3 py-2.5',
          isActive
            ? 'bg-white/14 ring-1 ring-white/15 shadow-[0_10px_22px_rgba(0,0,0,0.14)]'
            : 'hover:bg-white/10',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`font-body text-[13px] leading-tight ${isActive ? 'font-bold text-white' : 'font-semibold text-white/70'}`}>
              Día {day.dayNumber}
            </p>
            <p className={`mt-0.5 truncate font-body text-[11px] leading-tight ${isActive ? 'text-white/70' : 'text-white/40'}`}>
              {day.date}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 font-body text-[10px] font-semibold ${
                isActive ? 'bg-greenAccent/20 text-greenAccent' : 'bg-white/10 text-white/45'
              }`}
            >
              {count}
            </span>
            {isActive && <span className="h-2 w-2 rounded-full bg-greenAccent" />}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Destination cover */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_25px_rgba(0,0,0,0.16)]">
        <div className="relative h-28 w-full overflow-hidden bg-white/10">
          {destinationImage ? (
            <img
              src={destinationImage}
              alt={destinationLabel}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E6FD9]/60 via-[#7A4FD6]/50 to-[#1E0A4E]">
              <span className="font-heading text-3xl font-bold text-white/80">
                {(group?.nombre || 'V')[0]}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E0A4E]/90 via-[#1E0A4E]/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <p className="truncate font-heading text-sm font-bold leading-tight text-white">
              {group?.nombre || 'Viaje activo'}
            </p>
            <p className="mt-0.5 line-clamp-2 font-body text-[11px] leading-tight text-white/70">
              {destinationLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Itinerary summary */}
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="font-body text-[10px] uppercase tracking-widest text-white/40">
              Itinerario
            </p>
            <p className="mt-0.5 font-body text-[11px] text-white/45">
              {days.length} día{days.length !== 1 ? 's' : ''} · {totalActivities} actividad{totalActivities !== 1 ? 'es' : ''}
            </p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/60">
            <IconCalendarMini />
          </span>
        </div>

        {selectedDay ? (
          <div className="space-y-2">
            <div>
              <p className="mb-1.5 font-body text-[10px] font-semibold uppercase tracking-wide text-white/35">
                Día seleccionado
              </p>
              {renderDayButton(selectedDay, true)}
            </div>

            <button
              type="button"
              onClick={() => setItineraryOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-body text-[12px] font-semibold text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <span>{itineraryOpen ? 'Ocultar días' : 'Ver todos los días'}</span>
              <IconChevron open={itineraryOpen} />
            </button>

            {itineraryOpen && (
              <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {days.map((day) => (
                  <li key={day.dayNumber}>{renderDayButton(day, true)}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-body text-xs text-white/45">
            Sin días disponibles
          </div>
        )}
      </section>

      {/* Group panel */}
      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="mb-2 font-body text-[10px] uppercase tracking-widest text-white/40">
          Panel del grupo
        </p>

        <button
          type="button"
          onClick={onOpenGroupPanel}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/10"
        >
          <div>
            <p className="font-body text-[13px] font-semibold leading-none text-white/70">
              Configuración
            </p>
            <p className="mt-0.5 font-body text-xs leading-none text-white/40">
              Miembros y ajustes
            </p>
          </div>
          <span className="font-body text-xs text-white/40">›</span>
        </button>
      </div>
    </div>
  )
}
