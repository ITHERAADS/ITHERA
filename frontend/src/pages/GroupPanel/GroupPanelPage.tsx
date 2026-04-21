import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { InviteModal } from '../../components/InviteModal/InviteModal'
import { useAuth } from '../../context/useAuth'
import {
  getCurrentGroup,
  groupsService,
  saveCurrentGroup,
} from '../../services/groups'
import type { Group, GroupMember } from '../../types/groups'

type InviteMember = {
  id: number
  initials: string
  name: string
  role: 'Admin' | 'Miembro'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return 'Sin fechas definidas'
  return `${start || '—'} → ${end || '—'}`
}

export function GroupPanelPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accessToken, localUser } = useAuth()

  const [group, setGroup] = useState<Group | null>(getCurrentGroup())
  const [members, setMembers] = useState<GroupMember[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const [qrBase64, setQrBase64] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  const groupId = searchParams.get('groupId') || group?.id || ''

  useEffect(() => {
    if (!accessToken || !groupId) {
      setLoading(false)
      setError('No se recibió un groupId válido')
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        setError('')

        const currentGroup = getCurrentGroup()

        if (currentGroup && currentGroup.id === groupId) {
          setGroup(currentGroup)
        } else {
          // intento de respaldo: buscar en historial, pero sin romper si no aparece
          try {
            const history = await groupsService.getMyHistory(accessToken)
            const allGroups = [...history.activos, ...history.pasados].map((item) => item.grupos_viaje)
            const foundGroup = allGroups.find((item) => item.id === groupId) || null

            if (foundGroup) {
              saveCurrentGroup(foundGroup)
              setGroup(foundGroup)
            }
          } catch {
            // si falla historial, no detenemos la carga del panel
          }
        }

        const [membersRes, inviteRes, qrRes] = await Promise.all([
          groupsService.getMembers(groupId, accessToken),
          groupsService.getInvite(groupId, accessToken),
          groupsService.getQr(groupId, accessToken),
        ])

        setMembers(membersRes.members)
        setInviteLink(inviteRes.inviteLink)
        setQrBase64(qrRes.qrBase64)

      // si todavía no tenemos group, conservamos el grupo desde localStorage sin depender del closure
      const fallbackGroup = getCurrentGroup()
      if (fallbackGroup && fallbackGroup.id === groupId) {
        setGroup((prev) => prev ?? fallbackGroup)
      }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el grupo')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [accessToken, groupId])

  const inviteMembers: InviteMember[] = useMemo(
    () =>
      members.map((member, index) => ({
        id: index + 1,
        initials: getInitials(member.nombre || member.email),
        name: member.nombre || member.email,
        role: member.rol === 'admin' ? 'Admin' : 'Miembro',
      })),
    [members]
  )

  const handleCopy = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleToggleRole = async (member: GroupMember) => {
    if (!accessToken || !group) return

    try {
      const nextRole = member.rol === 'admin' ? 'viajero' : 'admin'
      await groupsService.updateMemberRole(member.id, nextRole, accessToken)
      const refreshed = await groupsService.getMembers(group.id, accessToken)
      setMembers(refreshed.members)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el rol')
    }
  }

  const handleRemove = async (member: GroupMember) => {
    if (!accessToken || !group) return

    try {
      await groupsService.removeMember(group.id, member.id, accessToken)
      const refreshed = await groupsService.getMembers(group.id, accessToken)
      setMembers(refreshed.members)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar al miembro')
    }
  }

  if (loading) {
    return (
      <AppLayout showTripSelector={false} showRightPanel={false}>
        <div className="flex-1 flex items-center justify-center">
          <p className="font-body text-sm text-[#7A8799]">Cargando grupo...</p>
        </div>
      </AppLayout>
    )
  }

  if (error || !group) {
    return (
      <AppLayout showTripSelector={false} showRightPanel={false}>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 max-w-md w-full text-center">
            <h2 className="font-heading text-xl text-[#1E0A4E] mb-2">No se pudo abrir el grupo</h2>
            <p className="font-body text-sm text-red-500">{error || 'Grupo no disponible'}</p>
            <button
              onClick={() => navigate('/create-group')}
              className="mt-4 bg-[#1E6FD9] text-white rounded-xl px-4 py-3 text-sm"
            >
              Volver al dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <>
      <AppLayout
        trip={{
          name: group.nombre,
          subtitle: group.destino || 'Sin destino definido',
          dates: formatDateRange(group.fecha_inicio, group.fecha_fin),
          people: `${members.length}${group.maximo_miembros ? ` / ${group.maximo_miembros}` : ''} personas`,
        }}
        user={{
          name: localUser?.nombre || 'Usuario',
          role: 'Admin',
          initials: (localUser?.nombre || 'U').slice(0, 2).toUpperCase(),
          color: '#7A4FD6',
        }}
        showTripSelector={false}
        showRightPanel={false}
      >
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="font-heading text-2xl text-[#1E0A4E] font-bold">{group.nombre}</h1>
                  <p className="font-body text-sm text-[#7A8799] mt-1">{group.descripcion || 'Sin descripción'}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="bg-[#F4F6F8] rounded-full px-3 py-1 text-[#1E0A4E]">Destino: {group.destino || 'Pendiente'}</span>
                    <span className="bg-[#F4F6F8] rounded-full px-3 py-1 text-[#1E0A4E]">Fechas: {formatDateRange(group.fecha_inicio, group.fecha_fin)}</span>
                    <span className="bg-[#F4F6F8] rounded-full px-3 py-1 text-[#1E0A4E]">Código: {group.codigo_invitacion}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopy}
                    className="border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#1E0A4E]"
                  >
                    Copiar enlace
                  </button>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#1E0A4E]"
                  >
                    Ver invitación
                  </button>
                  <button
                    onClick={() => navigate(`/group-settings?groupId=${encodeURIComponent(group.id)}`)}
                    className="bg-[#1E6FD9] text-white rounded-xl px-4 py-3 text-sm"
                  >
                    Configuración
                  </button>
                </div>
              </div>
              {copied && <p className="mt-3 text-sm text-[#35C56A]">Enlace copiado correctamente.</p>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
                <h2 className="font-heading text-lg text-[#1E0A4E] font-semibold mb-4">Miembros del grupo</h2>
                <div className="space-y-3">
                  {members.map((member) => {
                    const isSelf = String(member.usuario_id) === String(localUser?.id_usuario)
                    return (
                      <div key={member.id} className="flex items-center justify-between border border-[#F4F6F8] rounded-xl px-4 py-3">
                        <div>
                          <p className="font-body text-sm font-medium text-[#1E0A4E]">
                            {member.nombre || member.email} {isSelf && <span className="text-[#7A8799]">(tú)</span>}
                          </p>
                          <p className="font-body text-xs text-[#7A8799]">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs rounded-full px-3 py-1 bg-[#F4F6F8] text-[#1E0A4E]">
                            {member.rol === 'admin' ? 'Admin' : 'Viajero'}
                          </span>
                          {!isSelf && (
                            <>
                              <button
                                onClick={() => handleToggleRole(member)}
                                className="text-xs border border-[#E2E8F0] rounded-lg px-3 py-2"
                              >
                                Cambiar rol
                              </button>
                              <button
                                onClick={() => handleRemove(member)}
                                className="text-xs border border-red-200 text-red-500 rounded-lg px-3 py-2"
                              >
                                Expulsar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
                <h2 className="font-heading text-lg text-[#1E0A4E] font-semibold mb-4">Invitación del grupo</h2>
                {qrBase64 ? (
                  <img src={qrBase64} alt="QR de invitación" className="w-52 h-52 mx-auto rounded-xl border border-[#E2E8F0]" />
                ) : (
                  <div className="w-52 h-52 mx-auto rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]" />
                )}
                <p className="mt-4 text-xs text-[#7A8799] break-all">{inviteLink}</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        inviteLink={inviteLink}
        members={inviteMembers}
      />
    </>
  )
}

export default GroupPanelPage