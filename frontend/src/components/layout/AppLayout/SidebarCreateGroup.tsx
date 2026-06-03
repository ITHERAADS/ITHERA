// ── Props ─────────────────────────────────────────────────────────────────────

export interface SidebarCreateGroupProps {
  currentStep?: 1 | 2 | 3
}

// ── Step data ─────────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1 as const, label: 'Nombre del viaje', description: 'Ponle un nombre a tu aventura' },
  { number: 2 as const, label: 'Fechas',            description: 'Elige cuándo viajar'          },
  { number: 3 as const, label: 'Invitar miembros',  description: 'Agrega a tu grupo'            },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function SidebarCreateGroup({ currentStep = 1 }: SidebarCreateGroupProps) {
  const completedSteps = currentStep - 1
  const progress = Math.round((completedSteps / STEPS.length) * 100)

  return (
    <div className="flex flex-col">
      {/* Section label */}
      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#7A4FD6]/25 px-3 py-1.5 font-body text-xs font-extrabold uppercase tracking-[0.16em] text-[#D8C8FF]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#B89BFF]" />
        Proceso de creación
      </p>

      {/* Progress indicator */}
      <div className="mb-5 rounded-3xl border border-white/15 bg-white/10 p-4">
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#B89BFF,#2C8BE6)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="font-body text-sm font-bold text-white/70">
          Paso {currentStep} de {STEPS.length}
        </p>
      </div>

      {/* Steps list */}
      <div className="flex flex-col gap-2">
        {STEPS.map((step) => {
          const isActive    = step.number === currentStep
          const isCompleted = step.number < currentStep

          return (
            <div
              key={step.number}
              className={[
                'flex items-start gap-3 rounded-2xl px-3 py-3.5 transition-all duration-200',
                isActive ? 'border border-white/20 bg-white text-[#1E0A4E] shadow-[0_12px_26px_rgba(0,0,0,0.16)]' : 'border border-white/10 bg-white/5',
              ].join(' ')}
            >
              {/* Step circle */}
              <div
                className={[
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl font-body text-sm font-extrabold',
                  isCompleted
                    ? 'bg-[#35C56A] text-white'
                    : isActive
                    ? 'bg-[#F3EEFF] text-[#7A4FD6]'
                    : 'bg-white/10 text-white/55',
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <polyline
                      points="20 6 9 17 4 12"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </div>

              {/* Step text */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-body text-base font-extrabold leading-tight ${
                    isActive ? 'text-[#1E0A4E]' : isCompleted ? 'text-white/75' : 'text-white/60'
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`mt-1 font-body text-sm font-medium leading-tight ${
                    isActive ? 'text-[#64748B]' : 'text-white/45'
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
