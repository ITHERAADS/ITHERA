// ── Types ─────────────────────────────────────────────────────────────────────

export interface GroupMember {
  id: string
  name: string
  role: 'Organizador' | 'Miembro'
  color: string
  isOnline: boolean
}

export interface SidebarGroupProps {
  members?: GroupMember[]
  onInvite?: () => void
}

// ── Default mock members ──────────────────────────────────────────────────────

const DEFAULT_MEMBERS: GroupMember[] = [
  { id: '1', name: 'Bryan A.',    role: 'Organizador', color: '#1E6FD9', isOnline: true  },
  { id: '2', name: 'Ana L.',      role: 'Miembro',     color: '#35C56A', isOnline: true  },
  { id: '3', name: 'Luis R.',     role: 'Miembro',     color: '#7A4FD6', isOnline: true  },
  { id: '4', name: 'Mariana G.', role: 'Miembro',     color: '#F59E0B', isOnline: false },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function SidebarGroup({ members = DEFAULT_MEMBERS, onInvite }: SidebarGroupProps) {
  const onlineCount = members.filter((m) => m.isOnline).length

  return (
    <div className="flex flex-col gap-4">
      {/* Section label */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-body text-[10px] text-white/40 uppercase tracking-widest">
            Integrantes
          </p>
          <span className="font-body text-[11px] font-semibold text-greenAccent bg-greenAccent/20 rounded-full px-2 py-0.5">
            {onlineCount} en línea
          </span>
        </div>

        {/* Members list */}
        <ul className="flex flex-col gap-2.5">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-2.5">
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-body font-bold text-xs shrink-0"
                style={{ backgroundColor: member.color }}
              >
                {member.name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-semibold text-white truncate leading-none">
                  {member.name}
                </p>
                <p
                  className="font-body text-[11px] mt-0.5 leading-none"
                  style={{ color: member.color }}
                >
                  {member.role}
                </p>
              </div>

              {/* Online indicator */}
              {member.isOnline && (
                <span className="w-2 h-2 rounded-full bg-greenAccent shrink-0" />
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Invite button */}
      <button
        onClick={onInvite}
        className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white rounded-xl px-4 py-2.5 transition-all duration-200 font-body text-[13px] font-medium"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Invitar integrante
      </button>
    </div>
  )
}
