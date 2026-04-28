import type { ItineraryDay } from '../../../services/groups'

// ── Mock budget data ──────────────────────────────────────────────────────────

const BUDGET_ITEMS = [
  { label: 'Vuelos',      amount: '$5,600' },
  { label: 'Hospedaje',   amount: '$6,300' },
  { label: 'Actividades', amount: '$2,300' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SidebarDashboardProps {
  activeDay: number | null
  days: ItineraryDay[]
  onDayChange: (day: number) => void
  onOpenGroupPanel?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SidebarDashboard({
  activeDay,
  days,
  onDayChange,
  onOpenGroupPanel,
}: SidebarDashboardProps) {
  return (
    <div className="flex flex-col">
      {/* Section label */}
      <p className="font-body text-[10px] text-white/40 uppercase tracking-widest mb-2">
        Itinerario
      </p>

      {/* Day list — real itinerary data */}
      <ul className="flex flex-col gap-1 mb-2">
        {days.length === 0 ? (
          <li className="px-3 py-2.5 font-body text-xs text-white/40">
            Sin días disponibles
          </li>
        ) : (
          days.map((day) => {
            const isActive = day.dayNumber === activeDay
            const count = day.activities.length

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
          })
        )}
      </ul>

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

      {/* Divider */}
      <div className="border-t border-white/10 mb-4 mt-4" />

      {/* Group panel */}
      <p className="font-body text-[10px] text-white/40 uppercase tracking-widest mb-2">
        Panel del grupo
      </p>

      <button
        onClick={onOpenGroupPanel}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:bg-white/10"
      >
        <div>
          <p className="font-body text-[13px] leading-none font-semibold text-white/70">
            Configuración
          </p>
          <p className="font-body text-xs mt-0.5 leading-none text-white/40">
            Miembros y ajustes
          </p>
        </div>
        <span className="font-body text-xs text-white/40">›</span>
      </button>
    </div>
  )
}
