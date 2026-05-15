import crypto from 'crypto';
import { sendEmail } from '../../services/email.service';
import { supabase } from '../../infrastructure/db/supabase.client';
import { getPlaceDetails } from '../maps/maps.service';
import { baseTemplate } from '../../infrastructure/email/templates/baseTemplate';
import { emitGroupDeleted } from '../../infrastructure/sockets/socket.gateway';
import {
  CreateGroupInvitationsPayload,
  CreateGroupPayload,
  GroupInvitePreview,
  GroupTravelContext,
  JoinGroupPayload,
  MemberRole,
  UpdateGroupPayload,
} from './groups.entity';
import * as NotificationsService from '../notifications/notifications.service';


const GROUP_NAME_MAX_LENGTH = 60;
const GROUP_DESCRIPTION_MAX_LENGTH = 300;
const MAX_TRIP_DURATION_DAYS = 60;

const normalizeRequiredText = (value: unknown, fieldLabel: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`ERR-23-001: ${fieldLabel} es requerido`), { statusCode: 400 });
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw Object.assign(
      new Error(`ERR-23-001: ${fieldLabel} permite máximo ${maxLength} caracteres`),
      { statusCode: 400 }
    );
  }

  return normalized;
};

const normalizeOptionalText = (value: unknown, fieldLabel: string, maxLength: number): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw Object.assign(new Error(`ERR-23-001: ${fieldLabel} debe ser texto válido`), { statusCode: 400 });
  }

  const normalized = value.trim();
  if (!normalized) return null;

  if (normalized.length > maxLength) {
    throw Object.assign(
      new Error(`ERR-23-001: ${fieldLabel} permite máximo ${maxLength} caracteres`),
      { statusCode: 400 }
    );
  }

  return normalized;
};

const isValidISODate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const daysBetweenISO = (startDate: string, endDate: string): number | null => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);
};

const validateTripDateRange = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate || !endDate) return;

  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    throw Object.assign(new Error('ERR-23-001: Las fechas del viaje tienen formato inválido'), { statusCode: 400 });
  }

  const durationDays = daysBetweenISO(startDate, endDate);

  if (durationDays === null || durationDays < 1) {
    throw Object.assign(
      new Error('ERR-23-003: La fecha de regreso debe ser posterior a la de inicio del viaje'),
      { statusCode: 400 }
    );
  }

  if (durationDays > MAX_TRIP_DURATION_DAYS) {
    throw Object.assign(
      new Error(`ERR-23-003: La duración máxima del viaje es de ${MAX_TRIP_DURATION_DAYS} días`),
      { statusCode: 400 }
    );
  }
};

const generateGroupCode = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
};

const generateUniqueCode = async (): Promise<string> => {
  let code = '';
  let exists = true;

  while (exists) {
    code = generateGroupCode(8);
    const { data, error } = await supabase
      .from('grupos_viaje')
      .select('id')
      .eq('codigo_invitacion', code)
      .maybeSingle();

    if (error) throw new Error(error.message);
    exists = !!data;
  }

  return code;
};

const normalizeInviteCode = (code: string): string => code.trim().toUpperCase();

