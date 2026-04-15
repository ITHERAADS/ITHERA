import { ITINERARY_DAYS } from '../../../mock/itinerary.mock'

// ── Mock budget data ──────────────────────────────────────────────────────────

const BUDGET_ITEMS = [
  { label: 'Vuelos',      amount: '$5,600' },
  { label: 'Hospedaje',   amount: '$6,300' },
  { label: 'Actividades', amount: '$2,300' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SidebarDashboardProps {
  activeDay: number | null
  showDaySelector: boolean
  onDayChange: (day: number) => void
  onToggleDaySelector: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SidebarDashboard({
  activeDay,
  showDaySelector,
  onDayChange,
  onToggleDaySelector,
}: SidebarDashboardProps) {
  const activeItineraryDay =
    activeDay !== null
      ? ITINERARY_DAYS.find((d) => d.dayNumber === activeDay) ?? null
      : null

  return (
    <div className="flex flex-col">
      {/* Section label */}
      <p className="font-body text-[10px] text-white/40 uppercase tracking-widest mb-2">
        Itinerario
      </p>

      {/* Toggle "Ver todos los días" */}
      <button
        onClick={onToggleDaySelector}
        className="w-full flex items-center justify-between bg-white/10 rounded-xl px-4 py-2.5 mb-2 transition-all duration-200 hover:bg-white/15"
      >
        <span className="font-body text-[13px] text-white/70">Ver todos los días</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={`text-white/50 transition-transform duration-200 ${showDaySelector ? 'rotate-180' : ''}`}
        >
          <polyline
            points="6 9 12 15 18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Expandable day list */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: showDaySelector ? '600px' : 0 }}
      >
        <ul className="flex flex-col gap-1 mb-2">
          {ITINERARY_DAYS.map((day) => {
            const isActive = day.dayNumber === activeDay
            const count    = day.activities.length
            return (
              <li key={day.dayNumber}>
                <button
                  onClick={() => onDayChange(day.dayNumber)}
                  className={[
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200',
                    isActive ? 'bg-bluePrimary' : 'hover:bg-white/10',
                  ].join(' ')}
                >
                  <div>
                    <p
                      className={`font-body text-[13px] leading-none ${
                        isActive ? 'font-bold text-white' : 'font-normal text-white/60'
                      }`}
                    >
                      Día {day.dayNumber}
                    </p>
                    <p
                      className={`font-body text-xs mt-0.5 leading-none ${
                        isActive ? 'text-white/70' : 'text-white/40'
                      }`}
                    >
                      {day.date} · {count} actividad{count !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-body text-xs ${isActive ? 'text-white/70' : 'text-white/40'}`}
                    >
                      {count}
                    </span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-greenAccent shrink-0" />
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Active day pill (when selector is closed and a day is selected) */}
      {!showDaySelector && activeItineraryDay !== null && (
        <div className="flex items-center justify-between bg-bluePrimary rounded-xl px-3 py-2.5 mb-2">
          <div>
            <p className="font-body text-[13px] font-bold text-white leading-none">
              Día {activeItineraryDay.dayNumber}
            </p>
            <p className="font-body text-xs text-white/70 mt-0.5 leading-none">
              {activeItineraryDay.date}
            </p>
          </div>
          <button
            onClick={() => onDayChange(activeItineraryDay.dayNumber)}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors shrink-0"
            aria-label="Deseleccionar día"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line
                x1="18" y1="6" x2="6" y2="18"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              />
              <line
                x1="6" y1="6" x2="18" y2="18"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-white/10 mb-4 mt-3" />

      {/* Budget */}
      <p className="font-body text-[10px] text-white/40 uppercase tracking-widest mb-2">
        Presupuesto Grupal
      </p>
      <p className="font-heading font-bold text-white text-2xl leading-none">$14,200</p>
      <p className="font-body text-xs text-white/40 mt-0.5 mb-3">de $24,000 MXN</p>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full"
          style={{ width: '59%', background: 'linear-gradient(90deg, #1E6FD9, #7A4FD6)' }}
        />
      </div>
      <p className="font-body text-[11px] text-white/40 text-right mb-3">59%</p>

      {/* Breakdown */}
      <div className="flex flex-col gap-2">
        {BUDGET_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="font-body text-[11px] text-white/60">{item.label}</span>
            <span className="font-body text-[11px] font-semibold text-white/80">{item.amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
