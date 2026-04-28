import type { NavItem } from '../../../types'

export interface SidebarProps {
  navItems: NavItem[]
  activeHref?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: (href: string) => void
  className?: string
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function Sidebar({
  navItems,
  activeHref,
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
  className = '',
}: SidebarProps) {
  return (
    <aside
      className={[
        'fixed left-0 top-16 z-40 flex flex-col bg-primary-dark',
        'h-[calc(100vh-4rem)] transition-all duration-300 shadow-lg',
        isCollapsed ? 'w-16' : 'w-64',
        className,
      ].join(' ')}
    >
      {/* Toggle button */}
      {onToggleCollapse && (
        <div className="flex justify-end px-2 pt-3">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>
      )}

      {/* Nav items */}
      <ul className="flex flex-col gap-1 px-2 pt-2 flex-1 list-none m-0 overflow-hidden">
        {navItems.map((item) => {
          const isActive = item.href === activeHref
          return (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault()
                    onNavigate(item.href)
                  }
                }}
                className={[
                  'flex items-center px-3 py-2.5 rounded-lg transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  isActive
                    ? 'bg-blue text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon && (
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {item.icon}
                  </span>
                )}
                <span
                  className={[
                    'font-body text-sm whitespace-nowrap transition-all duration-300 overflow-hidden',
                    item.icon ? 'ml-3' : '',
                    isCollapsed ? 'w-0 opacity-0' : 'opacity-100',
                  ].join(' ')}
                >
                  {item.label}
                </span>
                {!isCollapsed && item.badge !== undefined && (
                  <span className="ml-auto bg-blue/80 text-white text-xs font-body font-medium rounded-full px-1.5 py-0.5">
                    {item.badge}
                  </span>
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
