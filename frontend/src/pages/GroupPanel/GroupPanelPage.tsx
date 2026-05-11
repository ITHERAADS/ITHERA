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
import type { Group, GroupInvitation, GroupJoinRequest, GroupMember } from '../../types/groups'

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

function getDisplayRole(rol?: string) {
  return rol === 'admin' ? 'Organizador' : 'Viajero'
}

export function GroupPanelPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accessToken, localUser } = useAuth()

  const [group, setGroup] = useState<Group | null>(getCurrentGroup())
  const [members, setMembers] = useState<GroupMember[]>([])
  const [invitations, setInvitations] = useState<GroupInvitation[]>([])
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const [qrBase64, setQrBase64] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  const groupId = searchParams.get('groupId') || group?.id || ''

  const currentMember = members.find(
    (member) => String(member.usuario_id) === String(localUser?.id_usuario)
  )

  const isAdmin = currentMember?.rol === 'admin' || group?.myRole === 'admin'

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

        if (currentGroup && String(currentGroup.id) === String(groupId)) {
          setGroup(currentGroup)
        } else {
          try {
            const history = await groupsService.getMyHistory(accessToken)
            const allGroups = [...history.activos, ...history.pasados].map(
              (item) => ({
                ...item.grupos_viaje,
                myRole: item.rol,
              })
            )

            const foundGroup =
              allGroups.find((item) => String(item.id) === String(groupId)) ||
              null

            if (foundGroup) {
              saveCurrentGroup(foundGroup)
              setGroup(foundGroup)
            }
          } catch {
            // No detenemos la carga si falla el respaldo por historial.
          }
        }

        const membersRes = await groupsService.getMembers(groupId, accessToken)
        setMembers(membersRes.members)

        const memberRole = membersRes.members.find(
          (member) => String(member.usuario_id) === String(localUser?.id_usuario)
        )?.rol

        const canManage = memberRole === 'admin' || currentGroup?.myRole === 'admin'

        if (canManage) {
          const [inviteRes, qrRes, invitationsRes, joinRequestsRes] = await Promise.all([
            groupsService.getInvite(groupId, accessToken),
            groupsService.getQr(groupId, accessToken),
            groupsService.getInvitations(groupId, accessToken),
            groupsService.getJoinRequests(groupId, accessToken),
          ])

          setInviteLink(inviteRes.inviteLink)
          setQrBase64(qrRes.qrBase64)
          setInvitations(invitationsRes.invitations)
          setJoinRequests(joinRequestsRes.requests)
        } else {
          setInviteLink('')
          setQrBase64('')
          setInvitations([])
          setJoinRequests([])
        }

        const fallbackGroup = getCurrentGroup()
        if (fallbackGroup && String(fallbackGroup.id) === String(groupId)) {
          setGroup((prev) => prev ?? fallbackGroup)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el grupo')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [accessToken, groupId, localUser?.id_usuario])

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
    if (!accessToken || !group || !isAdmin) return

    try {
      const nextRole = member.rol === 'admin' ? 'viajero' : 'admin'
      await groupsService.updateMemberRole(member.id, nextRole, accessToken)

      const refreshed = await groupsService.getMembers(group.id, accessToken)
      setMembers(refreshed.members)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el rol')
    }
  }

  const handleResolveJoinRequest = async (request: GroupJoinRequest, action: 'approve' | 'reject') => {
    if (!accessToken || !group || !isAdmin) return

    try {
      await groupsService.resolveJoinRequest(group.id, request.id, action, accessToken)
      const [membersRes, requestsRes] = await Promise.all([
        groupsService.getMembers(group.id, accessToken),
        groupsService.getJoinRequests(group.id, accessToken),
      ])
      setMembers(membersRes.members)
      setJoinRequests(requestsRes.requests)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo atender la solicitud')
    }
  }

  const handleRemove = async (member: GroupMember) => {
    if (!accessToken || !group || !isAdmin) return

    const confirmed = window.confirm(
      `¿Seguro que quieres expulsar a ${member.nombre || member.email} del grupo?`
    )

    if (!confirmed) return

    try {
      await groupsService.removeMember(group.id, member.id, accessToken)

      const refreshed = await groupsService.getMembers(group.id, accessToken)
      setMembers(refreshed.members)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar al miembro')
    }
  }

  const navUserName = localUser?.nombre || localUser?.email || 'Usuario'
  const navInitials = getInitials(navUserName) || 'U'

  if (loading) {
    return (
      <AppLayout
        showTripSelector={false}
        showRightPanel={false}
        user={{
          name: navUserName,
          role: '',
          initials: navInitials,
          color: '#7A4FD6',
        }}
      >
        <div className="flex flex-1 items-center justify-center">
          <p className="font-body text-sm text-[#7A8799]">Cargando grupo...</p>
        </div>
      </AppLayout>
    )
  }

  if (error || !group) {
    return (
      <AppLayout
        showTripSelector={false}
        showRightPanel={false}
        user={{
          name: navUserName,
          role: '',
          initials: navInitials,
          color: '#7A4FD6',
        }}
      >
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center">
            <h2 className="mb-2 font-heading text-xl text-[#1E0A4E]">
              No se pudo abrir el grupo
            </h2>
            <p className="font-body text-sm text-red-500">
              {error || 'Grupo no disponible'}
            </p>
            <button
              onClick={() => navigate('/my-trips')}
              className="mt-4 rounded-xl bg-[#1E6FD9] px-4 py-3 text-sm text-white"
            >
              Volver a mis viajes
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const pendingInvitations = invitations.filter(
    (invitation) => invitation.estado === 'pendiente'
  )

  return (
    <>
      <AppLayout
        trip={{
          name: group.nombre,
          subtitle: group.destino || 'Sin destino definido',
          dates: formatDateRange(group.fecha_inicio, group.fecha_fin),
          people: `${members.length}${
            group.maximo_miembros ? ` / ${group.maximo_miembros}` : ''
          } personas`,
        }}
        user={{
          name: navUserName,
          role: getDisplayRole(isAdmin ? 'admin' : 'viajero'),
          initials: navInitials,
          color: '#7A4FD6',
        }}
        showTripSelector={false}
        showRightPanel={false}
      >
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="font-heading text-2xl font-bold text-[#1E0A4E]">
                    {group.nombre}
                  </h1>

                  <p className="mt-1 font-body text-sm text-[#7A8799]">
                    {group.descripcion || 'Sin descripción'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-[#F4F6F8] px-3 py-1 text-[#1E0A4E]">
                      Destino: {group.destino || 'Pendiente'}
                    </span>

                    <span className="rounded-full bg-[#F4F6F8] px-3 py-1 text-[#1E0A4E]">
                      Fechas: {formatDateRange(group.fecha_inicio, group.fecha_fin)}
                    </span>

                    <span className="rounded-full bg-[#F4F6F8] px-3 py-1 text-[#1E0A4E]">
                      Código: {group.codigo_invitacion}
                    </span>

                    <span className="rounded-full bg-[#E8F0FF] px-3 py-1 font-semibold text-[#1E6FD9]">
                      Tu rol: {getDisplayRole(isAdmin ? 'admin' : 'viajero')}
                    </span>

                    <span className={`rounded-full px-3 py-1 font-semibold ${group.es_publico ? 'bg-[#EAFBF0] text-[#1F8A4C]' : 'bg-[#FFF4D6] text-[#A86B00]'}`}>
                      {group.es_publico ? 'Grupo público' : 'Grupo privado'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#1E0A4E] hover:bg-[#F8FAFC]"
                      >
                        Invitar al grupo
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/group-settings?groupId=${encodeURIComponent(group.id)}`
                          )
                        }
                        className="rounded-xl bg-[#1E6FD9] px-4 py-3 text-sm text-white hover:bg-[#2C8BE6]"
                      >
                        Configuración
                      </button>
                    </>
                  )}

                  <button
                    onClick={() =>
                      navigate(`/dashboard?groupId=${encodeURIComponent(group.id)}`)
                    }
                    className="rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#1E0A4E] hover:bg-[#F8FAFC]"
                  >
                    Ver itinerario
                  </button>
                </div>
              </div>

              {copied && (
                <p className="mt-3 text-sm text-[#35C56A]">
                  Enlace copiado correctamente.
                </p>
              )}
            </div>

            <div
              className={
                isAdmin
                  ? 'grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]'
                  : 'grid grid-cols-1 gap-5'
              }
            >
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-heading text-lg font-semibold text-[#1E0A4E]">
                  Miembros del grupo
                </h2>

                <div className="space-y-3">
                  {members.map((member) => {
                    const isSelf =
                      String(member.usuario_id) === String(localUser?.id_usuario)

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col gap-3 rounded-xl border border-[#F4F6F8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-body text-sm font-medium text-[#1E0A4E]">
                            {member.nombre || member.email}{' '}
                            {isSelf && (
                              <span className="text-[#7A8799]">(tú)</span>
                            )}
                          </p>

                          <p className="font-body text-xs text-[#7A8799]">
                            {member.email}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              member.rol === 'admin'
                                ? 'bg-[#E8F0FF] text-[#1E6FD9]'
                                : 'bg-[#F4F6F8] text-[#1E0A4E]'
                            }`}
                          >
                            {getDisplayRole(member.rol)}
                          </span>

                          {isAdmin && !isSelf && (
                            <>
                              <button
                                onClick={() => handleToggleRole(member)}
                                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#1E0A4E] hover:bg-[#F8FAFC]"
                              >
                                Cambiar rol
                              </button>

                              <button
                                onClick={() => handleRemove(member)}
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
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

              {isAdmin && (
                <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                  <div className="mb-5">
                    <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">
                      Invitación del grupo
                    </h2>

                    <p className="mt-1 font-body text-sm text-[#7A8799]">
                      Comparte el QR, el enlace o envía invitaciones por correo.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-center">
                    {qrBase64 ? (
                      <img
                        src={qrBase64}
                        alt="QR de invitación"
                        className="mx-auto h-48 w-48 rounded-xl border border-[#E2E8F0] bg-white p-2"
                      />
                    ) : (
                      <div className="mx-auto h-48 w-48 rounded-xl border border-[#E2E8F0] bg-white" />
                    )}

                    <p className="mt-4 break-all font-body text-xs text-[#7A8799]">
                      {inviteLink}
                    </p>

                    <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="mt-4 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#1E0A4E] hover:bg-[#F4F6F8]"
                    >
                      Compartir invitación
                    </button>

                    <button
                      onClick={handleCopy}
                      className="mt-2 w-full rounded-xl bg-[#1E0A4E] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Copiar enlace
                    </button>
                  </div>

                  <div className="mt-6">
                    <h3 className="font-heading text-base font-semibold text-[#1E0A4E]">
                      Solicitudes de unión
                    </h3>
                    <p className="mt-1 font-body text-xs text-[#7A8799]">
                      En grupos privados, los usuarios que usen el código quedan pendientes hasta que el administrador apruebe o rechace la solicitud.
                    </p>

                    {joinRequests.length === 0 ? (
                      <p className="mt-3 rounded-xl bg-[#F8FAFC] px-4 py-3 font-body text-sm text-[#7A8799]">
                        No hay solicitudes pendientes.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {joinRequests.map((request) => (
                          <div
                            key={request.id}
                            className="rounded-xl border border-[#E2E8F0] px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-body text-sm font-medium text-[#1E0A4E]">
                                  {request.nombre || request.email || `Usuario ${request.usuario_id}`}
                                </p>
                                {request.email && (
                                  <p className="font-body text-xs text-[#7A8799]">{request.email}</p>
                                )}
                              </div>
                              <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-xs font-semibold text-[#A86B00]">
                                Pendiente
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleResolveJoinRequest(request, 'approve')}
                                className="rounded-lg bg-[#1E6FD9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2C8BE6]"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleResolveJoinRequest(request, 'reject')}
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                              >
                                Rechazar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="font-heading text-base font-semibold text-[#1E0A4E]">
                      Invitaciones pendientes
                    </h3>

                    {pendingInvitations.length === 0 ? (
                      <p className="mt-3 rounded-xl bg-[#F8FAFC] px-4 py-3 font-body text-sm text-[#7A8799]">
                        Todavía no hay invitaciones pendientes.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {pendingInvitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between rounded-xl border border-[#E2E8F0] px-4 py-3"
                          >
                            <div>
                              <p className="font-body text-sm font-medium text-[#1E0A4E]">
                                {invitation.email}
                              </p>

                              <p className="font-body text-xs text-[#7A8799]">
                                Pendiente de aceptar
                              </p>
                            </div>

                            <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-xs font-semibold text-[#A86B00]">
                              Pendiente
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>

      {isAdmin && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          inviteLink={inviteLink}
          groupId={group.id}
          accessToken={accessToken ?? ''}
          members={inviteMembers}
          onInvitationsSent={async () => {
            if (!accessToken) return

            const [membersRes, invitationsRes, joinRequestsRes] = await Promise.all([
              groupsService.getMembers(group.id, accessToken),
              groupsService.getInvitations(group.id, accessToken),
              groupsService.getJoinRequests(group.id, accessToken),
            ])

            setMembers(membersRes.members)
            setInvitations(invitationsRes.invitations)
            setJoinRequests(joinRequestsRes.requests)
          }}
        />
      )}
    </>
  )
}

export default GroupPanelPage