const generateInviteToken = (): string =>
  `${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;

const getFrontendJoinLink = (code: string): string => {
  const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  return `${baseUrl}/join-group?code=${encodeURIComponent(code)}`;
};

const getFrontendPath = (path: string): string => path;

const getGroupPanelPath = (groupId: number | string): string =>
  getFrontendPath(`/grouppanel?groupId=${encodeURIComponent(String(groupId))}`);

const getGroupDashboardPath = (groupId: number | string): string =>
  getFrontendPath(`/dashboard?groupId=${encodeURIComponent(String(groupId))}`);

const buildInviteEmailHtml = ({
  groupName,
  groupDescription,
  inviteLink,
}: {
  groupName: string;
  groupDescription?: string | null;
  inviteLink: string;
}) => {
  const safeDescription = groupDescription?.trim();

  const content = `
    <p style="margin:0 0 14px 0;">
      Has recibido una invitación para unirte al grupo:
    </p>

    <p style="margin:0 0 10px 0; font-size:18px; font-weight:700; color:#111827;">
      ${groupName}
    </p>

    ${
      safeDescription
        ? `
      <p style="margin:0 0 18px 0;">
        ${safeDescription}
      </p>
    `
        : ''
    }

    <p style="margin:0 0 22px 0;">
      Da clic en el siguiente botón para unirte:
    </p>

    <a
      href="${inviteLink}"
      style="
        display:inline-block;
        padding:12px 24px;
        background-color:#4CAF50;
        color:#ffffff;
        text-decoration:none;
        border-radius:8px;
        font-weight:700;
      "
    >
      Unirme al grupo
    </a>

    <p style="margin:24px 0 0 0; font-size:12px; color:#9ca3af;">
      Si no esperabas esta invitación, puedes ignorar este correo.
    </p>
  `;

  return baseTemplate({
    title: 'Te invitaron a un grupo',
    content,
  });
};

const getLocalUserRecord = async (
  authUserId: string
): Promise<{ id_usuario: number; email: string | null; nombre: string | null }> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id_usuario, email, nombre')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) {
    throw new Error('Usuario no encontrado en tabla local');
  }

  return {
    id_usuario: Number(data.id_usuario),
    email: data.email ?? null,
    nombre: data.nombre ?? null,
  };
};

export const getLocalUserId = async (authUserId: string): Promise<string> => {
  const user = await getLocalUserRecord(authUserId);
  return String(user.id_usuario);
};

const getGroupById = async (groupId: string) => {
  const { data, error } = await supabase
    .from('grupos_viaje')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error || !data) {
    throw Object.assign(new Error('Grupo no encontrado'), { statusCode: 404 });
  }

  return data;
};

type DestinationPayload = Pick<
  CreateGroupPayload | UpdateGroupPayload,
  | 'destino_latitud'
  | 'destino_longitud'
  | 'destino_place_id'
  | 'destino_formatted_address'
  | 'destino_photo_name'
  | 'destino_photo_url'
>;

const buildDestinationFields = async (payload: DestinationPayload) => {
  const placeId = payload.destino_place_id ?? null;

  if (!placeId) {
    return {
      destino_latitud: payload.destino_latitud ?? null,
      destino_longitud: payload.destino_longitud ?? null,
      destino_place_id: null,
      destino_formatted_address: payload.destino_formatted_address ?? null,
      destino_photo_name: payload.destino_photo_name ?? null,
      destino_photo_url: payload.destino_photo_url ?? null,
    };
  }

  try {
    const details = await getPlaceDetails(placeId);

    return {
      destino_latitud: details?.latitude ?? payload.destino_latitud ?? null,
      destino_longitud: details?.longitude ?? payload.destino_longitud ?? null,
      destino_place_id: details?.id ?? placeId,
      destino_formatted_address:
        details?.formattedAddress ?? payload.destino_formatted_address ?? null,
      destino_photo_name: details?.photoName ?? payload.destino_photo_name ?? null,
      destino_photo_url: details?.photoUrl ?? payload.destino_photo_url ?? null,
    };
  } catch {
    return {
      destino_latitud: payload.destino_latitud ?? null,
      destino_longitud: payload.destino_longitud ?? null,
      destino_place_id: placeId,
      destino_formatted_address: payload.destino_formatted_address ?? null,
      destino_photo_name: payload.destino_photo_name ?? null,
      destino_photo_url: payload.destino_photo_url ?? null,
    };
  }
};

const ensureDestinationPhotoCached = async (grupo: any) => {
  if (!grupo?.destino_place_id || grupo.destino_photo_url) return grupo;

  const destinationFields = await buildDestinationFields({
    destino_latitud: grupo.destino_latitud ?? null,
    destino_longitud: grupo.destino_longitud ?? null,
    destino_place_id: grupo.destino_place_id ?? null,
    destino_formatted_address: grupo.destino_formatted_address ?? null,
    destino_photo_name: grupo.destino_photo_name ?? null,
    destino_photo_url: grupo.destino_photo_url ?? null,
  });

  if (!destinationFields.destino_photo_url) return grupo;

  const { data } = await supabase
    .from('grupos_viaje')
    .update({
      destino_latitud: destinationFields.destino_latitud,
      destino_longitud: destinationFields.destino_longitud,
      destino_formatted_address: destinationFields.destino_formatted_address,
      destino_photo_name: destinationFields.destino_photo_name,
      destino_photo_url: destinationFields.destino_photo_url,
    })
    .eq('id', grupo.id)
    .select('*')
    .single();

  return data ?? grupo;
};

const getMembership = async (groupId: string, usuarioId: string) => {
  const { data, error } = await supabase
    .from('grupo_miembros')
    .select('id, rol, usuario_id, grupo_id')
    .eq('grupo_id', groupId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

const ensureGroupMember = async (authUserId: string, groupId: string) => {
  const usuarioId = await getLocalUserId(authUserId);
  const membership = await getMembership(groupId, usuarioId);

  if (!membership) {
    throw Object.assign(new Error('No perteneces a este grupo'), { statusCode: 403 });
  }

  return { usuarioId, membership };
};

const ensureGroupAdmin = async (authUserId: string, groupId: string) => {
  const { usuarioId, membership } = await ensureGroupMember(authUserId, groupId);

  if (membership.rol !== 'admin') {
    throw Object.assign(new Error('Solo un administrador puede realizar esta acción'), {
      statusCode: 403,
    });
  }

  return { usuarioId, membership };
};

const countMembers = async (groupId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('grupo_miembros')
    .select('id', { count: 'exact', head: true })
    .eq('grupo_id', groupId);

  if (error) throw new Error(error.message);
  return count ?? 0;
};

const isGroupAtCapacity = async (grupo: { id: number | string; maximo_miembros?: number | null }): Promise<boolean> => {
  if (!grupo.maximo_miembros) return false;
  const memberCount = await countMembers(String(grupo.id));
  return memberCount >= Number(grupo.maximo_miembros);
};

const throwGroupAtCapacity = (): never => {
  throw Object.assign(new Error('ERR-24-002: Este grupo ya alcanzó su capacidad máxima de miembros.'), {
    statusCode: 409,
    code: 'GROUP_CAPACITY_REACHED',
  });
};

const normalizeMaxMembers = (value?: number | null): number | null => {
  if (value === undefined || value === null) return null;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw Object.assign(new Error('ERR-23-001: El máximo de miembros debe estar entre 1 y 50'), {
      statusCode: 400,
    });
  }

  return parsed;
};

export const getGroupDetails = async (authUserId: string, groupId: string) => {
  const { membership } = await ensureGroupMember(authUserId, groupId);
  const grupo = await ensureDestinationPhotoCached(await getGroupById(groupId));
  const memberCount = await countMembers(groupId);

  return {
    ...grupo,
    memberCount,
    myRole: membership.rol,
  };
};


const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildDestinationTravelLocation = (grupo: any) => ({
  source: 'destino_viaje' as const,
  label: grupo.destino_formatted_address ?? grupo.destino ?? null,
  formattedAddress: grupo.destino_formatted_address ?? grupo.destino ?? null,
  latitude: toNullableNumber(grupo.destino_latitud),
  longitude: toNullableNumber(grupo.destino_longitud),
  placeId: grupo.destino_place_id ?? null,
  photoUrl: grupo.destino_photo_url ?? null,
});

const buildPersistedStartLocation = (grupo: any) => {
  const latitude = toNullableNumber(grupo.punto_partida_latitud);
  const longitude = toNullableNumber(grupo.punto_partida_longitud);

  if (grupo.punto_partida_tipo !== 'hotel_reservado' || latitude === null || longitude === null) {
    return null;
  }

  return {
    source: 'hotel_reservado' as const,
    label: grupo.punto_partida_nombre ?? 'Hotel reservado',
    formattedAddress: grupo.punto_partida_direccion ?? grupo.punto_partida_nombre ?? null,
    latitude,
    longitude,
    placeId: grupo.punto_partida_place_id ?? null,
    photoUrl: null,
    hotelId: grupo.punto_partida_hospedaje_id ? String(grupo.punto_partida_hospedaje_id) : null,
    folioReserva: null,
  };
};

const getConfirmedHotelStartLocation = async (groupId: string) => {
  const { data: proposals, error: proposalsError } = await supabase
    .from('propuestas')
    .select('id_propuesta')
    .eq('grupo_id', groupId)
    .eq('tipo_item', 'hospedaje')
    .in('estado', ['aprobada', 'guardada', 'en_votacion']);

  if (proposalsError) throw new Error(proposalsError.message);

  const proposalIds = (proposals ?? [])
    .map((proposal: any) => Number(proposal.id_propuesta))
    .filter((id) => Number.isFinite(id));

  if (!proposalIds.length) return null;

  const { data: hotels, error: hotelsError } = await supabase
    .from('hospedajes')
    .select('id_hospedaje, propuesta_id, nombre, direccion, latitud, longitud, google_place_id, foto_url, folio_reserva, reserva_estado, ultima_actualizacion, fecha_creacion')
    .in('propuesta_id', proposalIds)
    .eq('reserva_estado', 'confirmada_simulada')
    .order('ultima_actualizacion', { ascending: false })
    .order('fecha_creacion', { ascending: false })
    .limit(1);

  if (hotelsError) throw new Error(hotelsError.message);

  const hotel = hotels?.[0];
  const latitude = toNullableNumber((hotel as any)?.latitud);
  const longitude = toNullableNumber((hotel as any)?.longitud);

  if (!hotel || latitude === null || longitude === null) return null;

  return {
    source: 'hotel_reservado' as const,
    label: (hotel as any).nombre ?? 'Hotel reservado',
    formattedAddress: (hotel as any).direccion ?? (hotel as any).nombre ?? null,
    latitude,
    longitude,
    placeId: (hotel as any).google_place_id ?? null,
    photoUrl: (hotel as any).foto_url ?? null,
    hotelId: String((hotel as any).id_hospedaje),
    folioReserva: (hotel as any).folio_reserva ?? null,
  };
};

export const getGroupTravelContext = async (authUserId: string, groupId: string): Promise<GroupTravelContext> => {
  await ensureGroupMember(authUserId, groupId);
  const grupo = await ensureDestinationPhotoCached(await getGroupById(groupId));
  const destinationLocation = buildDestinationTravelLocation(grupo);
  const persistedStartLocation = buildPersistedStartLocation(grupo);
  const hotelStartLocation = persistedStartLocation ?? await getConfirmedHotelStartLocation(groupId);

  return {
    groupId: String(grupo.id),
    startLocation: hotelStartLocation ?? destinationLocation,
    destinationLocation,
  };
};

export const createGroup = async (authUserId: string, payload: CreateGroupPayload) => {
  const usuarioId = await getLocalUserId(authUserId);
  const codigo = await generateUniqueCode();
  const nombre = normalizeRequiredText(payload.nombre, 'El nombre del grupo', GROUP_NAME_MAX_LENGTH);
  const descripcion = normalizeOptionalText(
    payload.descripcion,
    'La descripción',
    GROUP_DESCRIPTION_MAX_LENGTH
  );
  const destinationFields = await buildDestinationFields(payload);
  const maximoMiembros = normalizeMaxMembers(payload.maximo_miembros);
  const presupuestoTotal = Number(payload.presupuesto_total);

  if (!Number.isFinite(presupuestoTotal) || presupuestoTotal <= 0) {
    throw Object.assign(
      new Error('ERR-23-004: El monto del presupuesto debe ser un número positivo mayor a cero'),
      { statusCode: 400 }
    );
  }

  validateTripDateRange(payload.fecha_inicio ?? null, payload.fecha_fin ?? null);

  const { data: grupo, error: groupError } = await supabase
    .from('grupos_viaje')
    .insert({
      nombre,
      descripcion,
      destino: payload.destino ?? null,
      fecha_inicio: payload.fecha_inicio ?? null,
      fecha_fin: payload.fecha_fin ?? null,
      maximo_miembros: maximoMiembros,
      es_publico: payload.es_publico ?? false,
      presupuesto_total: presupuestoTotal,
      codigo_invitacion: codigo,
      creado_por: Number(usuarioId),
      estado: 'activo',
      ...destinationFields,
    })
    .select('*')
    .single();

  if (groupError || !grupo) {
    throw new Error(groupError?.message ?? 'Error al crear grupo');
  }

  const { error: memberError } = await supabase
    .from('grupo_miembros')
    .insert({ grupo_id: grupo.id, usuario_id: Number(usuarioId), rol: 'admin' });

  if (memberError) throw new Error(memberError.message);

  NotificationsService.emitGroupDashboardUpdated(Number(grupo.id), {
    tipo: 'grupo_creado',
    entidadTipo: 'grupo',
    entidadId: Number(grupo.id),
    actorUsuarioId: Number(usuarioId),
    metadata: { itemTitle: grupo.nombre, itemType: 'grupo' },
  });

  return {
    ...grupo,
    memberCount: 1,
    myRole: 'admin',
  };
};

export const joinGroupByCode = async (authUserId: string, payload: JoinGroupPayload) => {
  const localUser = await getLocalUserRecord(authUserId);
  const usuarioId = String(localUser.id_usuario);
  const normalizedCode = normalizeInviteCode(payload.codigo);

  const { data: grupo, error: groupError } = await supabase
    .from('grupos_viaje')
    .select('*')
    .eq('codigo_invitacion', normalizedCode)
    .eq('estado', 'activo')
    .single();

  if (groupError || !grupo) {
    throw Object.assign(new Error('Grupo no encontrado o inactivo'), { statusCode: 404 });
  }

  const { data: existente, error: existingError } = await supabase
    .from('grupo_miembros')
    .select('id')
    .eq('grupo_id', grupo.id)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existente) {
    throw Object.assign(new Error('El usuario ya pertenece a este grupo'), { statusCode: 409 });
  }

  if (await isGroupAtCapacity(grupo)) {
    throwGroupAtCapacity();
  }

  const isPublicGroup = grupo.es_publico === true;

  if (!isPublicGroup) {
    const { data: existingRequest, error: requestLookupError } = await supabase
      .from('grupo_solicitudes_union')
      .select('id, estado')
      .eq('grupo_id', grupo.id)
      .eq('usuario_id', localUser.id_usuario)
      .eq('estado', 'pendiente')
      .maybeSingle();

    if (requestLookupError) throw new Error(requestLookupError.message);

    if (existingRequest) {
      throw Object.assign(new Error('Tu solicitud para unirte a este grupo privado está pendiente de aprobación.'), {
        statusCode: 409,
        code: 'JOIN_REQUEST_PENDING',
      });
    }

    const { data: createdRequest, error: requestError } = await supabase
      .from('grupo_solicitudes_union')
      .insert({
        grupo_id: grupo.id,
        usuario_id: localUser.id_usuario,
        codigo_invitacion: normalizedCode,
        estado: 'pendiente',
      })
      .select('id')
      .single();

    if (requestError) throw new Error(requestError.message);

    const { data: admins } = await supabase
      .from('grupo_miembros')
      .select('usuario_id')
      .eq('grupo_id', grupo.id)
      .eq('rol', 'admin');

    const actorName = localUser.nombre || localUser.email || 'Un viajero';

    if (admins) {
      for (const admin of admins) {
        await NotificationsService.createNotification({
          usuarioId: Number(admin.usuario_id),
          grupoId: Number(grupo.id),
          tipo: 'solicitud_union',
          titulo: 'Solicitud para unirse al grupo',
          mensaje: `${actorName} quiere unirse al grupo privado "${grupo.nombre}". Revisa la solicitud para aprobarla o rechazarla.`,
          entidadTipo: 'grupo_solicitud_union',
          entidadId: Number(createdRequest.id),
          metadata: {
            actorName,
            actorUsuarioId: Number(localUser.id_usuario),
            itemTitle: grupo.nombre,
            itemType: 'grupo',
            requestId: Number(createdRequest.id),
            actionLabel: 'Ir al panel de solicitudes',
            actionUrl: getGroupPanelPath(grupo.id),
          },
        });
      }
    }

    NotificationsService.emitGroupDashboardUpdated(Number(grupo.id), {
      tipo: 'solicitud_union_creada',
      entidadTipo: 'grupo_solicitud_union',
      entidadId: Number(createdRequest.id),
      actorUsuarioId: Number(localUser.id_usuario),
      metadata: {
        actorName,
        itemTitle: grupo.nombre,
        requestId: Number(createdRequest.id),
        actionLabel: 'Ir al panel de solicitudes',
        actionUrl: getGroupPanelPath(grupo.id),
      },
    });

    return {
      ...grupo,
      memberCount: await countMembers(String(grupo.id)),
      myRole: 'pendiente_aprobacion',
      joinRequestId: String(createdRequest.id),
      requiresApproval: true,
    };
  }

  const { error: insertError } = await supabase
    .from('grupo_miembros')
    .insert({ grupo_id: grupo.id, usuario_id: localUser.id_usuario, rol: 'viajero' });

  if (insertError) throw new Error(insertError.message);

  if (localUser.email) {
    await supabase
      .from('grupo_invitaciones')
      .update({
        estado: 'aceptada',
        accepted_by: localUser.id_usuario,
        accepted_at: new Date().toISOString(),
      })
      .eq('grupo_id', grupo.id)
      .eq('email', localUser.email.toLowerCase())
      .eq('estado', 'pendiente');
  }

  // Notificar a los admins del grupo
  const { data: admins } = await supabase.from('grupo_miembros').select('usuario_id').eq('grupo_id', grupo.id).eq('rol', 'admin');
  if (admins) {
    const actorName = localUser.nombre || localUser.email || 'Un miembro';
    for (const admin of admins) {
      if (String(admin.usuario_id) !== String(localUser.id_usuario)) {
        await NotificationsService.createNotification({
          usuarioId: Number(admin.usuario_id),
          grupoId: Number(grupo.id),
          tipo: 'miembro_unido',
          titulo: 'Nuevo miembro',
          mensaje: `${actorName} se unió al grupo "${grupo.nombre}".`,
          entidadTipo: 'grupo',
          entidadId: Number(grupo.id),
          metadata: {
            actorName,
            actorUsuarioId: Number(localUser.id_usuario),
            itemTitle: grupo.nombre,
            itemType: 'grupo',
            actionLabel: 'Ver grupo',
            actionUrl: getGroupPanelPath(grupo.id),
          },
        });
      }
    }

    NotificationsService.emitGroupDashboardUpdated(Number(grupo.id), {
      tipo: 'miembro_unido',
      entidadTipo: 'grupo',
      entidadId: Number(grupo.id),
      actorUsuarioId: Number(localUser.id_usuario),
      metadata: { actorName, itemTitle: grupo.nombre },
    });
  }

  const memberCount = await countMembers(String(grupo.id));

  return {
    ...grupo,
    memberCount,
    myRole: 'viajero',
  };
};

export const getGroupMembers = async (authUserId: string, groupId: string) => {
  await ensureGroupMember(authUserId, groupId);

  const { data: memberships, error } = await supabase
    .from('grupo_miembros')
    .select('id, usuario_id, rol')
    .eq('grupo_id', groupId);

  if (error) throw new Error(error.message);

  const userIds = Array.from(new Set((memberships ?? [])
    .map((item: any) => Number(item.usuario_id))
    .filter((id) => Number.isFinite(id))));

  const users = await Promise.all(userIds.map(async (userId) => {
    const { data, error: userError } = await supabase
      .from('usuarios')
      .select('id_usuario, nombre, email, avatar_url')
      .eq('id_usuario', userId)
      .maybeSingle();
    if (userError) throw new Error(userError.message);
    return data;
  }));

  const usersById = new Map((users ?? []).map((user: any) => [String(user.id_usuario), user]));

  return (memberships ?? []).map((item: any) => {
    const user = usersById.get(String(item.usuario_id));
    return ({
    id: String(item.id),
    usuario_id: String(item.usuario_id),
    rol: item.rol,
    nombre: user?.nombre ?? user?.email ?? `Usuario ${item.usuario_id}`,
    email: user?.email ?? '',
    avatar_url: user?.avatar_url ?? null,
  });
  });
};

export const updateMemberRole = async (
  authUserId: string,
  memberId: string,
  rol: MemberRole
) => {
  const { data: targetMember, error: memberLookupError } = await supabase
    .from('grupo_miembros')
    .select('id, grupo_id, usuario_id, rol')
    .eq('id', memberId)
    .single();

  if (memberLookupError || !targetMember) {
    throw Object.assign(new Error('Miembro no encontrado'), { statusCode: 404 });
  }

  await ensureGroupAdmin(authUserId, String(targetMember.grupo_id));

  const { data, error } = await supabase
    .from('grupo_miembros')
    .update({ rol })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const actorUsuarioId = await getLocalUserId(authUserId);
  const actorName = await NotificationsService.getUserDisplayName(actorUsuarioId);
  NotificationsService.emitGroupDashboardUpdated(Number(targetMember.grupo_id), {
    tipo: 'miembro_actualizado',
    entidadTipo: 'grupo_miembro',
    entidadId: Number(memberId),
    actorUsuarioId: Number(actorUsuarioId),
    metadata: {
      actorName,
      targetUsuarioId: Number(targetMember.usuario_id),
      memberId: Number(memberId),
      rol,
    },
  });

  return data;
};

export const removeMember = async (
  authUserId: string,
  groupId: string,
  memberId: string
) => {
  const { membership } = await ensureGroupAdmin(authUserId, groupId);

  const { data: targetMember, error: targetError } = await supabase
    .from('grupo_miembros')
    .select('id, usuario_id, rol, grupo_id')
    .eq('id', memberId)
    .eq('grupo_id', groupId)
    .single();

  if (targetError || !targetMember) {
    throw Object.assign(new Error('Miembro no encontrado en este grupo'), { statusCode: 404 });
  }

  if (String(targetMember.usuario_id) === String(membership.usuario_id)) {
    throw Object.assign(new Error('No puedes expulsarte a ti mismo'), { statusCode: 400 });
  }

  const { error } = await supabase
    .from('grupo_miembros')
    .delete()
    .eq('id', memberId)
    .eq('grupo_id', groupId);

  if (error) throw new Error(error.message);

  const actorName = await NotificationsService.getUserDisplayName(membership.usuario_id);
  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'miembro_eliminado',
    entidadTipo: 'grupo_miembro',
    entidadId: Number(memberId),
    actorUsuarioId: Number(membership.usuario_id),
    metadata: {
      actorName,
      targetUsuarioId: Number(targetMember.usuario_id),
      targetRole: targetMember.rol,
      memberId: Number(memberId),
    },
  });

  return { ok: true };
};

export const getInviteInfo = async (authUserId: string, groupId: string) => {
  await ensureGroupMember(authUserId, groupId);
  const grupo = await getGroupById(groupId);

  if (await isGroupAtCapacity(grupo)) {
    throwGroupAtCapacity();
  }

  const inviteLink = getFrontendJoinLink(grupo.codigo_invitacion);

  return {
    groupId: String(grupo.id),
    codigo: grupo.codigo_invitacion,
    inviteLink,
  };
};

export const getInvitePreviewByCode = async (
  codigo: string
): Promise<GroupInvitePreview> => {
  const normalizedCode = normalizeInviteCode(codigo);

  const { data: grupo, error } = await supabase
    .from('grupos_viaje')
    .select('*')
    .eq('codigo_invitacion', normalizedCode)
    .eq('estado', 'activo')
    .single();

  if (error || !grupo) {
    throw Object.assign(new Error('Invitación no encontrada o grupo inactivo'), {
      statusCode: 404,
    });
  }

  const memberCount = await countMembers(String(grupo.id));
  const canJoin = grupo.maximo_miembros ? memberCount < grupo.maximo_miembros : true;

  return {
    groupId: String(grupo.id),
    nombre: grupo.nombre,
    descripcion: grupo.descripcion ?? null,
    destino: grupo.destino ?? null,
    fecha_inicio: grupo.fecha_inicio ?? null,
    fecha_fin: grupo.fecha_fin ?? null,
    estado: grupo.estado,
    codigo: grupo.codigo_invitacion,
    memberCount,
    maximo_miembros: grupo.maximo_miembros ?? null,
    es_publico: grupo.es_publico ?? false,
    canJoin,
    cannotJoinReason: canJoin ? null : 'GROUP_CAPACITY_REACHED',
    requiresApproval: grupo.es_publico !== true,
  };
};

export const getGroupInvitations = async (authUserId: string, groupId: string) => {
  await ensureGroupAdmin(authUserId, groupId);

  const { data, error } = await supabase
    .from('grupo_invitaciones')
    .select('id, email, codigo_invitacion, estado, created_at')
    .eq('grupo_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((item) => ({
    id: String(item.id),
    email: item.email,
    codigo_invitacion: item.codigo_invitacion,
    estado: item.estado,
    created_at: item.created_at,
  }));
};

export const createGroupInvitations = async (
  authUserId: string,
  groupId: string,
  payload: CreateGroupInvitationsPayload
) => {
  const { usuarioId } = await ensureGroupAdmin(authUserId, groupId);
  const grupo = await getGroupById(groupId);

  if (await isGroupAtCapacity(grupo)) {
    throwGroupAtCapacity();
  }

  const emails = Array.from(
    new Set(payload.emails.map((email) => email.trim().toLowerCase()).filter(Boolean))
  );

  if (!emails.length) {
    throw Object.assign(new Error('Debes enviar al menos un correo válido'), {
      statusCode: 400,
    });
  }

  const { data: miembros, error: membersError } = await supabase
    .from('grupo_miembros')
    .select('usuario_id')
    .eq('grupo_id', groupId);

  if (membersError) throw new Error(membersError.message);

  const memberUserIds = Array.from(new Set((miembros ?? [])
    .map((item: any) => Number(item.usuario_id))
    .filter((id) => Number.isFinite(id))));

  const memberUsers = await Promise.all(memberUserIds.map(async (userId) => {
    const { data, error: memberUserError } = await supabase
      .from('usuarios')
      .select('id_usuario, email')
      .eq('id_usuario', userId)
      .maybeSingle();
    if (memberUserError) throw new Error(memberUserError.message);
    return data;
  }));

  const memberEmails = new Set(
    (memberUsers ?? [])
      .map((item: any) => item.email?.toLowerCase?.())
      .filter(Boolean)
  );

  const { data: pendingInvites, error: pendingError } = await supabase
    .from('grupo_invitaciones')
    .select('id, email, token, estado')
    .eq('grupo_id', groupId)
    .eq('estado', 'pendiente');

  if (pendingError) throw new Error(pendingError.message);

  const pendingByEmail = new Map(
    (pendingInvites ?? []).map((invite: any) => [invite.email.toLowerCase(), invite])
  );

  const results: Array<{
    id?: string;
    email: string;
    status: 'existing_member' | 'already_invited' | 'created';
    inviteLink?: string;
    codigo: string;
  }> = [];

  for (const email of emails) {
    if (memberEmails.has(email)) {
      results.push({
        email,
        status: 'existing_member',
        codigo: grupo.codigo_invitacion,
      });
      continue;
    }

    const existingInvite = pendingByEmail.get(email);

    if (existingInvite) {
      results.push({
        id: String(existingInvite.id),
        email,
        status: 'already_invited',
        codigo: grupo.codigo_invitacion,
        inviteLink: getFrontendJoinLink(grupo.codigo_invitacion),
      });
      continue;
    }

    const token = generateInviteToken();

    const { data: createdInvite, error: insertError } = await supabase
      .from('grupo_invitaciones')
      .insert({
        grupo_id: grupo.id,
        email,
        codigo_invitacion: grupo.codigo_invitacion,
        token,
        estado: 'pendiente',
        creada_por: Number(usuarioId),
      })
      .select('id, email')
      .single();

    if (insertError) throw new Error(insertError.message);

    const inviteLink = getFrontendJoinLink(grupo.codigo_invitacion);

    results.push({
      id: String(createdInvite.id),
      email,
      status: 'created',
      codigo: grupo.codigo_invitacion,
      inviteLink,
    });

    const html = buildInviteEmailHtml({
      groupName: grupo.nombre,
      groupDescription: grupo.descripcion ?? null,
      inviteLink,
    });

    sendEmail({
      to: email,
      subject: `Invitación a grupo: ${grupo.nombre}`,
      html,
    }).catch((err) => {
      console.error('Error enviando invitación:', err);
    });
  }

  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'invitacion_enviada',
    entidadTipo: 'grupo_invitacion',
    entidadId: Number(groupId),
    actorUsuarioId: Number(usuarioId),
    metadata: {
      actorUsuarioId: Number(usuarioId),
      invitedEmails: results.filter((item) => item.status === 'created').map((item) => item.email),
      groupName: grupo.nombre,
    },
  });

  return {
    groupId: String(grupo.id),
    codigo: grupo.codigo_invitacion,
    invitations: results,
  };
};


export const getJoinRequests = async (authUserId: string, groupId: string) => {
  await ensureGroupAdmin(authUserId, groupId);

  const { data, error } = await supabase
    .from('grupo_solicitudes_union')
    .select('id, grupo_id, usuario_id, estado, mensaje, created_at, updated_at')
    .eq('grupo_id', groupId)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const userIds = Array.from(new Set((data ?? [])
    .map((item: any) => Number(item.usuario_id))
    .filter((id) => Number.isFinite(id))));

  const users = await Promise.all(userIds.map(async (userId) => {
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('id_usuario, nombre, email, avatar_url')
      .eq('id_usuario', userId)
      .maybeSingle();
    if (userError) throw new Error(userError.message);
    return user;
  }));

  const usersById = new Map((users ?? []).map((user: any) => [String(user.id_usuario), user]));

  return (data ?? []).map((item: any) => {
    const user = usersById.get(String(item.usuario_id));
    return {
      id: String(item.id),
      grupo_id: String(item.grupo_id),
      usuario_id: String(item.usuario_id),
      estado: item.estado,
      mensaje: item.mensaje ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      nombre: user?.nombre ?? null,
      email: user?.email ?? null,
      avatar_url: user?.avatar_url ?? null,
    };
  });
};

export const resolveJoinRequest = async (
  authUserId: string,
  groupId: string,
  requestId: string,
  action: 'approve' | 'reject'
) => {
  const { usuarioId } = await ensureGroupAdmin(authUserId, groupId);

  const { data: request, error: requestError } = await supabase
    .from('grupo_solicitudes_union')
    .select('id, grupo_id, usuario_id, estado')
    .eq('id', requestId)
    .eq('grupo_id', groupId)
    .single();

  if (requestError || !request) {
    throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 });
  }

  if (request.estado !== 'pendiente') {
    throw Object.assign(new Error('Esta solicitud ya fue atendida'), { statusCode: 409 });
  }

  const grupo = await getGroupById(groupId);

  if (action === 'reject') {
    const { data, error } = await supabase
      .from('grupo_solicitudes_union')
      .update({
        estado: 'rechazada',
        resuelta_por: Number(usuarioId),
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    const actorName = await NotificationsService.getUserDisplayName(usuarioId);

    await NotificationsService.createNotification({
      usuarioId: Number(request.usuario_id),
      grupoId: Number(groupId),
      tipo: 'solicitud_union_rechazada',
      titulo: 'Solicitud rechazada',
      mensaje: `Tu solicitud para unirte al grupo "${grupo.nombre}" fue rechazada por el organizador.`,
      entidadTipo: 'grupo_solicitud_union',
      entidadId: Number(requestId),
      metadata: {
        actorName,
        itemTitle: grupo.nombre,
        itemType: 'grupo',
        requestId: Number(requestId),
        status: 'rechazada',
        actionLabel: 'Volver a mis viajes',
        actionUrl: '/my-trips',
      },
    });

    NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
      tipo: 'solicitud_union_rechazada',
      entidadTipo: 'grupo_solicitud_union',
      entidadId: Number(requestId),
      actorUsuarioId: Number(usuarioId),
      metadata: { actorName, action, targetUsuarioId: Number(request.usuario_id) },
    });

    return { request: data, member: null };
  }

  if (await isGroupAtCapacity(grupo)) {
    throwGroupAtCapacity();
  }

  const membership = await getMembership(groupId, String(request.usuario_id));
  if (membership) {
    await supabase
      .from('grupo_solicitudes_union')
      .update({
        estado: 'aprobada',
        resuelta_por: Number(usuarioId),
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    const actorName = await NotificationsService.getUserDisplayName(usuarioId);

    await NotificationsService.createNotification({
      usuarioId: Number(request.usuario_id),
      grupoId: Number(groupId),
      tipo: 'solicitud_union_aprobada',
      titulo: 'Solicitud aprobada',
      mensaje: `Tu solicitud fue aprobada. Ya puedes entrar al grupo "${grupo.nombre}".`,
      entidadTipo: 'grupo',
      entidadId: Number(groupId),
      metadata: {
        actorName,
        itemTitle: grupo.nombre,
        itemType: 'grupo',
        requestId: Number(requestId),
        status: 'aprobada',
        actionLabel: 'Entrar al itinerario',
        actionUrl: getGroupDashboardPath(groupId),
      },
    });

    NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
      tipo: 'solicitud_union_aprobada',
      entidadTipo: 'grupo_solicitud_union',
      entidadId: Number(requestId),
      actorUsuarioId: Number(usuarioId),
      metadata: { actorName, action, targetUsuarioId: Number(request.usuario_id) },
    });

    return { request: { ...request, estado: 'aprobada' }, member: membership };
  }

  const { data: member, error: insertError } = await supabase
    .from('grupo_miembros')
    .insert({ grupo_id: Number(groupId), usuario_id: Number(request.usuario_id), rol: 'viajero' })
    .select('*')
    .single();

  if (insertError) throw new Error(insertError.message);

  const { data: updatedRequest, error: updateError } = await supabase
    .from('grupo_solicitudes_union')
    .update({
      estado: 'aprobada',
      resuelta_por: Number(usuarioId),
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('*')
    .single();

  if (updateError) throw new Error(updateError.message);

  const actorName = await NotificationsService.getUserDisplayName(usuarioId);

  await NotificationsService.createNotification({
    usuarioId: Number(request.usuario_id),
    grupoId: Number(groupId),
    tipo: 'solicitud_union_aprobada',
    titulo: 'Solicitud aprobada',
    mensaje: `Tu solicitud fue aprobada. Ya puedes entrar al grupo "${grupo.nombre}".`,
    entidadTipo: 'grupo',
    entidadId: Number(groupId),
    metadata: {
      actorName,
      itemTitle: grupo.nombre,
      itemType: 'grupo',
      requestId: Number(requestId),
      status: 'aprobada',
      actionLabel: 'Entrar al itinerario',
      actionUrl: getGroupDashboardPath(groupId),
    },
  });

  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'solicitud_union_aprobada',
    entidadTipo: 'grupo_solicitud_union',
    entidadId: Number(requestId),
    actorUsuarioId: Number(usuarioId),
    metadata: { actorName, action, targetUsuarioId: Number(request.usuario_id) },
  });

  return { request: updatedRequest, member };
};

/**
 * CU-2.10 — Autoarchivar viajes vencidos.
 * Actualiza a 'cerrado' todos los grupos con estado 'activo' cuya fecha_fin
 * ya pasó. Se ejecuta antes de responder /groups/my-history.
 * No toca viajes sin fecha_fin ni elimina miembros, gastos ni propuestas.
 * Si falla lanza ERR-210-001 según el estándar de manejo de errores.
 */
const CLOSED_GROUP_STATUSES = new Set(['cerrado', 'archivado', 'finalizado']);

const getTodayIsoDate = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
};

const normalizeGroupStatus = (estado: unknown): string =>
  typeof estado === 'string' ? estado.trim().toLowerCase() : '';

const isClosedGroupStatus = (estado: unknown): boolean =>
  CLOSED_GROUP_STATUSES.has(normalizeGroupStatus(estado));

const isExpiredTripDate = (fechaFin: unknown, today = getTodayIsoDate()): boolean =>
  typeof fechaFin === 'string' && fechaFin.trim() !== '' && fechaFin.slice(0, 10) < today;

const shouldCloseGroup = (group: { estado?: unknown; fecha_fin?: unknown }, today = getTodayIsoDate()): boolean =>
  isExpiredTripDate(group.fecha_fin, today) && !isClosedGroupStatus(group.estado);

export const archiveExpiredGroups = async (): Promise<void> => {
  const today = getTodayIsoDate();

  const { data: expiredGroups, error: selectError } = await supabase
    .from('grupos_viaje')
    .select('id, estado, fecha_fin')
    .not('fecha_fin', 'is', null)
    .lt('fecha_fin', today);

  if (selectError) {
    throw Object.assign(
      new Error('ERR-210-001: No se pudo cerrar el viaje. Inténtalo de nuevo.'),
      { statusCode: 500 }
    );
  }

  const idsToClose =
    expiredGroups
      ?.filter((group: any) => shouldCloseGroup(group, today))
      .map((group: any) => group.id) ?? [];

  if (idsToClose.length === 0) return;

  const { error: updateGroupsError } = await supabase
    .from('grupos_viaje')
    .update({ estado: 'cerrado' })
    .in('id', idsToClose);

  if (updateGroupsError) {
    throw Object.assign(
      new Error('ERR-210-001: No se pudo cerrar el viaje. Inténtalo de nuevo.'),
      { statusCode: 500 }
    );
  }

  const { error: updateItinerariesError } = await supabase
    .from('itinerarios')
    .update({ estado: 'cerrado' })
    .in('grupo_id', idsToClose)
    .neq('estado', 'cerrado');

  if (updateItinerariesError) {
    throw Object.assign(
      new Error('ERR-210-001: No se pudo cerrar el viaje. Inténtalo de nuevo.'),
      { statusCode: 500 }
    );
  }

  for (const groupId of idsToClose) {
    NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
      tipo: 'viaje_cerrado_automaticamente',
      entidadTipo: 'grupo',
      entidadId: Number(groupId),
      actorUsuarioId: null,
      metadata: { itemType: 'grupo', status: 'cerrado' },
    });
  }
};

export const getMyTravelHistory = async (authUserId: string) => {
  const usuarioId = await getLocalUserId(authUserId);

  // Autoarchivar viajes vencidos antes de responder (CU-2.10)
  try {
    await archiveExpiredGroups();
  } catch {
    // Si falla el archivado automático no bloqueamos la respuesta al usuario;
    // el error ya fue registrado y se reflejará en el próximo intento.
  }

  const { data, error } = await supabase
    .from('grupo_miembros')
    .select(`
      rol,
      grupos_viaje (
        id,
        nombre,
        descripcion,
        destino,
        fecha_inicio,
        fecha_fin,
        maximo_miembros,
        es_publico,
        codigo_invitacion,
        estado,
        created_at,
        destino_latitud,
        destino_longitud,
        destino_place_id,
        destino_formatted_address,
        destino_photo_name,
        destino_photo_url
      )
    `)
    .eq('usuario_id', usuarioId);

  if (error) throw new Error(error.message);

  const today = getTodayIsoDate();
  const normalizedHistory =
    data?.map((item: any) => {
      const group = item.grupos_viaje;
      if (!group) return item;

      const shouldExposeAsClosed = isClosedGroupStatus(group.estado) || isExpiredTripDate(group.fecha_fin, today);

      return {
        ...item,
        grupos_viaje: {
          ...group,
          estado: shouldExposeAsClosed ? 'cerrado' : group.estado,
        },
      };
    }) ?? [];

  const activos = normalizedHistory.filter((item: any) => !isClosedGroupStatus(item.grupos_viaje?.estado));

  const pasados = normalizedHistory.filter((item: any) => isClosedGroupStatus(item.grupos_viaje?.estado));

  return { activos, pasados };
};

export const updateGroup = async (
  authUserId: string,
  groupId: string,
  payload: UpdateGroupPayload
) => {
  await ensureGroupAdmin(authUserId, groupId);
  const destinationFields = await buildDestinationFields(payload);
  const maximoMiembros =
    payload.maximo_miembros !== undefined ? normalizeMaxMembers(payload.maximo_miembros) : undefined;
  const nombre =
    payload.nombre !== undefined
      ? normalizeRequiredText(payload.nombre, 'El nombre del grupo', GROUP_NAME_MAX_LENGTH)
      : undefined;
  const descripcion =
    payload.descripcion !== undefined
      ? normalizeOptionalText(payload.descripcion, 'La descripción', GROUP_DESCRIPTION_MAX_LENGTH)
      : undefined;

  const currentGroup = await getGroupById(groupId);
  const nextStartDate = payload.fecha_inicio !== undefined ? payload.fecha_inicio || null : currentGroup.fecha_inicio ?? null;
  const nextEndDate = payload.fecha_fin !== undefined ? payload.fecha_fin || null : currentGroup.fecha_fin ?? null;

  validateTripDateRange(nextStartDate, nextEndDate);

  const updateData = {
    ...(payload.nombre !== undefined ? { nombre } : {}),
    ...(payload.descripcion !== undefined ? { descripcion } : {}),
    ...(payload.destino !== undefined ? { destino: payload.destino || null } : {}),
    ...(payload.fecha_inicio !== undefined ? { fecha_inicio: payload.fecha_inicio || null } : {}),
    ...(payload.fecha_fin !== undefined ? { fecha_fin: payload.fecha_fin || null } : {}),
    ...(payload.maximo_miembros !== undefined ? { maximo_miembros: maximoMiembros } : {}),
    ...(payload.es_publico !== undefined ? { es_publico: payload.es_publico === true } : {}),
    ...(payload.destino_latitud !== undefined ? { destino_latitud: destinationFields.destino_latitud } : {}),
    ...(payload.destino_longitud !== undefined ? { destino_longitud: destinationFields.destino_longitud } : {}),
    ...(payload.destino_place_id !== undefined ? { destino_place_id: destinationFields.destino_place_id } : {}),
    ...(payload.destino_formatted_address !== undefined ? { destino_formatted_address: destinationFields.destino_formatted_address } : {}),
    ...(payload.destino_place_id !== undefined || payload.destino_photo_name !== undefined
      ? { destino_photo_name: destinationFields.destino_photo_name }
      : {}),
    ...(payload.destino_place_id !== undefined || payload.destino_photo_url !== undefined
      ? { destino_photo_url: destinationFields.destino_photo_url }
      : {}),
  };

  const { data, error } = await supabase
    .from('grupos_viaje')
    .update(updateData)
    .eq('id', groupId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo actualizar el grupo');
  }

  const actorUsuarioId = await getLocalUserId(authUserId);
  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'grupo_actualizado',
    entidadTipo: 'grupo',
    entidadId: Number(groupId),
    actorUsuarioId: Number(actorUsuarioId),
    metadata: { itemTitle: data.nombre, itemType: 'grupo' },
  });

  return data;
};

export const deleteGroup = async (authUserId: string, groupId: string) => {
  await ensureGroupAdmin(authUserId, groupId);

  const { error } = await supabase
    .from('grupos_viaje')
    .delete()
    .eq('id', groupId);

  if (error) throw new Error(error.message);

  const actorUsuarioId = await getLocalUserId(authUserId);
  emitGroupDeleted({
    groupId: Number(groupId),
    actorUsuarioId: Number(actorUsuarioId),
  });

  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'grupo_eliminado',
    entidadTipo: 'grupo',
    entidadId: Number(groupId),
    actorUsuarioId: Number(actorUsuarioId),
    metadata: { itemType: 'grupo' },
  });

  return { ok: true };
};
