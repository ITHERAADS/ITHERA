import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type InviteSettingsState = { expiresAt: string | null; maxUses: number | null; usedCount: number };

type GroupPanelCache = {
  group: Group | null;
  members: GroupMember[];
  invitations: GroupInvitation[];
  joinRequests: GroupJoinRequest[];
  adminDelegations: AdminDelegationRequest[];
  inviteLink: string;
  qrBase64: string;
  inviteSettings: InviteSettingsState;
  savedAt: number;
};

type GroupPanelRealtimePayload = {
  grupoId?: string | number;
  groupId?: string | number;
  tipo?: string;
  metadata?: {
    targetUsuarioId?: string | number;
    memberId?: string | number;
    [key: string]: unknown;
  };
};

const GROUP_PANEL_CACHE_TTL_MS = 10 * 60 * 1000;
const getGroupPanelCacheKey = (groupId: string) => `ithera:group-panel:${groupId}`;

function readGroupPanelCache(groupId: string): GroupPanelCache | null {
  if (!groupId || typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(getGroupPanelCacheKey(groupId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as GroupPanelCache;
    if (!parsed || Date.now() - Number(parsed.savedAt ?? 0) > GROUP_PANEL_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(getGroupPanelCacheKey(groupId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeGroupPanelCache(groupId: string, snapshot: GroupPanelCache) {
  if (!groupId || typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getGroupPanelCacheKey(groupId),
      JSON.stringify({ ...snapshot, savedAt: Date.now() }),
    );
  } catch {
    // La caché es una mejora de UX; si el navegador la bloquea, el flujo sigue funcionando.
  }
}


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

  const initialCurrentGroup = useMemo(() => getCurrentGroup(), []);
  const groupId = searchParams.get("groupId") || initialCurrentGroup?.id || "";
  const initialGroup =
    initialCurrentGroup && String(initialCurrentGroup.id) === String(groupId)
      ? initialCurrentGroup
      : null;
  const cachedPanel = useMemo(() => readGroupPanelCache(groupId), [groupId]);
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const latestPanelSnapshotRef = useRef<GroupPanelCache>(cachedPanel ?? {
    group: initialGroup,
    members: [],
    invitations: [],
    joinRequests: [],
    adminDelegations: [],
    inviteLink: "",
    qrBase64: "",
    inviteSettings: { expiresAt: null, maxUses: null, usedCount: 0 },
    savedAt: Date.now(),
  });

  const [group, setGroup] = useState<Group | null>(cachedPanel?.group ?? initialGroup);
  const [members, setMembers] = useState<GroupMember[]>(cachedPanel?.members ?? []);
  const [invitations, setInvitations] = useState<GroupInvitation[]>(cachedPanel?.invitations ?? []);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>(cachedPanel?.joinRequests ?? []);
  const [inviteLink, setInviteLink] = useState(cachedPanel?.inviteLink ?? "");
  const [qrBase64, setQrBase64] = useState(cachedPanel?.qrBase64 ?? "");
  const [inviteSettings, setInviteSettings] = useState<InviteSettingsState>(cachedPanel?.inviteSettings ?? {
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
  });
  const [loading, setLoading] = useState(!cachedPanel);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<GroupMember | null>(
    null,
  );
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [adminDelegations, setAdminDelegations] = useState<AdminDelegationRequest[]>(cachedPanel?.adminDelegations ?? []);
  const [delegationActionLoading, setDelegationActionLoading] = useState<string | null>(null);
  const [joinRequestActionLoading, setJoinRequestActionLoading] = useState<string | null>(null);

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

  const persistPanelCache = useCallback(
    (nextSnapshot: Partial<GroupPanelCache>) => {
      if (!groupId) return;

      const snapshot: GroupPanelCache = {
        ...latestPanelSnapshotRef.current,
        ...nextSnapshot,
        savedAt: Date.now(),
      };

      latestPanelSnapshotRef.current = snapshot;
      writeGroupPanelCache(groupId, snapshot);
    },
    [groupId],
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
        const emptyInviteSettings = { expiresAt: null, maxUses: null, usedCount: 0 };
        setInviteLink("");
        setQrBase64("");
        setInviteSettings(emptyInviteSettings);
        setInvitations([]);
        setJoinRequests([]);
        persistPanelCache({
          group: targetGroup,
          members: targetMembers,
          invitations: [],
          joinRequests: [],
          inviteLink: "",
          qrBase64: "",
          inviteSettings: emptyInviteSettings,
        });
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

      const nextInviteSettings = inviteRes.inviteSettings ?? { expiresAt: null, maxUses: null, usedCount: 0 };

      setInviteLink(inviteRes.inviteLink);
      setInviteSettings(nextInviteSettings);
      setQrBase64(qrRes.qrBase64);
      setInvitations(invitationsRes.invitations);
      setJoinRequests(joinRequestsRes.requests);
      persistPanelCache({
        group: targetGroup,
        members: targetMembers,
        invitations: invitationsRes.invitations,
        joinRequests: joinRequestsRes.requests,
        inviteLink: inviteRes.inviteLink,
        qrBase64: qrRes.qrBase64,
        inviteSettings: nextInviteSettings,
      });
    },
    [accessToken, groupId, localUser?.id_usuario, persistPanelCache],
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

  const loadData = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true;

    if (!accessToken || !groupId) {
      setLoading(false);
      setError("No se recibió un groupId válido");
      return;
    }

    try {
      if (showLoading) setLoading(true);
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
        const nextDelegations = delegationRes.requests ?? [];
        setAdminDelegations(nextDelegations);
        persistPanelCache({
          group: loadedGroup,
          members: membersRes.members,
          adminDelegations: nextDelegations,
        });
      } catch {
        setAdminDelegations([]);
        persistPanelCache({ group: loadedGroup, members: membersRes.members, adminDelegations: [] });
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
  }, [accessToken, groupId, loadAdminData, localUser?.id_usuario, navigate, persistPanelCache]);

  useEffect(() => {
    void loadData({ showLoading: !cachedPanel });
  }, [cachedPanel, loadData]);

  const refreshMembersSnapshot = useCallback(async () => {
    if (!accessToken || !groupId) return;

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
    persistPanelCache({ group: loadedGroup, members: membersRes.members });

    try {
      const delegationRes = await groupsService.getAdminDelegations(groupId, accessToken);
      const nextDelegations = delegationRes.requests ?? [];
      setAdminDelegations(nextDelegations);
      persistPanelCache({ adminDelegations: nextDelegations });
    } catch {
      setAdminDelegations([]);
      persistPanelCache({ adminDelegations: [] });
    }

  }, [accessToken, groupId, localUser?.id_usuario, navigate, persistPanelCache]);

  const refreshJoinRequestsSnapshot = useCallback(async () => {
    if (!accessToken || !groupId || !canManageGroup || !isPrivateGroup) return;

    const requestsRes = await groupsService.getJoinRequests(groupId, accessToken);
    setJoinRequests(requestsRes.requests);
    persistPanelCache({ joinRequests: requestsRes.requests });
  }, [accessToken, canManageGroup, groupId, isPrivateGroup, persistPanelCache]);

  const refreshInvitationsSnapshot = useCallback(async () => {
    if (!accessToken || !groupId || !canManageGroup) return;

    const invitationsRes = await groupsService.getInvitations(groupId, accessToken);
    setInvitations(invitationsRes.invitations);
    persistPanelCache({ invitations: invitationsRes.invitations });
  }, [accessToken, canManageGroup, groupId, persistPanelCache]);

  const refreshForRealtimePayload = useCallback(async (payload: GroupPanelRealtimePayload) => {
    const tipo = String(payload.tipo ?? "");

    if (tipo === "grupo_actualizado") {
      await refreshMembersSnapshot();
      return;
    }

    if (tipo === "miembro_unido" || tipo === "miembro_agregado") {
      await Promise.all([refreshMembersSnapshot(), refreshInvitationsSnapshot()]);
      return;
    }

    if (
      tipo === "miembro_eliminado" ||
      tipo === "miembro_actualizado" ||
      tipo === "rol_actualizado" ||
      tipo === "delegacion_admin_pendiente" ||
      tipo === "delegacion_admin_aceptada" ||
      tipo === "delegacion_admin_rechazada"
    ) {
      await refreshMembersSnapshot();
      return;
    }

    if (
      tipo === "solicitud_union_creada" ||
      tipo === "solicitud_union_resuelta" ||
      tipo === "solicitud_union_rechazada"
    ) {
      await refreshJoinRequestsSnapshot();
      return;
    }

    if (tipo === "solicitud_union_aprobada") {
      await Promise.all([refreshMembersSnapshot(), refreshJoinRequestsSnapshot()]);
      return;
    }

    if (tipo === "invitacion_enviada" || tipo === "invitacion_aceptada") {
      await refreshInvitationsSnapshot();
      return;
    }

    await loadData({ showLoading: false });
  }, [
    loadData,
    refreshInvitationsSnapshot,
    refreshJoinRequestsSnapshot,
    refreshMembersSnapshot,
  ]);

  const scheduleRealtimeRefresh = useCallback((payload: GroupPanelRealtimePayload) => {
    if (realtimeRefreshTimerRef.current !== null) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      void refreshForRealtimePayload(payload).catch(() => {
        void loadData({ showLoading: false });
      });
    }, 180);
  }, [loadData, refreshForRealtimePayload]);

  useEffect(() => {
    if (!socket || !groupId) return;

    const handleRealtime = (payload: GroupPanelRealtimePayload) => {
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

      scheduleRealtimeRefresh(payload);
    };

    socket.emit("join_room", { tripId: groupId });
    socket.on("dashboard_updated", handleRealtime);
    socket.on("group_members_updated", handleRealtime);
    socket.on("group_deleted", handleRealtime);

    return () => {
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }

      socket.emit("leave_room", { tripId: groupId });
      socket.off("dashboard_updated", handleRealtime);
      socket.off("group_members_updated", handleRealtime);
      socket.off("group_deleted", handleRealtime);
    };
  }, [groupId, localUser?.id_usuario, navigate, scheduleRealtimeRefresh, socket]);

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
        const nextDelegations = delegationRes.requests ?? [];
        setAdminDelegations(nextDelegations);
        persistPanelCache({ adminDelegations: nextDelegations });
        alert("Solicitud de administración enviada. El integrante debe aceptarla antes de que cambien los roles.");
      } else {
        const refreshed = await groupsService.getMembers(group.id, accessToken);
        setMembers(refreshed.members);
        persistPanelCache({ members: refreshed.members });
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
      persistPanelCache({ members: membersRes.members, joinRequests: requestsRes.requests });
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
      const nextDelegations = delegationRes.requests ?? [];
      setMembers(membersRes.members);
      setAdminDelegations(nextDelegations);
      setGroup(groupRes.group);
      saveCurrentGroup(groupRes.group);
      persistPanelCache({ group: groupRes.group, members: membersRes.members, adminDelegations: nextDelegations });
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
      persistPanelCache({ members: refreshed.members });
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
        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_left,#EEF4FF_0%,transparent_34%),linear-gradient(180deg,#FFFFFF_0%,#F5F2FF_100%)] px-4 py-8">
          <div className="mx-auto w-full max-w-5xl space-y-5">
            <div className="relative overflow-hidden rounded-3xl border border-[#D9E4F7] bg-white shadow-[0_18px_46px_rgba(30,10,78,0.10)]">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FAFF_45%,#F3EEFF_100%)]" />
              <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#7A4FD6]/20 blur-3xl" />
              <div className="absolute -bottom-20 left-16 h-48 w-48 rounded-full bg-[#35C56A]/20 blur-3xl" />

              <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#1E0A4E] px-3 py-1.5 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#35C56A]" />
                      Panel del grupo
                    </span>
                    <span
                      className={`rounded-full px-3 py-1.5 font-body text-[11px] font-bold ${group.es_publico ? "bg-[#EAFBF1] text-[#167A3D]" : "bg-[#FFF7E6] text-[#A86B00]"}`}
                    >
                      {group.es_publico ? "Grupo público" : "Grupo privado"}
                    </span>
                  </div>

                  <h1
                    className="max-w-full break-words font-heading text-3xl font-extrabold leading-tight text-[#1E0A4E]"
                    title={group.nombre}
                  >
                    {group.nombre}
                  </h1>

                  <p
                    className="mt-2 max-w-2xl break-words font-body text-sm leading-relaxed text-[#64748B]"
                    title={group.descripcion || "Sin descripción"}
                  >
                    {group.descripcion || "Sin descripción"}
                  </p>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#CFE0FF] bg-[#EEF4FF] px-4 py-3">
                      <p className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E6FD9]">
                        Destino
                      </p>
                      <p className="mt-1 break-words font-body text-sm font-bold text-[#1E0A4E]">
                        {group.destino || "Pendiente"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#D8C8FF] bg-[#F3EEFF] px-4 py-3">
                      <p className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[#7A4FD6]">
                        Fechas
                      </p>
                      <p className="mt-1 break-words font-body text-sm font-bold text-[#1E0A4E]">
                        {formatDateRange(group.fecha_inicio, group.fecha_fin)}
                      </p>
                    </div>
                    {!hasReachedCapacity && (
                      <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
                        <p className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]">
                          Código
                        </p>
                        <p className="mt-1 break-words font-body text-sm font-bold text-[#1E0A4E]">
                          {group.codigo_invitacion}
                        </p>
                      </div>
                    )}
                    <div className="rounded-2xl border border-[#BCEBCB] bg-[#EAFBF1] px-4 py-3">
                      <p className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[#167A3D]">
                        Tu rol
                      </p>
                      <p className="mt-1 font-body text-sm font-bold text-[#1E0A4E]">
                        {getDisplayRole(isAdmin ? "admin" : "viajero")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_14px_34px_rgba(30,10,78,0.10)] backdrop-blur">
                  <div>
                    <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">
                      Acciones rápidas
                    </p>
                    <div className="mt-4 grid gap-3">
                      {canInviteGroup && (
                        <button
                          type="button"
                          onClick={() => setIsInviteModalOpen(true)}
                          className="flex min-h-12 items-center justify-between rounded-2xl bg-[#35C56A] px-4 py-3 text-left font-body text-sm font-bold text-white shadow-[0_12px_24px_rgba(53,197,106,0.24)] transition hover:-translate-y-0.5 hover:bg-[#2FB95F]"
                        >
                          <span>Invitar miembros</span>
                          <span>+</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={goToItinerary}
                        className="flex min-h-12 items-center justify-between rounded-2xl bg-[#1E6FD9] px-4 py-3 text-left font-body text-sm font-bold text-white shadow-[0_12px_24px_rgba(30,111,217,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1E5FC0]"
                      >
                        <span>Abrir itinerario</span>
                        <span>›</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#D9E4F7] bg-[linear-gradient(135deg,#F8FAFF,#FFFFFF)] px-4 py-3">
                    <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">
                      Ocupación
                    </p>
                    <p className="mt-1 font-heading text-2xl font-extrabold text-[#1E0A4E]">
                      {members.length}
                      {group.maximo_miembros ? ` / ${group.maximo_miembros}` : ""}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#1E6FD9,#35C56A)]"
                        style={{
                          width: `${group.maximo_miembros ? Math.min((members.length / Number(group.maximo_miembros)) * 100, 100) : 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {copied && (
                <p className="relative px-6 pb-5 text-sm font-semibold text-[#35C56A]">
                  Enlace copiado correctamente.
                </p>
              )}
            </div>

            {isReadOnly && (
              <div className="rounded-2xl border border-[#CBD5E1] bg-white px-5 py-4 shadow-sm">
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
              <div className="rounded-2xl border border-[#F7D37A] bg-[#FFF8E5] px-5 py-4 shadow-sm">
                <p className="font-heading text-sm font-semibold text-[#8A5A00]">
                  Delegación de administración pendiente
                </p>
                <p className="mt-1 font-body text-sm leading-relaxed text-[#8A5A00]">
                  Esperando respuesta de {outgoingAdminDelegation.to_nombre || outgoingAdminDelegation.to_email || "el integrante"}. La solicitud expira a las {new Date(outgoingAdminDelegation.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                </p>
              </div>
            )}

            {incomingAdminDelegation && (
              <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-5 py-4 shadow-sm">
                <p className="font-heading text-sm font-semibold text-[#1D4ED8]">
                  Tienes una solicitud para ser organizador
                </p>
                <p className="mt-1 font-body text-sm leading-relaxed text-[#1E40AF]">
                  {incomingAdminDelegation.from_nombre || incomingAdminDelegation.from_email || "El organizador"} quiere delegarte la administración de este viaje. Puedes aceptarla o rechazarla desde el aviso emergente.
                </p>
              </div>
            )}

            {canManageGroup && hasReachedCapacity && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 shadow-sm">
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
              <div className="overflow-hidden rounded-3xl border border-[#D9E4F7] bg-white shadow-[0_16px_38px_rgba(30,10,78,0.08)]">
                <div className="border-b border-[#E2E8F0] bg-[linear-gradient(90deg,#FFFFFF,#F8FAFF)] px-6 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="mb-1 inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E6FD9]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1E6FD9]" />
                        Comunidad
                      </p>
                      <h2 className="font-heading text-xl font-extrabold text-[#1E0A4E]">
                        Miembros del grupo
                      </h2>
                    </div>
                    <HelpButton
                      title="Miembros y roles"
                      description="Consulta quién forma parte del viaje y su rol. Solo el organizador puede cambiar roles o expulsar integrantes; los viajeros solo ven la lista."
                      placement="right"
                    />
                  </div>
                </div>

                <div className="space-y-3 p-6">
                  {members.map((member) => {
                    const isSelf =
                      String(member.usuario_id) ===
                      String(localUser?.id_usuario);
                    const memberName = member.nombre || member.email || "Usuario";
                    const memberInitials = getInitials(memberName) || "U";

                    return (
                      <div
                        key={member.id}
                        className="grid grid-cols-1 gap-3 rounded-2xl border border-[#E2E8F0] bg-[#FAFCFF] px-4 py-4 transition hover:border-[#CFE0FF] hover:bg-white hover:shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-heading text-sm font-bold text-white ${member.rol === "admin" ? "bg-[#1E6FD9]" : "bg-[#7A4FD6]"}`}
                          >
                            {memberInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-body text-sm font-bold text-[#1E0A4E]" title={memberName}>
                              {memberName}{" "}
                              {isSelf && (
                                <span className="text-[#7A8799]">(tú)</span>
                              )}
                            </p>

                            <p className="truncate font-body text-xs text-[#7A8799]" title={member.email || ""}>
                              {member.email}
                            </p>
                          </div>
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
                                className="whitespace-nowrap rounded-xl border border-[#D8C8FF] bg-white px-3 py-2 text-xs font-semibold text-[#6D45C0] hover:bg-[#F7F2FF]"
                              >
                                Cambiar rol
                              </button>

                              <button
                                onClick={() => handleRemove(member)}
                                className="whitespace-nowrap rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
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
                <div className="overflow-hidden rounded-3xl border border-[#D9E4F7] bg-white shadow-[0_16px_38px_rgba(30,10,78,0.08)]">
                  <div className="border-b border-[#E2E8F0] bg-[linear-gradient(90deg,#FFFFFF,#F7F2FF)] px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="mb-1 inline-flex items-center gap-2 rounded-full bg-[#F3EEFF] px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[#7A4FD6]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#7A4FD6]" />
                          Acceso
                        </p>
                        <h2 className="font-heading text-xl font-extrabold text-[#1E0A4E]">
                          Invitación del grupo
                        </h2>
                        <p className="mt-1 font-body text-sm text-[#7A8799]">
                          Comparte el QR, el enlace o envía invitaciones por correo.
                        </p>
                      </div>
                      <HelpButton
                        title="Invitaciones"
                        description="Comparte el acceso solo cuando el grupo tenga cupo. En grupos privados, las solicitudes quedan pendientes hasta que el organizador las apruebe."
                        placement="right"
                      />
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="rounded-3xl border border-[#E2E8F0] bg-[linear-gradient(180deg,#F8FAFC,#FFFFFF)] p-5 text-center">
                      {qrBase64 ? (
                        <img
                          src={qrBase64}
                          alt="QR de invitación"
                          className="mx-auto h-48 w-48 rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-sm"
                        />
                      ) : (
                        <div className="mx-auto h-48 w-48 rounded-xl border border-[#E2E8F0] bg-white" />
                      )}

                      <p className="mt-4 break-all font-body text-xs text-[#7A8799]">
                        {inviteLink}
                      </p>

                      <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="mt-4 w-full rounded-2xl border border-[#D8C8FF] bg-white px-4 py-3 text-sm font-bold text-[#6D45C0] transition hover:-translate-y-0.5 hover:bg-[#F7F2FF]"
                      >
                        Compartir invitación
                      </button>

                      <button
                        onClick={handleCopy}
                        className="mt-2 w-full rounded-2xl bg-[#1E0A4E] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(30,10,78,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
                      >
                        Copiar enlace
                      </button>
                    </div>

                  {isPrivateGroup && (
                    <div className="mt-6 rounded-3xl border border-[#FFE2A8] bg-[#FFFBF0] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[#A86B00]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                            Privado
                          </p>
                          <h3 className="mt-2 font-heading text-base font-bold text-[#1E0A4E]">
                            Solicitudes de unión
                          </h3>
                        </div>
                        <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-xs font-bold text-[#A86B00]">
                          {joinRequests.length}
                        </span>
                      </div>
                      <p className="mt-2 font-body text-xs leading-relaxed text-[#7A8799]">
                        En grupos privados, quienes usen el código quedan pendientes hasta que el administrador apruebe o rechace la solicitud.
                      </p>

                      {joinRequests.length === 0 ? (
                        <p className="mt-3 rounded-2xl border border-[#FFE2A8] bg-white px-4 py-3 font-body text-sm font-medium text-[#A86B00]">
                          No hay solicitudes pendientes.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {joinRequests.map((request) => (
                            <div
                              key={request.id}
                              className="rounded-2xl border border-[#FFE2A8] bg-white px-4 py-3"
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
                                  className="rounded-xl bg-[#35C56A] px-3 py-2 text-xs font-bold text-white hover:bg-[#2FB95F] disabled:cursor-not-allowed disabled:opacity-60"
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
                                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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

                  <div className="mt-6 rounded-3xl border border-[#D8C8FF] bg-[#FBF8FF] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[#7A4FD6]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#7A4FD6]" />
                          Enviadas
                        </p>
                        <h3 className="mt-2 font-heading text-base font-bold text-[#1E0A4E]">
                          Invitaciones pendientes
                        </h3>
                      </div>
                      <span className="rounded-full bg-[#F3EEFF] px-3 py-1 text-xs font-bold text-[#7A4FD6]">
                        {pendingInvitations.length}
                      </span>
                    </div>

                    {pendingInvitations.length === 0 ? (
                      <p className="mt-3 rounded-2xl border border-[#D8C8FF] bg-white px-4 py-3 font-body text-sm font-medium text-[#7A4FD6]">
                        Todavía no hay invitaciones pendientes.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {pendingInvitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-[#D8C8FF] bg-white px-4 py-3"
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
            persistPanelCache({ inviteSettings: settings });
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
            persistPanelCache({
              members: membersRes.members,
              invitations: invitationsRes.invitations,
              joinRequests: joinRequestsRes.requests,
            });
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
