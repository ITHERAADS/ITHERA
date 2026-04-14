import type { User, NavItem } from '../../../types'
import { Avatar } from '../../ui/Avatar'
import { Logo } from '../../ui/Logo'

export interface NavbarProps {
  user?: User
  navLinks?: NavItem[]
  onLogout?: () => void
  onAvatarClick?: () => void
}

export function Navbar({
  user,
  navLinks = [],
  onLogout,
  onAvatarClick,
}: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-primary-dark flex items-center px-6 shadow-md">
      {/* Logo */}
      <Logo variant="white" height={40} />

      {/* Nav links */}
      {navLinks.length > 0 && (
        <ul className="hidden md:flex items-center gap-6 ml-8 list-none m-0 p-0">
          {navLinks.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="font-body text-sm text-white/80 hover:text-white transition-colors duration-150"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* User section */}
      <div className="ml-auto flex items-center gap-3">
        {user && (
          <>
            <span className="font-body text-sm text-white hidden lg:block">{user.name}</span>
            <button
              onClick={onAvatarClick}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
              aria-label="Perfil de usuario"
            >
              <Avatar src={user.avatarUrl} name={user.name} size="sm" />
            </button>
          </>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="font-body text-xs text-white/70 hover:text-white transition-colors duration-150 ml-1"
          >
            Salir
          </button>
        )}
      </div>
    </nav>
  )
}
