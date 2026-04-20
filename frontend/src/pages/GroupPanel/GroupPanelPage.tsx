import { useState, useRef, useEffect } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { InviteModal } from '../../components/InviteModal/InviteModal'
import { GroupConfigModal } from '../../components/GroupConfigModal'

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  id: number
  initials: string
  name: string
  role: 'Admin' | 'Miembro'
  status: 'Activo' | 'Inactivo'
}

type Tab = 'panel' | 'miembros' | 'configuracion'

// ── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_MEMBERS: Member[] = [
  { id: 1, initials: 'BA', name: 'Bryan Ayala',    role: 'Admin',   status: 'Activo'   },
  { id: 2, initials: 'CM', name: 'Carlos Mendoza', role: 'Miembro', status: 'Activo'   },
  { id: 3, initials: 'AG', name: 'Ana García',     role: 'Miembro', status: 'Activo'   },
  { id: 4, initials: 'LF', name: 'Luis Fernández', role: 'Miembro', status: 'Inactivo' },
  { id: 5, initials: 'ST', name: 'Sofía Torres',   role: 'Miembro', status: 'Activo'   },
]

const CURRENT_USER_NAME = 'Bryan Ayala'

const TABS: { id: Tab; label: string }[] = [
  { id: 'panel',         label: 'Panel del grupo' },
  { id: 'miembros',      label: 'Miembros'        },
  { id: 'configuracion', label: 'Configuración'   },
]

const INVITE_LINK = 'https://ithera.app/invite/abc123xyz'

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDots() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5"  cy="12" r="1.5"/>
      <circle cx="12" cy="12" r="1.5"/>
      <circle cx="19" cy="12" r="1.5"/>
    </svg>
  )
}

function IconCamera() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function IconCopy() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconUserPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="17" y1="11" x2="23" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

// ── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isCurrentUser,
  onToggleRole,
  onRemove,
}: {
  member: Member
  isCurrentUser: boolean
  onToggleRole: (id: number) => void
  onRemove: (id: number) => void
}) {
  const [open,       setOpen]       = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="flex items-center justify-between rounded-2xl px-3 py-2.5 hover:bg-[#F8FAFC] transition-colors">
      {/* Avatar + name + role */}
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#7A4FD6] to-[#1E6FD9] text-sm font-bold text-white shadow-sm shrink-0">
          {member.initials}
        </div>
        <div>
          <p className="font-body font-semibold text-[#1E0A4E] text-sm">{member.name}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                member.role === 'Admin'
                  ? 'bg-[#1E6FD9] text-white'
                  : 'bg-[#F0EEF8] text-[#7A4FD6]'
              }`}
            >
              {member.role}
            </span>
          </div>
        </div>
      </div>

      {/* Status + 3-dot menu */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-body text-sm text-[#7A8799]">
          <span className={`h-2 w-2 rounded-full ${member.status === 'Activo' ? 'bg-[#35C56A]' : 'bg-[#CBD5E1]'}`} />
          {member.status}
        </div>

        {!isCurrentUser && (
          <div ref={ref} className="relative">
            <button
              onClick={() => { setOpen((o) => !o); setConfirming(false) }}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[#1E0A4E]/40 hover:text-[#1E0A4E] hover:bg-[#E2E8F0] transition-colors"
              aria-label="Opciones del miembro"
            >
              <IconDots />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-30">
                {!confirming ? (
                  <>
                    <button
                      onClick={() => { onToggleRole(member.id); setOpen(false) }}
                      className="w-full text-left px-4 py-2.5 font-body text-sm text-[#1E0A4E] hover:bg-[#F8FAFC] transition-colors"
                    >
                      Cambiar rol
                    </button>
                    <div className="h-px bg-[#E2E8F0] mx-3" />
                    <button
                      onClick={() => setConfirming(true)}
                      className="w-full text-left px-4 py-2.5 font-body text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                    >
                      Eliminar del grupo
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-3 flex flex-col gap-2">
                    <p className="font-body text-xs text-[#1E0A4E]/60">¿Eliminar a {member.name}?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onRemove(member.id); setOpen(false); setConfirming(false) }}
                        className="flex-1 bg-[#EF4444] text-white font-body text-xs font-semibold rounded-lg py-1.5 hover:bg-[#dc2626] transition-colors"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        className="flex-1 border border-[#E2E8F0] text-[#1E0A4E]/60 font-body text-xs font-semibold rounded-lg py-1.5 hover:bg-[#F8FAFC] transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── GroupPanelPage ────────────────────────────────────────────────────────────

export function GroupPanelPage() {
  const [members,           setMembers]           = useState<Member[]>(INITIAL_MEMBERS)
  const [tab,               setTab]               = useState<Tab>('panel')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [copied,            setCopied]            = useState(false)
  const [photo,             setPhoto]             = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(INVITE_LINK)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard not available
    }
  }

  function handleToggleRole(id: number) {
    setMembers((prev) =>
      prev.map((m) => m.id === id ? { ...m, role: m.role === 'Admin' ? 'Miembro' : 'Admin' } : m)
    )
  }

  function handleRemove(id: number) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(URL.createObjectURL(file))
  }

  // ── Right panel ─────────────────────────────────────────────────────────────
  const rightPanel = (
    <div className="flex flex-col gap-4">
      {/* Group image */}
      <div className="overflow-hidden rounded-2xl relative">
        {photo ? (
          <img src={photo} alt="Foto del grupo" className="h-48 w-full object-cover" />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"
            alt="Cancún 2025"
            className="h-48 w-full object-cover"
          />
        )}
      </div>
      <button
        onClick={() => photoRef.current?.click()}
        className="flex items-center gap-1.5 font-body text-xs font-semibold text-[#1E6FD9] hover:underline transition-colors self-start"
      >
        <IconCamera />
        Cambiar foto
      </button>
      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

      {/* Summary */}
      <div className="border-t border-[#E2E8F0] pt-4">
        <p className="font-body text-[10px] font-semibold uppercase tracking-widest text-[#1E0A4E]/40">
          Resumen del grupo
        </p>
        <h2 className="font-heading font-bold text-[#1E0A4E] text-xl mt-2">Cancún 2025</h2>
        <p className="font-body text-xs text-[#1E0A4E]/50 mt-0.5">Riviera Maya, México</p>
        <p className="font-body text-sm text-[#475467] mt-3 leading-relaxed">
          Grupo creado para organizar el viaje a Cancún. Invita integrantes, revisa miembros y administra la configuración general del viaje.
        </p>
      </div>
    </div>
  )

  // ── Tab content ──────────────────────────────────────────────────────────────
  const panelTab = (
    <div className="flex flex-col gap-6">
      {/* Invite section */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
        <h2 className="font-heading font-bold text-[#1E0A4E] text-lg mb-4">Invitar al grupo</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={INVITE_LINK}
            readOnly
            className="flex-1 h-11 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 font-body text-sm text-[#1E0A4E]/60 outline-none"
          />
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#1E6FD9] px-5 font-body text-sm font-semibold text-white hover:bg-[#1a5fc2] transition-colors shrink-0"
          >
            <IconCopy />
            {copied ? '¡Copiado!' : 'Copiar enlace'}
          </button>
        </div>
        {copied && <p className="font-body text-xs text-[#35C56A] mt-2">¡Enlace copiado al portapapeles!</p>}
      </div>

      {/* Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E2E8F0] bg-white font-body text-sm font-medium text-[#1E0A4E] hover:bg-[#F8FAFC] transition-colors shadow-sm"
        >
          <IconUserPlus />
          Invitar miembro
        </button>
        <button
          onClick={() => setIsConfigModalOpen(true)}
          className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E2E8F0] bg-white font-body text-sm font-medium text-[#1E0A4E] hover:bg-[#F8FAFC] transition-colors shadow-sm"
        >
          <IconSettings />
          Configurar grupo
        </button>
      </div>

      <button className="h-11 w-full rounded-xl bg-[#1E6FD9] font-body text-sm font-semibold text-white hover:bg-[#1a5fc2] transition-colors shadow-sm">
        Ver itinerario del viaje
      </button>
    </div>
  )

  const miembrosTab = (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading font-bold text-[#1E0A4E] text-lg">
          Miembros del grupo
          <span className="ml-2 font-body text-sm font-normal text-[#1E0A4E]/40">({members.length})</span>
        </h2>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-1.5 font-body text-sm font-semibold text-[#1E6FD9] hover:underline"
        >
          <IconUserPlus />
          Invitar
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isCurrentUser={member.name === CURRENT_USER_NAME}
            onToggleRole={handleToggleRole}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  )

  const configTab = (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 flex flex-col gap-4">
      <h2 className="font-heading font-bold text-[#1E0A4E] text-lg">Configuración del grupo</h2>
      <p className="font-body text-sm text-[#1E0A4E]/50">
        Gestiona el nombre, descripción y preferencias del grupo.
      </p>
      <button
        onClick={() => setIsConfigModalOpen(true)}
        className="flex items-center gap-2 w-full sm:w-auto h-11 rounded-xl bg-[#1E6FD9] px-6 font-body text-sm font-semibold text-white hover:bg-[#1a5fc2] transition-colors self-start"
      >
        <IconSettings />
        Abrir configuración
      </button>
    </div>
  )

  return (
    <AppLayout
      trip={{ name: 'Cancún 2025', subtitle: 'Riviera Maya, México', dates: '12–19 Jun', people: '5 personas' }}
      user={{ name: 'Bryan A.', role: 'Organizador', initials: 'BA', color: '#1E6FD9' }}
      notificationCount={3}
      isOnline
      showTripSelector={false}
      showRightPanel={false}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="font-heading font-bold text-2xl text-[#1E0A4E] mb-6">Panel del grupo</h1>

          {/* Horizontal tabs */}
          <div className="flex gap-6 border-b border-[#E2E8F0] mb-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={[
                  'pb-3 font-body text-sm font-semibold transition-colors border-b-2 -mb-px',
                  tab === t.id
                    ? 'border-[#1E6FD9] text-[#1E6FD9]'
                    : 'border-transparent text-[#6B7280] hover:text-[#1E0A4E]',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content grid */}
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <div>
              {tab === 'panel'         && panelTab}
              {tab === 'miembros'      && miembrosTab}
              {tab === 'configuracion' && configTab}
            </div>

            {/* Right: group summary always visible */}
            <aside className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5">
              {rightPanel}
            </aside>
          </div>
        </div>
      </div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        inviteLink={INVITE_LINK}
        members={members.map(({ id, initials, name, role }) => ({ id, initials, name, role }))}
      />
      <GroupConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </AppLayout>
  )
}
