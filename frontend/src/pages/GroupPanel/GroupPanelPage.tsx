import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { InviteModal } from "../../components/InviteModal/InviteModal";
import { useAuth } from "../../context/useAuth";
import { useSocket } from "../../hooks/useSocket";
import {
  getCurrentGroup,
  groupsService,
  saveCurrentGroup,
  clearCurrentGroup,
} from "../../services/groups";
import { HelpButton } from "../../components/ui/HelpButton";
import type {
  Group,
  GroupInvitation,
  GroupJoinRequest,
  GroupMember,
  AdminDelegationRequest,
} from "../../types/groups";

type InviteMember = {
  id: number;
  initials: string;
  name: string;
  role: "Admin" | "Miembro";
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Sin fechas definidas";
  return `${start || "—"} → ${end || "—"}`;
}

function getDisplayRole(rol?: string) {
  return rol === "admin" ? "Organizador" : "Viajero";
}

function isClosedGroup(group?: Group | null) {
  return ["cerrado", "archivado", "finalizado"].includes(
    String(group?.estado ?? "").toLowerCase(),
  );
}

export function GroupPanelPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { accessToken, localUser } = useAuth();
  const { socket } = useSocket(accessToken);

  const [group, setGroup] = useState<Group | null>(getCurrentGroup());
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [qrBase64, setQrBase64] = useState("");
  const [inviteSettings, setInviteSettings] = useState<{ expiresAt: string | null; maxUses: number | null; usedCount: number }>({
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<GroupMember | null>(
    null,
  );
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [adminDelegations, setAdminDelegations] = useState<AdminDelegationRequest[]>([]);
  const [delegationActionLoading, setDelegationActionLoading] = useState<string | null>(null);
  const [joinRequestActionLoading, setJoinRequestActionLoading] = useState<string | null>(null);

  const groupId = searchParams.get("groupId") || group?.id || "";

  const currentMember = members.find(
    (member) => String(member.usuario_id) === String(localUser?.id_usuario),
  );

  const isAdmin = currentMember ? currentMember.rol === "admin" : group?.myRole === "admin";
  const isReadOnly = isClosedGroup(group);
  const canManageGroup = isAdmin && !isReadOnly;
  const isPrivateGroup = group?.es_publico !== true;
  const maxMembers = Number(group?.maximo_miembros ?? 0);
  const hasReachedCapacity = maxMembers > 0 && members.length >= maxMembers;
  const canInviteGroup = canManageGroup && !hasReachedCapacity;
  const incomingAdminDelegation = adminDelegations.find(
    (request) => String(request.to_user_id) === String(localUser?.id_usuario),
  );
  const outgoingAdminDelegation = adminDelegations.find(
    (request) => String(request.from_user_id) === String(localUser?.id_usuario),
  );
  const loadAdminData = useCallback(
    async (targetGroup: Group | null, targetMembers: GroupMember[]) => {
      if (!accessToken || !groupId) return;

      const memberRole = targetMembers.find(
        (member) => String(member.usuario_id) === String(localUser?.id_usuario),
      )?.rol;
      const effectiveMaxMembers = Number(targetGroup?.maximo_miembros ?? 0);
      const reachedCapacity =
        effectiveMaxMembers > 0 && targetMembers.length >= effectiveMaxMembers;
      const canManage =
        (memberRole === "admin" || targetGroup?.myRole === "admin") &&
        !isClosedGroup(targetGroup);

      if (!canManage || reachedCapacity) {
        setInviteLink("");
        setQrBase64("");
        setInviteSettings({ expiresAt: null, maxUses: null, usedCount: 0 });
        setInvitations([]);
        setJoinRequests([]);
        return;
      }

      const effectiveIsPrivate = targetGroup?.es_publico !== true;
      const [inviteRes, qrRes, invitationsRes, joinRequestsRes] =
        await Promise.all([
          groupsService.getInvite(groupId, accessToken),
          groupsService.getQr(groupId, accessToken),
          groupsService.getInvitations(groupId, accessToken),
          effectiveIsPrivate
            ? groupsService.getJoinRequests(groupId, accessToken)
            : Promise.resolve({ requests: [] }),
        ]);

      setInviteLink(inviteRes.inviteLink);
      setInviteSettings(inviteRes.inviteSettings ?? { expiresAt: null, maxUses: null, usedCount: 0 });
      setQrBase64(qrRes.qrBase64);
      setInvitations(invitationsRes.invitations);
      setJoinRequests(joinRequestsRes.requests);
    },
    [accessToken, groupId, localUser?.id_usuario],
  );

  const goToItinerary = () => {
    const targetGroup = group ?? getCurrentGroup();
    const targetGroupId = String(targetGroup?.id ?? groupId ?? "");
    if (!targetGroupId) {
      navigate("/my-trips");
      return;
    }
    navigate(`/dashboard?groupId=${encodeURIComponent(targetGroupId)}`, {
      state: {
        groupId: targetGroupId,
        switchingGroup: targetGroup ?? undefined,
      },
    });
  };

  const loadData = useCallback(async () => {
    if (!accessToken || !groupId) {
      setLoading(false);
      setError("No se recibió un groupId válido");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [groupRes, membersRes] = await Promise.all([
        groupsService.getGroupDetails(groupId, accessToken),
        groupsService.getMembers(groupId, accessToken),
      ]);

      const loadedCurrentMember = membersRes.members.find(
        (member) => String(member.usuario_id) === String(localUser?.id_usuario),
      );

      if (!loadedCurrentMember) {
        clearCurrentGroup();
        navigate("/my-trips", { replace: true });
        return;
      }

      const loadedGroup = { ...groupRes.group, myRole: loadedCurrentMember.rol };
      setGroup(loadedGroup);
      saveCurrentGroup(loadedGroup);
      setMembers(membersRes.members);

      try {
        const delegationRes = await groupsService.getAdminDelegations(groupId, accessToken);
        setAdminDelegations(delegationRes.requests ?? []);
      } catch {
        setAdminDelegations([]);
      }

      void loadAdminData(loadedGroup, membersRes.members).catch(() => {
        setInvitations([]);
        setJoinRequests([]);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar el grupo";
      if (/no perteneces|permisos|forbidden|403/i.test(message)) {
        clearCurrentGroup();
        navigate("/my-trips", { replace: true });
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, groupId, loadAdminData, localUser?.id_usuario, navigate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!socket || !groupId) return;

    const handleRealtime = (payload: {
      grupoId?: string | number;
      groupId?: string | number;
      tipo?: string;
      metadata?: {
        targetUsuarioId?: string | number;
        memberId?: string | number;
        [key: string]: unknown;
      };
    }) => {
      const payloadGroupId = payload.grupoId ?? payload.groupId;
      if (
        payloadGroupId !== undefined &&
        String(payloadGroupId) !== String(groupId)
      )
        return;

      if (payload.tipo === "grupo_eliminado") {
        clearCurrentGroup();
        alert("Este grupo fue eliminado por el administrador.");
        navigate("/my-trips");
        return;
      }

      const targetUsuarioId = payload.metadata?.targetUsuarioId;
      const affectsCurrentUser =
        targetUsuarioId !== undefined &&
        String(targetUsuarioId) === String(localUser?.id_usuario);

      if (payload.tipo === "miembro_eliminado" && affectsCurrentUser) {
        clearCurrentGroup();
        alert("Fuiste removido de este viaje. Te regresamos a Mis viajes.");
        navigate("/my-trips");
        return;
      }

      if (
        payload.tipo === "miembro_agregado" ||
        payload.tipo === "miembro_eliminado" ||
        payload.tipo === "miembro_actualizado" ||
        payload.tipo === "rol_actualizado" ||
        payload.tipo === "solicitud_union_creada" ||
        payload.tipo === "solicitud_union_resuelta" ||
        payload.tipo === "grupo_actualizado" ||
        payload.tipo === "delegacion_admin_pendiente" ||
        payload.tipo === "delegacion_admin_aceptada" ||
        payload.tipo === "delegacion_admin_rechazada" ||
        payload.tipo === undefined
      ) {
        void loadData();
      }
    };

    socket.emit("join_room", { tripId: groupId });
    socket.on("dashboard_updated", handleRealtime);
    socket.on("group_members_updated", handleRealtime);
    socket.on("group_deleted", handleRealtime);

    return () => {
      socket.emit("leave_room", { tripId: groupId });
      socket.off("dashboard_updated", handleRealtime);
      socket.off("group_members_updated", handleRealtime);
      socket.off("group_deleted", handleRealtime);
    };
  }, [groupId, loadData, localUser?.id_usuario, navigate, socket]);

  const inviteMembers: InviteMember[] = useMemo(
    () =>
      members.map((member, index) => ({
        id: index + 1,
        initials: getInitials(member.nombre || member.email),
        name: member.nombre || member.email,
        role: member.rol === "admin" ? "Admin" : "Miembro",
      })),
    [members],
  );

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleToggleRole = async (member: GroupMember) => {
    if (!accessToken || !group || !canManageGroup) return;

    try {
      setRoleChangeLoading(true);
      const nextRole = member.rol === "admin" ? "viajero" : "admin";

      const response = await groupsService.updateMemberRole(member.id, nextRole, accessToken);

      if (nextRole === "admin" && response.member?.pendingDelegation) {
        const delegationRes = await groupsService.getAdminDelegations(group.id, accessToken);
        setAdminDelegations(delegationRes.requests ?? []);
        alert("Solicitud de administración enviada. El integrante debe aceptarla antes de que cambien los roles.");
      } else {
        const refreshed = await groupsService.getMembers(group.id, accessToken);
        setMembers(refreshed.members);
      }
      setRoleChangeTarget(null);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "No se pudo actualizar el rol",
      );
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const handleResolveJoinRequest = async (
    request: GroupJoinRequest,
    action: "approve" | "reject",
  ) => {
    if (!accessToken || !group || !canManageGroup) return;

    const loadingKey = `${request.id}:${action}`;

    try {
      setJoinRequestActionLoading(loadingKey);
      await groupsService.resolveJoinRequest(
        group.id,
        request.id,
        action,
        accessToken,
      );
      const [membersRes, requestsRes] = await Promise.all([
        groupsService.getMembers(group.id, accessToken),
        groupsService.getJoinRequests(group.id, accessToken),
      ]);
      setMembers(membersRes.members);
      setJoinRequests(requestsRes.requests);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "No se pudo atender la solicitud",
      );
    } finally {
      setJoinRequestActionLoading(null);
    }
  };

  const handleResolveAdminDelegation = async (
    request: AdminDelegationRequest,
    action: "accept" | "reject",
  ) => {
    if (!accessToken || !group) return;

    try {
      setDelegationActionLoading(`${request.id}:${action}`);
      await groupsService.resolveAdminDelegation(
        group.id,
        request.id,
        action,
        accessToken,
      );

      const [membersRes, delegationRes, groupRes] = await Promise.all([
        groupsService.getMembers(group.id, accessToken),
        groupsService.getAdminDelegations(group.id, accessToken),
        groupsService.getGroupDetails(group.id, accessToken),
      ]);
      setMembers(membersRes.members);
      setAdminDelegations(delegationRes.requests ?? []);
      setGroup(groupRes.group);
      saveCurrentGroup(groupRes.group);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "No se pudo responder la solicitud de administración",
      );
    } finally {
      setDelegationActionLoading(null);
    }
  };

  const handleRemove = async (member: GroupMember) => {
    if (!accessToken || !group || !canManageGroup) return;

    const confirmed = window.confirm(
      `¿Seguro que quieres expulsar a ${member.nombre || member.email} del grupo?`,
    );

    if (!confirmed) return;

    try {
      await groupsService.removeMember(group.id, member.id, accessToken);

      const refreshed = await groupsService.getMembers(group.id, accessToken);
      setMembers(refreshed.members);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "No se pudo eliminar al miembro",
      );
    }
  };

  const navUserName = localUser?.nombre || localUser?.email || "Usuario";
  const navInitials = getInitials(navUserName) || "U";

  if (loading) {
    return (
      <AppLayout
        showTripSelector={false}
        showRightPanel={false}
        user={{
          name: navUserName,
          role: "",
          initials: navInitials,
          color: "#7A4FD6",
        }}
      >
        <div className="flex flex-1 items-center justify-center">
          <p className="font-body text-sm text-[#7A8799]">Cargando grupo...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !group) {
    return (
      <AppLayout
        showTripSelector={false}
        showRightPanel={false}
        user={{
          name: navUserName,
          role: "",
          initials: navInitials,
          color: "#7A4FD6",
        }}
      >
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center">
            <h2 className="mb-2 font-heading text-xl text-[#1E0A4E]">
              No se pudo abrir el grupo
            </h2>
            <p className="font-body text-sm text-red-500">
              {error || "Grupo no disponible"}
            </p>
            <button
              onClick={() => navigate("/my-trips")}
              className="mt-4 rounded-xl bg-[#1E6FD9] px-4 py-3 text-sm text-white"
            >
              Volver a mis viajes
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const pendingInvitations = invitations.filter(
    (invitation) => invitation.estado === "pendiente",
  );

  return (
    <>
      <AppLayout
        trip={{
          name: group.nombre,
          subtitle: group.destino || "Sin destino definido",
          dates: formatDateRange(group.fecha_inicio, group.fecha_fin),
          people: `${members.length}${
            group.maximo_miembros ? ` / ${group.maximo_miembros}` : ""
          } personas`,
        }}
        user={{
          name: navUserName,
          role: getDisplayRole(isAdmin ? "admin" : "viajero"),
          initials: navInitials,
          color: "#7A4FD6",
        }}
        showTripSelector={false}
        showRightPanel={false}
      >
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-8">
          <div className="mx-auto w-full max-w-4xl space-y-5">
            <div className="relative rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="min-w-0 lg:max-w-[calc(100%-390px)]">
                <h1
                  className="max-w-full break-words font-heading text-2xl font-bold leading-tight text-[#1E0A4E]"
                  title={group.nombre}
                >
                  {group.nombre}
                </h1>

                <p
                  className="mt-2 max-w-full break-words font-body text-sm leading-relaxed text-[#7A8799]"
                  title={group.descripcion || "Sin descripción"}
                >
                  {group.descripcion || "Sin descripción"}
                </p>

                <div className="mt-4 flex max-w-full flex-wrap gap-2 text-xs">
                  <span className="max-w-full break-words rounded-full bg-[#F4F6F8] px-3 py-1 text-[#1E0A4E]">
                    Destino: {group.destino || "Pendiente"}
                  </span>

                  <span className="max-w-full break-words rounded-full bg-[#F4F6F8] px-3 py-1 text-[#1E0A4E]">
                    Fechas:{" "}
                    {formatDateRange(group.fecha_inicio, group.fecha_fin)}
                  </span>

                  {!hasReachedCapacity && (
                    <span className="max-w-full break-words rounded-full bg-[#F4F6F8] px-3 py-1 text-[#1E0A4E]">
                      Código: {group.codigo_invitacion}
                    </span>
                  )}

                  <span className="rounded-full bg-[#E8F0FF] px-3 py-1 font-semibold text-[#1E6FD9]">
                    Tu rol: {getDisplayRole(isAdmin ? "admin" : "viajero")}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 font-semibold ${group.es_publico ? "bg-[#EAFBF0] text-[#1F8A4C]" : "bg-[#FFF4D6] text-[#A86B00]"}`}
                  >
                    {group.es_publico ? "Grupo público" : "Grupo privado"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:absolute lg:right-6 lg:top-6 lg:mt-0 lg:w-[360px]">
                <div className="min-h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-center text-xs font-semibold text-[#1E0A4E] shadow-sm">
                  Panel (actual)
                </div>
                {canInviteGroup && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(true)}
                      className="min-h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-center text-xs font-semibold text-[#1E0A4E] shadow-sm transition hover:bg-[#F8FAFC]"
                    >
                      Invitar
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={goToItinerary}
                  className={`${isAdmin ? "" : "sm:col-start-3"} min-h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-center text-xs font-semibold text-[#1E0A4E] shadow-sm transition hover:bg-[#F8FAFC]`}
                >
                  Itinerario
                </button>
              </div>

              {copied && (
                <p className="mt-3 text-sm text-[#35C56A]">
                  Enlace copiado correctamente.
                </p>
              )}
            </div>

            {isReadOnly && (
              <div className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-5 py-4">
                <p className="font-heading text-sm font-semibold text-[#1E0A4E]">
                  Viaje cerrado · modo solo lectura
                </p>
                <p className="mt-1 font-body text-sm leading-relaxed text-[#64748B]">
                  Este viaje ya finalizó. Puedes consultar integrantes,
                  invitaciones históricas e itinerario, pero las acciones de
                  gestión, invitación y expulsión están deshabilitadas.
                </p>
              </div>
            )}

            {outgoingAdminDelegation && (
              <div className="rounded-2xl border border-[#F7D37A] bg-[#FFF8E5] px-5 py-4">
                <p className="font-heading text-sm font-semibold text-[#8A5A00]">
                  Delegación de administración pendiente
                </p>
                <p className="mt-1 font-body text-sm leading-relaxed text-[#8A5A00]">
                  Esperando respuesta de {outgoingAdminDelegation.to_nombre || outgoingAdminDelegation.to_email || "el integrante"}. La solicitud expira a las {new Date(outgoingAdminDelegation.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                </p>
              </div>
            )}

            {incomingAdminDelegation && (
              <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-5 py-4">
                <p className="font-heading text-sm font-semibold text-[#1D4ED8]">
                  Tienes una solicitud para ser organizador
                </p>
                <p className="mt-1 font-body text-sm leading-relaxed text-[#1E40AF]">
                  {incomingAdminDelegation.from_nombre || incomingAdminDelegation.from_email || "El organizador"} quiere delegarte la administración de este viaje. Puedes aceptarla o rechazarla desde el aviso emergente.
                </p>
              </div>
            )}

            {canManageGroup && hasReachedCapacity && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                <p className="font-heading text-sm font-semibold text-red-600">
                  Capacidad máxima alcanzada
                </p>
                <p className="mt-1 font-body text-sm leading-relaxed text-red-500">
                  El grupo tiene {members.length}
                  {group.maximo_miembros
                    ? ` / ${group.maximo_miembros}`
                    : ""}{" "}
                  miembros. Se ocultaron el QR, el enlace y el envío de
                  invitaciones para evitar solicitudes que el sistema debe
                  rechazar.
                </p>
              </div>
            )}

            <div
              className={
                canInviteGroup
                  ? "grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]"
                  : "grid grid-cols-1 gap-5"
              }
            >
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-heading text-lg font-semibold text-[#1E0A4E]">
                    Miembros del grupo
                  </h2>
                  <HelpButton
                    title="Miembros y roles"
                    description="Consulta quién forma parte del viaje y su rol. Solo el organizador puede cambiar roles o expulsar integrantes; los viajeros solo ven la lista."
                    placement="right"
                  />
                </div>

                <div className="space-y-3">
                  {members.map((member) => {
                    const isSelf =
                      String(member.usuario_id) ===
                      String(localUser?.id_usuario);

                    return (
                      <div
                        key={member.id}
                        className="grid grid-cols-1 gap-3 rounded-xl border border-[#F4F6F8] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-body text-sm font-medium text-[#1E0A4E]" title={member.nombre || member.email || ""}>
                            {member.nombre || member.email}{" "}
                            {isSelf && (
                              <span className="text-[#7A8799]">(tú)</span>
                            )}
                          </p>

                          <p className="truncate font-body text-xs text-[#7A8799]" title={member.email || ""}>
                            {member.email}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:pl-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                              member.rol === "admin"
                                ? "bg-[#E8F0FF] text-[#1E6FD9]"
                                : "bg-[#F4F6F8] text-[#1E0A4E]"
                            }`}
                          >
                            {getDisplayRole(member.rol)}
                          </span>

                          {canManageGroup && !isSelf && (
                            <>
                              <button
                                onClick={() => setRoleChangeTarget(member)}
                                className="whitespace-nowrap rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#1E0A4E] hover:bg-[#F8FAFC]"
                              >
                                Cambiar rol
                              </button>

                              <button
                                onClick={() => handleRemove(member)}
                                className="whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                              >
                                Expulsar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {canInviteGroup && (
                <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                  <div className="mb-5">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">
                        Invitación del grupo
                      </h2>
                      <HelpButton
                        title="Invitaciones"
                        description="Comparte el acceso solo cuando el grupo tenga cupo. En grupos privados, las solicitudes quedan pendientes hasta que el organizador las apruebe."
                        placement="right"
                      />
                    </div>

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

                  {isPrivateGroup && (
                    <div className="mt-6">
                      <h3 className="font-heading text-base font-semibold text-[#1E0A4E]">
                        Solicitudes de unión
                      </h3>
                      <p className="mt-1 font-body text-xs text-[#7A8799]">
                        En grupos privados, los usuarios que usen el código
                        quedan pendientes hasta que el administrador apruebe o
                        rechace la solicitud.
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
                                    {request.nombre ||
                                      request.email ||
                                      `Usuario ${request.usuario_id}`}
                                  </p>
                                  {request.email && (
                                    <p className="font-body text-xs text-[#7A8799]">
                                      {request.email}
                                    </p>
                                  )}
                                </div>
                                <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-xs font-semibold text-[#A86B00]">
                                  Pendiente
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={joinRequestActionLoading !== null}
                                  onClick={() =>
                                    handleResolveJoinRequest(request, "approve")
                                  }
                                  className="rounded-lg bg-[#1E6FD9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2C8BE6] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {joinRequestActionLoading === `${request.id}:approve`
                                    ? "Aprobando..."
                                    : "Aprobar"}
                                </button>
                                <button
                                  type="button"
                                  disabled={joinRequestActionLoading !== null}
                                  onClick={() =>
                                    handleResolveJoinRequest(request, "reject")
                                  }
                                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {joinRequestActionLoading === `${request.id}:reject`
                                    ? "Rechazando..."
                                    : "Rechazar"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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
                            <div className="min-w-0">
                              <p className="break-words font-body text-sm font-medium text-[#1E0A4E]">
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

      {canInviteGroup && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          inviteLink={inviteLink}
          qrBase64={qrBase64}
          inviteSettings={inviteSettings}
          groupId={group.id}
          accessToken={accessToken ?? ""}
          members={inviteMembers}
          onInviteSettingsUpdated={(settings) => {
            setInviteSettings(settings);
          }}
          onInvitationsSent={async () => {
            if (!accessToken) return;

            const [membersRes, invitationsRes, joinRequestsRes] =
              await Promise.all([
                groupsService.getMembers(group.id, accessToken),
                groupsService.getInvitations(group.id, accessToken),
                isPrivateGroup
                  ? groupsService.getJoinRequests(group.id, accessToken)
                  : Promise.resolve({ requests: [] }),
              ]);

            setMembers(membersRes.members);
            setInvitations(invitationsRes.invitations);
            setJoinRequests(joinRequestsRes.requests);
          }}
        />
      )}

      {canManageGroup && roleChangeTarget && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4"
          onClick={() => {
            if (!roleChangeLoading) setRoleChangeTarget(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="font-heading text-lg font-bold text-[#1E0A4E]">
              Confirmar cambio de rol
            </h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-[#475569]">
              {roleChangeTarget.rol === "admin"
                ? `¿Confirmas que quieres cambiar a ${roleChangeTarget.nombre || roleChangeTarget.email} a viajero?`
                : `Se enviará una solicitud a ${roleChangeTarget.nombre || roleChangeTarget.email}. La transferencia solo se completará si esa persona acepta ser organizadora.`}
            </p>
            <p className="mt-2 font-body text-xs text-[#64748B]">
              {roleChangeTarget.rol === "admin"
                ? "Este cambio afecta los permisos de administración del grupo y se sincroniza para todos los integrantes."
                : "La delegación requiere aceptación activa del receptor y expira en 5 minutos. Mientras esté pendiente, tú sigues siendo organizador."}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={roleChangeLoading}
                onClick={() => setRoleChangeTarget(null)}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#1E0A4E] hover:bg-[#F8FAFC] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={roleChangeLoading}
                onClick={() => handleToggleRole(roleChangeTarget)}
                className="rounded-lg bg-[#1E6FD9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2C8BE6] disabled:opacity-60"
              >
                {roleChangeLoading ? "Procesando..." : roleChangeTarget.rol === "admin" ? "Confirmar" : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {incomingAdminDelegation && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xl">
            <h3 className="font-heading text-lg font-bold text-[#1E0A4E]">
              ¿Aceptar administración del viaje?
            </h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-[#475569]">
              {incomingAdminDelegation.from_nombre || incomingAdminDelegation.from_email || "El organizador"} quiere transferirte el rol de organizador. Si aceptas, tendrás permisos de administración y el organizador actual pasará a viajero.
            </p>
            <p className="mt-2 font-body text-xs text-[#64748B]">
              Esta solicitud expira a las {new Date(incomingAdminDelegation.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={delegationActionLoading !== null}
                onClick={() => handleResolveAdminDelegation(incomingAdminDelegation, "reject")}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#1E0A4E] hover:bg-[#F8FAFC] disabled:opacity-60"
              >
                {delegationActionLoading === `${incomingAdminDelegation.id}:reject` ? "Rechazando..." : "Rechazar"}
              </button>
              <button
                type="button"
                disabled={delegationActionLoading !== null}
                onClick={() => handleResolveAdminDelegation(incomingAdminDelegation, "accept")}
                className="rounded-lg bg-[#1E6FD9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2C8BE6] disabled:opacity-60"
              >
                {delegationActionLoading === `${incomingAdminDelegation.id}:accept` ? "Aceptando..." : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default GroupPanelPage;
