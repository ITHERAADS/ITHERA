// ── Types ─────────────────────────────────────────────────────────────────────

export interface HelpTip {
  icon: string
  title: string
  description: string
}

export interface HelpLink {
  label: string
  href: string
}

export interface RightPanelHelpProps {
  tips?: HelpTip[]
  links?: HelpLink[]
  pageContext?: string
}

// ── Default content ───────────────────────────────────────────────────────────

const DEFAULT_TIPS: HelpTip[] = [
  {
    icon: '✈️',
    title: 'Agrega actividades',
    description: 'Propone vuelos, hoteles y actividades para que el grupo vote.',
  },
  {
    icon: '👥',
    title: 'Invita a tu grupo',
    description: 'Comparte el link de invitación para que todos puedan colaborar.',
  },
  {
    icon: '💬',
    title: 'Coordínense en el chat',
    description: 'Usa el chat grupal para coordinarte en tiempo real con el equipo.',
  },
]

const DEFAULT_LINKS: HelpLink[] = [
  { label: 'Centro de ayuda',       href: '#help'     },
  { label: 'Tutorial en video',     href: '#tutorial' },
  { label: 'Contactar soporte',     href: '#support'  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function RightPanelHelp({
  tips  = DEFAULT_TIPS,
  links = DEFAULT_LINKS,
  pageContext,
}: RightPanelHelpProps) {
  return (
    <>
      {/* Header */}
      <section className="shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-bluePrimary/10 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-bluePrimary" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-body text-[10px] font-semibold text-gray500 uppercase tracking-widest leading-none">
              Ayuda contextual
            </p>
            {pageContext && (
              <p className="font-body text-[11px] text-gray500 mt-0.5 leading-none">
                {pageContext}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="flex-1">
        <div className="flex flex-col gap-3">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-white border border-[#E2E8F0] rounded-xl px-4 py-3"
            >
              <span className="text-xl shrink-0 leading-none mt-0.5">{tip.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-semibold text-gray700 leading-tight">
                  {tip.title}
                </p>
                <p className="font-body text-[11px] text-gray500 mt-0.5 leading-relaxed">
                  {tip.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-[#E2E8F0] shrink-0" />

      {/* Links */}
      <section className="shrink-0">
        <p className="font-body text-[10px] font-semibold text-gray500 uppercase tracking-widest mb-3">
          Recursos
        </p>
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="flex items-center gap-2 font-body text-[13px] text-bluePrimary hover:underline"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  />
                  <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
