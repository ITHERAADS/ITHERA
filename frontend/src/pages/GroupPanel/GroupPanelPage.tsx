import { useState } from 'react'
import { Navbar } from '../../components/layout/Navbar/Navbar'
import { Sidebar } from '../../components/layout/Sidebar/Sidebar'
import { InviteModal } from '../../components/InviteModal/InviteModal'
import { GroupConfigModal } from '../../components/GroupConfigModal'

type Member = {
  id: number
  initials: string
  name: string
  role: 'Admin' | 'Miembro'
  status: 'Activo' | 'Inactivo'
}

const members: Member[] = [
  { id: 1, initials: 'BA', name: 'Bryan Ayala', role: 'Admin', status: 'Activo' },
  { id: 2, initials: 'CM', name: 'Carlos Mendoza', role: 'Miembro', status: 'Activo' },
  { id: 3, initials: 'AG', name: 'Ana García', role: 'Miembro', status: 'Activo' },
  { id: 4, initials: 'LF', name: 'Luis Fernández', role: 'Miembro', status: 'Inactivo' },
  { id: 5, initials: 'ST', name: 'Sofía Torres', role: 'Miembro', status: 'Activo' },
]

const sidebarItems = [
  { href: '/grupo', label: 'Panel del grupo' },
  { href: '/grupo/miembros', label: 'Miembros' },
  { href: '/grupo/configuracion', label: 'Configuración' },
]

export function GroupPanelPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)

  const inviteLink = 'https://ithera.app/invite/abc123xyz'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('No se pudo copiar el enlace', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <Navbar
        variant="dashboard"
        trip={{ name: 'Cancún 2025', subtitle: 'Riviera Maya, México' }}
        user={{ name: 'Bryan A.', role: 'Organizador', initials: 'BA', color: '#1E6FD9' }}
        notificationCount={3}
        isOnline
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <Sidebar
        navItems={sidebarItems}
        activeHref="/grupo"
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <main
        className={`px-4 pb-10 pt-24 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <section className="rounded-[28px] bg-white p-6 shadow-sm md:p-8">
            <h1 className="mb-5 text-[32px] font-bold text-[#0D1117]">
              Invitar al grupo
            </h1>

            <div className="mb-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={inviteLink}
                readOnly
                className="h-12 flex-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm text-[#3D4A5C] outline-none"
              />

              <button
                type="button"
                onClick={handleCopy}
                className="h-12 rounded-xl bg-[#1E6FD9] px-5 text-sm font-medium text-white transition hover:bg-[#2C8BE6]"
              >
                Copiar enlace
              </button>
            </div>

            <div className="mb-6 text-sm text-[#35C56A]">
              {copied ? '¡Enlace copiado!' : ' '}
            </div>

            <div className="border-t border-[#E2E8F0] pt-6">
              <h2 className="mb-5 text-2xl font-bold text-[#0D1117]">
                Miembros del grupo
              </h2>

              <div className="space-y-5">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-2xl px-3 py-2"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#7A4FD6] to-[#1E6FD9] text-sm font-bold text-white shadow-sm">
                        {member.initials}
                      </div>

                      <div>
                        <p className="font-medium text-[#0D1117]">{member.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              member.role === 'Admin'
                                ? 'bg-[#1E6FD9] text-white'
                                : 'text-[#7A8799]'
                            }`}
                          >
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-[#7A8799]">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          member.status === 'Activo' ? 'bg-[#35C56A]' : 'bg-[#CBD5E1]'
                        }`}
                      />
                      {member.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="h-12 rounded-xl bg-[#F8FAFC] text-sm font-medium text-[#3D4A5C] transition hover:bg-[#EEF2F7]"
              >
                Invitar miembro
              </button>

              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="h-12 rounded-xl bg-[#F8FAFC] text-sm font-medium text-[#3D4A5C] transition hover:bg-[#EEF2F7]"
              >
                Configurar grupo
              </button>
            </div>

            <button
              type="button"
              className="mt-5 h-12 w-full rounded-xl bg-[#1E6FD9] text-sm font-semibold text-white transition hover:bg-[#2C8BE6]"
            >
              Ver itinerario del viaje
            </button>
          </section>

          <aside className="rounded-[28px] bg-white p-5 shadow-sm">
            <div className="overflow-hidden rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80"
                alt="Cancún 2025"
                className="h-56 w-full object-cover"
              />
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A8799]">
                Resumen del grupo
              </p>

              <h2 className="mt-2 text-[28px] font-bold text-[#0D1117]">
                Cancún 2025
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Riviera Maya, México
              </p>

              <p className="mt-4 text-sm leading-6 text-[#475467]">
                Este grupo fue creado para organizar el viaje a Cancún. Aquí puedes
                invitar nuevos integrantes, revisar quiénes ya forman parte del
                grupo y administrar la configuración general del viaje.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        inviteLink={inviteLink}
        members={members.map(({ id, initials, name, role }) => ({
          id,
          initials,
          name,
          role,
        }))}
      />

      <GroupConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  )
}