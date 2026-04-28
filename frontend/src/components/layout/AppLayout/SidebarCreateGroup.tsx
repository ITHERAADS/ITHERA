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
      <p className="font-body text-[10px] text-white/40 uppercase tracking-widest mb-3">
        Proceso de creación
      </p>

      {/* Progress indicator */}
      <div className="mb-4">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full bg-greenAccent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="font-body text-[11px] text-white/40">
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
                'flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200',
                isActive ? 'bg-bluePrimary' : 'bg-white/5',
              ].join(' ')}
            >
              {/* Step circle */}
              <div
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-body text-xs font-bold mt-0.5',
                  isCompleted
                    ? 'bg-greenAccent text-white'
                    : isActive
                    ? 'bg-white text-bluePrimary'
                    : 'bg-white/10 text-white/40',
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
                  className={`font-body text-[13px] font-semibold leading-tight ${
                    isActive ? 'text-white' : isCompleted ? 'text-white/60' : 'text-white/40'
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`font-body text-[11px] mt-0.5 leading-tight ${
                    isActive ? 'text-white/70' : 'text-white/30'
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
