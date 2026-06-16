import { useMemo, useState } from 'react'
import type { ItineraryDay } from '../../../services/groups'
import type { Group } from '../../../types/groups'

export interface SidebarDashboardProps {
  activeDay: number | null
  days: ItineraryDay[]
  onDayChange: (day: number) => void
  onOpenGroupPanel?: () => void
  onOpenGroupSettings?: () => void
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
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

export function SidebarDashboard({
  activeDay,
  days,
  onDayChange,
  onOpenGroupPanel,
  onOpenGroupSettings,
  group,
}: SidebarDashboardProps) {
  const [itineraryOpen, setItineraryOpen] = useState(false)

  const selectedDay = useMemo(() => {
    if (days.length === 0) return null
    return days.find((day) => day.dayNumber === activeDay) || days[0]
  }, [activeDay, days])

  const totalActivities = useMemo(() => days.reduce((total, day) => total + day.activities.length, 0), [days])
  const canOpenGroupSettings = group?.myRole === 'admin'

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
          isActive ? 'bg-white/15 ring-1 ring-white/15 shadow-[0_10px_22px_rgba(0,0,0,0.14)]' : 'hover:bg-white/10',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`font-body text-sm leading-tight ${isActive ? 'font-bold text-white' : 'font-semibold text-white/70'}`}>
              Dia {day.dayNumber}
            </p>
            <p className={`mt-0.5 truncate font-body text-[13px] leading-tight ${isActive ? 'text-white/70' : 'text-white/40'}`}>
              {day.date}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 font-body text-xs font-semibold ${isActive ? 'bg-greenAccent/20 text-greenAccent' : 'bg-white/10 text-white/45'}`}>
              {count}
            </span>
            {isActive && <span className="h-2 w-2 rounded-full bg-greenAccent" />}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="flex shrink-0 flex-col">
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#1E6FD9]/20 px-2.5 py-1 font-body text-xs font-bold uppercase tracking-widest text-[#BFD7FF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5EA0FF]" />
              Itinerario
            </p>
            <div className="mt-2 flex gap-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-[#1E6FD9]/25 px-2.5 py-1.5">
                <span className="font-heading text-base font-extrabold leading-none text-[#7DC4FF]">{days.length}</span>
                <span className="font-body text-xs font-semibold text-[#BFD7FF]">día{days.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-[#35C56A]/20 px-2.5 py-1.5">
                <span className="font-heading text-base font-extrabold leading-none text-[#6EEEA0]">{totalActivities}</span>
                <span className="font-body text-xs font-semibold text-[#9AF0B8]">actividad{totalActivities !== 1 ? 'es' : ''}</span>
              </div>
            </div>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/60">
            <IconCalendarMini />
          </span>
        </div>

        {selectedDay ? (
          <div className="space-y-2">
            <div>
              {renderDayButton(selectedDay, true)}
            </div>

            <button
              type="button"
              onClick={() => setItineraryOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-body text-sm font-semibold text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <span>{itineraryOpen ? 'Ocultar dias' : 'Ver todos los dias'}</span>
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
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-body text-xs text-white/45">Sin dias disponibles</div>
        )}
      </section>

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#7A4FD6]/25 px-3 py-1 font-body text-xs font-bold uppercase tracking-widest text-[#D8C8FF]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B89BFF]" />
          Panel del grupo
        </p>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onOpenGroupPanel}
            className="flex w-full items-center justify-between rounded-xl border border-white/0 px-3 py-2 text-left transition-all duration-200 hover:border-[#7A4FD6]/35 hover:bg-white/10"
          >
            <p className="font-body text-sm font-semibold leading-tight text-white/85">Miembros e invitaciones</p>
            <span className="font-body text-xs text-white/45">›</span>
          </button>

          {canOpenGroupSettings && (
            <button
              type="button"
              onClick={onOpenGroupSettings}
              className="flex w-full items-center justify-between rounded-xl border border-white/0 px-3 py-2 text-left transition-all duration-200 hover:border-[#35C56A]/30 hover:bg-white/10"
            >
              <div className="min-w-0">
                <p className="font-body text-sm font-semibold leading-tight text-white/85">Configuración</p>
                <p className="mt-0.5 truncate font-body text-[13px] leading-tight text-white/50">Reglas y ajustes del viaje</p>
              </div>
              <span className="font-body text-xs text-white/45">›</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
