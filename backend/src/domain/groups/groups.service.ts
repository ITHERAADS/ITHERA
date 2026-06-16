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
  InvitationStatus,
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


const normalizeComparableTripName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-MX');

const ensureUserHasNoTripWithSameName = async (usuarioId: string | number, nombre: string): Promise<void> => {
  const comparableName = normalizeComparableTripName(nombre);

  const { data, error } = await supabase
    .from('grupos_viaje')
    .select('id,nombre,estado')
    .eq('creado_por', Number(usuarioId))
    .in('estado', ['activo', 'borrador']);

  if (error) throw new Error(error.message);

  const duplicate = (data ?? []).find((group) =>
    typeof group.nombre === 'string' &&
    normalizeComparableTripName(group.nombre) === comparableName
  );

  if (duplicate) {
    throw Object.assign(
      new Error('ERR-23-005: Ya tienes un viaje con ese nombre. Elige un nombre diferente para distinguirlos.'),
      { statusCode: 409, code: 'DUPLICATE_TRIP_NAME', errorCode: 'ERR-23-005' }
    );
  }
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


const todayISO = () => new Date().toISOString().slice(0, 10);

const toDateOnly = (value?: string | null): string | null => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

const hasTripStarted = (startDate?: string | null): boolean => {
  const date = toDateOnly(startDate);
  return Boolean(date && date < todayISO());
};

const coordinatesAreAvailable = (latitude?: unknown, longitude?: unknown): latitude is number =>
  Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

const distanceInKilometers = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
): number => {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const startLatitude = toRadians(fromLatitude);
  const endLatitude = toRadians(toLatitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getGroupActivityDateStats = async (groupId: string) => {
  const { data: itineraries, error: itineraryError } = await supabase
    .from('itinerarios')
    .select('id_itinerario')
    .eq('grupo_id', groupId);

  if (itineraryError) throw new Error(itineraryError.message);

  const itineraryIds = (itineraries ?? [])
    .map((item: any) => item.id_itinerario)
    .filter(Boolean);

  if (itineraryIds.length === 0) {
    return { count: 0, minDate: null as string | null, maxDate: null as string | null };
  }

  const { data: activities, error: activitiesError } = await supabase
    .from('actividades')
    .select('fecha_inicio, fecha_fin, estado')
    .in('itinerario_id', itineraryIds)
    .neq('estado', 'cancelada');

  if (activitiesError) throw new Error(activitiesError.message);

  const dates = (activities ?? [])
    .flatMap((activity: any) => [toDateOnly(activity.fecha_inicio), toDateOnly(activity.fecha_fin)])
    .filter((date: string | null): date is string => Boolean(date));

  return {
    count: activities?.length ?? 0,
    minDate: dates.length > 0 ? dates.reduce((min, date) => (date < min ? date : min), dates[0]) : null,
    maxDate: dates.length > 0 ? dates.reduce((max, date) => (date > max ? date : max), dates[0]) : null,
  };
};

const assertDateUpdateDoesNotBreakExistingPlan = async (
  groupId: string,
  nextStartDate?: string | null,
  nextEndDate?: string | null
) => {
  if (!nextStartDate || !nextEndDate) return;

  const stats = await getGroupActivityDateStats(groupId);
  if (stats.count === 0 || !stats.minDate || !stats.maxDate) return;

  if (stats.minDate < nextStartDate || stats.maxDate > nextEndDate) {
    throw Object.assign(
      new Error(
        `ERR-23-003: El nuevo rango no cubre actividades existentes (${stats.minDate} a ${stats.maxDate}). Ajusta las fechas o mueve primero esas actividades.`
      ),
      {
        statusCode: 409,
        code: 'TRIP_DATES_CONTAIN_EXISTING_ACTIVITIES',
        errorCode: 'ERR-23-003',
        conflict: { minActivityDate: stats.minDate, maxActivityDate: stats.maxDate, activityCount: stats.count },
      }
    );
  }
};

const assertDestinationUpdateIsSafe = async (currentGroup: any, destinationFields: any) => {
  const currentPlaceId = currentGroup.destino_place_id ?? null;
  const nextPlaceId = destinationFields.destino_place_id ?? null;
  const placeChanged = Boolean(nextPlaceId && currentPlaceId && nextPlaceId !== currentPlaceId);
  const coordinatesChanged =
    coordinatesAreAvailable(currentGroup.destino_latitud, currentGroup.destino_longitud) &&
    coordinatesAreAvailable(destinationFields.destino_latitud, destinationFields.destino_longitud) &&
    distanceInKilometers(
      Number(currentGroup.destino_latitud),
      Number(currentGroup.destino_longitud),
      Number(destinationFields.destino_latitud),
      Number(destinationFields.destino_longitud)
    ) > 50;

  if (!placeChanged && !coordinatesChanged) return;

  const stats = await getGroupActivityDateStats(String(currentGroup.id));
  if (stats.count === 0) return;

  if (
    coordinatesAreAvailable(currentGroup.destino_latitud, currentGroup.destino_longitud) &&
    coordinatesAreAvailable(destinationFields.destino_latitud, destinationFields.destino_longitud)
  ) {
    const distance = distanceInKilometers(
      Number(currentGroup.destino_latitud),
      Number(currentGroup.destino_longitud),
      Number(destinationFields.destino_latitud),
      Number(destinationFields.destino_longitud)
    );

    if (distance <= 50) return;
  }

  throw Object.assign(
    new Error(
      'ERR-23-003: El destino nuevo está lejos del destino original y el viaje ya tiene actividades. Crea un viaje nuevo o elimina/reagenda las actividades antes de cambiarlo.'
    ),
    { statusCode: 409, code: 'TRIP_DESTINATION_CONFLICT', errorCode: 'ERR-23-003' }
  );
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

const getFrontendJoinLink = (code: string, token?: string | null): string => {
  const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const params = new URLSearchParams({ code });

  if (token) {
    params.set('token', token);
  }

  return `${baseUrl}/join-group?${params.toString()}`;
};

type PendingEmailInvitation = {
  id: number | string;
  grupo_id: number | string;
  email: string;
  codigo_invitacion: string;
  token: string;
  estado: InvitationStatus | string;
};

const findPendingEmailInvitationByToken = async (
  code: string,
  token?: string | null
): Promise<PendingEmailInvitation | null> => {
  const safeToken = token?.trim();
  if (!safeToken) return null;

  const { data, error } = await supabase
    .from('grupo_invitaciones')
    .select('id, grupo_id, email, codigo_invitacion, token, estado')
    .eq('codigo_invitacion', normalizeInviteCode(code))
    .eq('token', safeToken)
    .eq('estado', 'pendiente')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PendingEmailInvitation | null;
};

const assertEmailInvitationCanBeUsed = (
  invitation: PendingEmailInvitation | null,
  userEmail?: string | null
): PendingEmailInvitation => {
  if (!invitation) {
    throw Object.assign(new Error('Esta invitación personal ya fue usada, revocada o no es válida.'), {
      statusCode: 410,
      code: 'EMAIL_INVITE_INVALID',
    });
  }

  const normalizedUserEmail = userEmail?.trim().toLowerCase();
  if (!normalizedUserEmail || invitation.email.trim().toLowerCase() !== normalizedUserEmail) {
    throw Object.assign(new Error('Esta invitación fue enviada a otro correo. Inicia sesión con el correo invitado.'), {
      statusCode: 403,
      code: 'EMAIL_INVITE_EMAIL_MISMATCH',
    });
  }

  return invitation;
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
  isPrivateGroup,
}: {
  groupName: string;
  groupDescription?: string | null;
  inviteLink: string;
  isPrivateGroup?: boolean;
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
      ${
        isPrivateGroup
          ? 'Da clic en el siguiente botón para unirte directamente. Esta invitación fue autorizada por el organizador y no requiere solicitar acceso.'
          : 'Da clic en el siguiente botón para unirte.'
      }
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
      ${
        isPrivateGroup
          ? 'Esta invitación es personal, de un solo uso y solo funciona con el correo al que fue enviada. Si no esperabas esta invitación, puedes ignorar este correo.'
          : 'Si no esperabas esta invitación, puedes ignorar este correo.'
      }
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

const releasePreviousJoinRequestsWithStatus = async (
  groupId: string | number,
  usuarioId: string | number,
  currentRequestId: string | number,
  status: 'aprobada' | 'rechazada'
): Promise<void> => {
  const { error } = await supabase
    .from('grupo_solicitudes_union')
    .update({
      estado: 'cancelada',
      updated_at: new Date().toISOString(),
    })
    .eq('grupo_id', Number(groupId))
    .eq('usuario_id', Number(usuarioId))
    .eq('estado', status)
    .neq('id', Number(currentRequestId));

  if (error) throw new Error(error.message);
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


type TripDateConflict = {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
};

const formatTripDate = (value: string): string => value.slice(0, 10);

const dateRangesOverlap = (
  startA?: string | null,
  endA?: string | null,
  startB?: string | null,
  endB?: string | null
): boolean => {
  if (!startA || !endA || !startB || !endB) return false;
  return formatTripDate(startA) <= formatTripDate(endB) && formatTripDate(endA) >= formatTripDate(startB);
};

const findUserTripDateConflict = async (
  usuarioId: string | number,
  startDate?: string | null,
  endDate?: string | null,
  options: { excludeGroupId?: string | number } = {}
): Promise<TripDateConflict | null> => {
  if (!startDate || !endDate) return null;

  const { data: memberships, error: membershipError } = await supabase
    .from('grupo_miembros')
    .select('grupo_id')
    .eq('usuario_id', Number(usuarioId));

  if (membershipError) throw new Error(membershipError.message);

  const groupIds = Array.from(new Set((memberships ?? [])
    .map((membership: any) => Number(membership.grupo_id))
    .filter((groupId) => Number.isFinite(groupId) && String(groupId) !== String(options.excludeGroupId ?? ''))));

  if (!groupIds.length) return null;

  const { data: groups, error: groupsError } = await supabase
    .from('grupos_viaje')
    .select('id, nombre, fecha_inicio, fecha_fin, estado')
    .in('id', groupIds)
    .not('fecha_inicio', 'is', null)
    .not('fecha_fin', 'is', null);

  if (groupsError) throw new Error(groupsError.message);

  const conflicts = (groups ?? [])
    .filter((group: any) => !isClosedGroupStatus(group.estado))
    .filter((group: any) => dateRangesOverlap(startDate, endDate, group.fecha_inicio, group.fecha_fin))
    .sort((a: any, b: any) => formatTripDate(a.fecha_inicio).localeCompare(formatTripDate(b.fecha_inicio)));

  const conflict = conflicts[0];
  if (!conflict) return null;

  return {
    id: Number(conflict.id),
    nombre: String(conflict.nombre ?? 'otro viaje'),
    fecha_inicio: formatTripDate(String(conflict.fecha_inicio)),
    fecha_fin: formatTripDate(String(conflict.fecha_fin)),
  };
};

const throwTripDateConflict = (
  conflict: TripDateConflict,
  action: 'create' | 'join' | 'approve'
): never => {
  const actionText = action === 'create'
    ? 'crear este viaje'
    : action === 'approve'
      ? 'aprobar esta solicitud'
      : 'unirte a este viaje';

  const errorCode = action === 'create' ? 'ERR-23-006' : 'ERR-24-004';

  throw Object.assign(
    new Error(`${errorCode}: No puedes ${actionText} porque las fechas se cruzan con el viaje "${conflict.nombre}" (${conflict.fecha_inicio} al ${conflict.fecha_fin}). Ajusta las fechas o elige otro viaje.`),
    {
      statusCode: 409,
      code: 'TRIP_DATE_CONFLICT',
      errorCode,
      conflict,
    }
  );
};

const ensureUserHasAvailableDates = async (
  usuarioId: string | number,
  startDate?: string | null,
  endDate?: string | null,
  action: 'create' | 'join' | 'approve' = 'join'
): Promise<void> => {
  const conflict = await findUserTripDateConflict(usuarioId, startDate, endDate);
  if (conflict) throwTripDateConflict(conflict, action);
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
  await ensureUserHasNoTripWithSameName(usuarioId, nombre);
  await ensureUserHasAvailableDates(usuarioId, payload.fecha_inicio ?? null, payload.fecha_fin ?? null, 'create');

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
  const invitationToken = payload.invitationToken?.trim();
  const emailInvitation = await findPendingEmailInvitationByToken(normalizedCode, invitationToken);

  if (invitationToken && !emailInvitation) {
    throw Object.assign(new Error('Esta invitación personal ya fue usada, revocada o no es válida.'), {
      statusCode: 410,
      code: 'EMAIL_INVITE_INVALID',
    });
  }

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

  await ensureUserHasAvailableDates(localUser.id_usuario, grupo.fecha_inicio ?? null, grupo.fecha_fin ?? null, 'join');

  const validatedEmailInvitation = invitationToken
    ? assertEmailInvitationCanBeUsed(emailInvitation, localUser.email)
    : null;

  if (validatedEmailInvitation && String(validatedEmailInvitation.grupo_id) !== String(grupo.id)) {
    throw Object.assign(new Error('La invitación personal no corresponde a este grupo.'), {
      statusCode: 400,
      code: 'EMAIL_INVITE_GROUP_MISMATCH',
    });
  }

  const isPublicGroup = grupo.es_publico === true;

  if (!isPublicGroup && !validatedEmailInvitation) {
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

  if (validatedEmailInvitation) {
    const { data: acceptedInvite, error: acceptInviteError } = await supabase
      .from('grupo_invitaciones')
      .update({
        estado: 'aceptada',
        accepted_by: localUser.id_usuario,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', validatedEmailInvitation.id)
      .eq('estado', 'pendiente')
      .select('id')
      .maybeSingle();

    if (acceptInviteError) throw new Error(acceptInviteError.message);

    if (!acceptedInvite) {
      await supabase
        .from('grupo_miembros')
        .delete()
        .eq('grupo_id', grupo.id)
        .eq('usuario_id', localUser.id_usuario);

      throw Object.assign(new Error('Esta invitación personal ya fue usada. Solicita una nueva al organizador.'), {
        statusCode: 409,
        code: 'EMAIL_INVITE_ALREADY_USED',
      });
    }
  } else if (localUser.email) {
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


type AdminDelegationStatus = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada' | 'cancelada';

type AdminDelegationRequest = {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  status: AdminDelegationStatus;
  expires_at: string;
  created_at?: string;
  updated_at?: string;
  from_nombre?: string | null;
  from_email?: string | null;
  to_nombre?: string | null;
  to_email?: string | null;
};

const ADMIN_DELEGATION_TTL_MINUTES = 5;

const getUserSummaryByLocalId = async (usuarioId: string | number) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id_usuario, nombre, email, avatar_url')
    .eq('id_usuario', Number(usuarioId))
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
};

const decorateAdminDelegationRequest = async (request: any): Promise<AdminDelegationRequest> => {
  const [fromUser, toUser] = await Promise.all([
    getUserSummaryByLocalId(request.from_user_id),
    getUserSummaryByLocalId(request.to_user_id),
  ]);

  return {
    id: String(request.id),
    group_id: String(request.group_id),
    from_user_id: String(request.from_user_id),
    to_user_id: String(request.to_user_id),
    status: request.status,
    expires_at: request.expires_at,
    created_at: request.created_at,
    updated_at: request.updated_at,
    from_nombre: fromUser?.nombre ?? null,
    from_email: fromUser?.email ?? null,
    to_nombre: toUser?.nombre ?? null,
    to_email: toUser?.email ?? null,
  };
};

const expireStaleAdminDelegations = async (groupId: string): Promise<void> => {
  const { error } = await supabase
    .from('admin_delegation_requests')
    .update({ status: 'expirada', updated_at: new Date().toISOString() })
    .eq('group_id', Number(groupId))
    .eq('status', 'pendiente')
    .lt('expires_at', new Date().toISOString());

  if (error && !String(error.message).includes('admin_delegation_requests')) {
    throw new Error(error.message);
  }
};

const createAdminDelegationRequest = async (
  groupId: string,
  fromUserId: string | number,
  toUserId: string | number,
  targetMemberId: string | number
): Promise<AdminDelegationRequest> => {
  await expireStaleAdminDelegations(groupId);

  const targetMembership = await getMembership(groupId, String(toUserId));
  if (!targetMembership || String(targetMembership.id) !== String(targetMemberId)) {
    throw Object.assign(new Error('El integrante seleccionado ya no pertenece al viaje.'), { statusCode: 404 });
  }

  if (targetMembership.rol === 'admin') {
    throw Object.assign(new Error('Este integrante ya es administrador del viaje.'), { statusCode: 409 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('admin_delegation_requests')
    .select('*')
    .eq('group_id', Number(groupId))
    .eq('status', 'pendiente')
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    return decorateAdminDelegationRequest(existing);
  }

  const expiresAt = new Date(Date.now() + ADMIN_DELEGATION_TTL_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('admin_delegation_requests')
    .insert({
      group_id: Number(groupId),
      from_user_id: Number(fromUserId),
      to_user_id: Number(toUserId),
      status: 'pendiente',
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const decorated = await decorateAdminDelegationRequest(data);
  const actorName = await NotificationsService.getUserDisplayName(fromUserId);
  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'delegacion_admin_pendiente',
    entidadTipo: 'admin_delegation_request',
    entidadId: Number(data.id),
    actorUsuarioId: Number(fromUserId),
    metadata: {
      actorName,
      requestId: Number(data.id),
      targetUsuarioId: Number(toUserId),
      fromUsuarioId: Number(fromUserId),
      expiresAt,
    },
  });

  await NotificationsService.createNotification({
    usuarioId: Number(toUserId),
    grupoId: Number(groupId),
    tipo: 'delegacion_admin_pendiente',
    titulo: 'Solicitud de administración pendiente',
    mensaje: `${actorName} quiere delegarte la administración del viaje. Acepta o rechaza la solicitud antes de que expire.`,
    entidadTipo: 'admin_delegation_request',
    entidadId: Number(data.id),
    metadata: { requestId: Number(data.id), groupId: Number(groupId), expiresAt },
  });

  return decorated;
};

export const getAdminDelegationRequests = async (authUserId: string, groupId: string) => {
  const { usuarioId } = await ensureGroupMember(authUserId, groupId);
  await expireStaleAdminDelegations(groupId);

  const { data, error } = await supabase
    .from('admin_delegation_requests')
    .select('*')
    .eq('group_id', Number(groupId))
    .eq('status', 'pendiente')
    .or(`from_user_id.eq.${Number(usuarioId)},to_user_id.eq.${Number(usuarioId)}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return Promise.all((data ?? []).map(decorateAdminDelegationRequest));
};

export const resolveAdminDelegationRequest = async (
  authUserId: string,
  groupId: string,
  requestId: string,
  action: 'accept' | 'reject'
) => {
  const { usuarioId } = await ensureGroupMember(authUserId, groupId);
  await expireStaleAdminDelegations(groupId);

  const { data: request, error: requestError } = await supabase
    .from('admin_delegation_requests')
    .select('*')
    .eq('id', Number(requestId))
    .eq('group_id', Number(groupId))
    .maybeSingle();

  if (requestError) throw new Error(requestError.message);
  if (!request) throw Object.assign(new Error('Solicitud de delegación no encontrada.'), { statusCode: 404 });
  if (String(request.to_user_id) !== String(usuarioId)) {
    throw Object.assign(new Error('Solo el receptor puede responder esta solicitud.'), { statusCode: 403 });
  }
  if (request.status !== 'pendiente') {
    throw Object.assign(new Error('Esta solicitud de delegación ya no está pendiente.'), { statusCode: 409 });
  }
  if (new Date(request.expires_at).getTime() <= Date.now()) {
    await supabase
      .from('admin_delegation_requests')
      .update({ status: 'expirada', updated_at: new Date().toISOString() })
      .eq('id', Number(requestId));
    throw Object.assign(new Error('ERR-28-001: La solicitud de delegación expiró.'), { statusCode: 409, errorCode: 'ERR-28-001' });
  }

  if (action === 'reject') {
    const { data, error } = await supabase
      .from('admin_delegation_requests')
      .update({ status: 'rechazada', updated_at: new Date().toISOString() })
      .eq('id', Number(requestId))
      .eq('status', 'pendiente')
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
      tipo: 'delegacion_admin_rechazada',
      entidadTipo: 'admin_delegation_request',
      entidadId: Number(requestId),
      actorUsuarioId: Number(usuarioId),
      metadata: {
        requestId: Number(requestId),
        targetUsuarioId: Number(request.to_user_id),
        fromUsuarioId: Number(request.from_user_id),
      },
    });

    return { request: await decorateAdminDelegationRequest(data), member: null };
  }

  const currentReceiverMembership = await getMembership(groupId, String(request.to_user_id));
  const currentAdminMembership = await getMembership(groupId, String(request.from_user_id));

  if (!currentReceiverMembership || !currentAdminMembership || currentAdminMembership.rol !== 'admin') {
    await supabase
      .from('admin_delegation_requests')
      .update({ status: 'cancelada', updated_at: new Date().toISOString() })
      .eq('id', Number(requestId));
    throw Object.assign(
      new Error('ERR-28-002: La transferencia fue cancelada porque los roles del viaje cambiaron.'),
      { statusCode: 409, errorCode: 'ERR-28-002' }
    );
  }

  const { error: demoteError } = await supabase
    .from('grupo_miembros')
    .update({ rol: 'viajero' })
    .eq('grupo_id', Number(groupId))
    .eq('usuario_id', Number(request.from_user_id))
    .eq('rol', 'admin');

  if (demoteError) throw new Error(demoteError.message);

  const { data: promotedMember, error: promoteError } = await supabase
    .from('grupo_miembros')
    .update({ rol: 'admin' })
    .eq('grupo_id', Number(groupId))
    .eq('usuario_id', Number(request.to_user_id))
    .select('*')
    .single();

  if (promoteError) {
    await supabase
      .from('grupo_miembros')
      .update({ rol: 'admin' })
      .eq('grupo_id', Number(groupId))
      .eq('usuario_id', Number(request.from_user_id));
    throw new Error(promoteError.message);
  }

  const { data: resolvedRequest, error: resolveError } = await supabase
    .from('admin_delegation_requests')
    .update({ status: 'aceptada', updated_at: new Date().toISOString(), responded_at: new Date().toISOString() })
    .eq('id', Number(requestId))
    .eq('status', 'pendiente')
    .select('*')
    .single();

  if (resolveError) throw new Error(resolveError.message);

  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'delegacion_admin_aceptada',
    entidadTipo: 'admin_delegation_request',
    entidadId: Number(requestId),
    actorUsuarioId: Number(usuarioId),
    metadata: {
      actorName,
      requestId: Number(requestId),
      targetUsuarioId: Number(request.to_user_id),
      fromUsuarioId: Number(request.from_user_id),
      memberId: Number(promotedMember.id),
      rol: 'admin',
      previousRole: 'viajero',
      transferType: 'admin_delegation',
    },
  });

  return { request: await decorateAdminDelegationRequest(resolvedRequest), member: promotedMember };
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

  const { usuarioId: actorUsuarioId } = await ensureGroupAdmin(authUserId, String(targetMember.grupo_id));

  if (String(targetMember.usuario_id) === String(actorUsuarioId)) {
    throw Object.assign(new Error('No puedes cambiar tu propio rol desde este panel'), { statusCode: 400 });
  }

  if (rol === 'admin') {
    const request = await createAdminDelegationRequest(
      String(targetMember.grupo_id),
      actorUsuarioId,
      targetMember.usuario_id,
      memberId
    );

    return {
      ...targetMember,
      delegationRequest: request,
      pendingDelegation: true,
    };
  }

  const { count: adminCount, error: countError } = await supabase
    .from('grupo_miembros')
    .select('id', { count: 'exact', head: true })
    .eq('grupo_id', targetMember.grupo_id)
    .eq('rol', 'admin');

  if (countError) throw new Error(countError.message);

  if (targetMember.rol === 'admin' && (adminCount ?? 0) <= 1) {
    throw Object.assign(new Error('El viaje debe mantener un administrador activo'), {
      statusCode: 409,
      code: 'GROUP_REQUIRES_ADMIN',
      errorCode: 'ERR-28-002',
    });
  }

  const { data: updatedMember, error } = await supabase
    .from('grupo_miembros')
    .update({ rol })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw new Error(error.message);

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
      previousRole: targetMember.rol,
      transferType: 'role_update',
    },
  });

  return updatedMember;
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
  codigo: string,
  invitationToken?: string
): Promise<GroupInvitePreview> => {
  const normalizedCode = normalizeInviteCode(codigo);
  const emailInvitation = await findPendingEmailInvitationByToken(normalizedCode, invitationToken);

  if (invitationToken && !emailInvitation) {
    throw Object.assign(new Error('Esta invitación personal ya fue usada, revocada o no es válida.'), {
      statusCode: 410,
      code: 'EMAIL_INVITE_INVALID',
    });
  }

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
    requiresApproval: emailInvitation ? false : grupo.es_publico !== true,
    emailInvitation: Boolean(emailInvitation),
    invitedEmail: emailInvitation?.email ?? null,
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
        inviteLink: getFrontendJoinLink(grupo.codigo_invitacion, existingInvite.token),
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

    const inviteLink = getFrontendJoinLink(grupo.codigo_invitacion, token);

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
      isPrivateGroup: grupo.es_publico !== true,
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
    await releasePreviousJoinRequestsWithStatus(groupId, request.usuario_id, requestId, 'rechazada');

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

  await ensureUserHasAvailableDates(request.usuario_id, grupo.fecha_inicio ?? null, grupo.fecha_fin ?? null, 'approve');
  await releasePreviousJoinRequestsWithStatus(groupId, request.usuario_id, requestId, 'aprobada');

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
  const currentStartDate = toDateOnly(currentGroup.fecha_inicio ?? null);
  const currentEndDate = toDateOnly(currentGroup.fecha_fin ?? null);
  const nextStartDate = payload.fecha_inicio !== undefined ? toDateOnly(payload.fecha_inicio) : currentStartDate;
  const nextEndDate = payload.fecha_fin !== undefined ? toDateOnly(payload.fecha_fin) : currentEndDate;
  const startDateChanged = payload.fecha_inicio !== undefined && nextStartDate !== currentStartDate;
  const endDateChanged = payload.fecha_fin !== undefined && nextEndDate !== currentEndDate;
  const today = todayISO();

  validateTripDateRange(nextStartDate, nextEndDate);

  if (startDateChanged && hasTripStarted(currentStartDate)) {
    throw Object.assign(
      new Error('ERR-23-003: No puedes cambiar la fecha de inicio de un viaje que ya comenzó. Solo ajusta la fecha de fin si necesitas extenderlo.'),
      { statusCode: 409, errorCode: 'ERR-23-003', code: 'TRIP_ALREADY_STARTED' }
    );
  }

  if (startDateChanged && nextStartDate && nextStartDate < today) {
    throw Object.assign(
      new Error('ERR-23-003: La fecha de inicio no puede ser anterior a hoy.'),
      { statusCode: 400, errorCode: 'ERR-23-003' }
    );
  }

  if (endDateChanged && nextEndDate && nextEndDate < today) {
    throw Object.assign(
      new Error('ERR-23-003: La fecha de fin no puede ser anterior a hoy.'),
      { statusCode: 400, errorCode: 'ERR-23-003' }
    );
  }

  if (startDateChanged || endDateChanged) {
    await assertDateUpdateDoesNotBreakExistingPlan(groupId, nextStartDate, nextEndDate);
  }

  if (
    payload.destino !== undefined ||
    payload.destino_latitud !== undefined ||
    payload.destino_longitud !== undefined ||
    payload.destino_place_id !== undefined
  ) {
    await assertDestinationUpdateIsSafe(currentGroup, destinationFields);
  }

  const updateData = {
    ...(payload.nombre !== undefined ? { nombre } : {}),
    ...(payload.descripcion !== undefined ? { descripcion } : {}),
    ...(payload.destino !== undefined ? { destino: payload.destino || null } : {}),
    ...(payload.fecha_inicio !== undefined ? { fecha_inicio: payload.fecha_inicio || null } : {}),
    ...(payload.fecha_fin !== undefined ? { fecha_fin: payload.fecha_fin || null } : {}),
    ...(payload.maximo_miembros !== undefined ? { maximo_miembros: maximoMiembros } : {}),
    ...(payload.es_publico !== undefined ? { es_publico: payload.es_publico === true } : {}),
    ...(payload.modulo_itinerario_bloqueado !== undefined
      ? { modulo_itinerario_bloqueado: payload.modulo_itinerario_bloqueado === true }
      : {}),
    ...(payload.modulo_presupuesto_bloqueado !== undefined
      ? { modulo_presupuesto_bloqueado: payload.modulo_presupuesto_bloqueado === true }
      : {}),
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
    ...((payload.destino !== undefined || payload.destino_latitud !== undefined || payload.destino_longitud !== undefined || payload.destino_place_id !== undefined) &&
    (currentGroup.punto_partida_tipo ?? 'destino_viaje') === 'destino_viaje'
      ? {
          punto_partida_tipo: 'destino_viaje',
          punto_partida_nombre: payload.destino || currentGroup.destino || null,
          punto_partida_direccion: destinationFields.destino_formatted_address ?? payload.destino ?? currentGroup.destino ?? null,
          punto_partida_latitud: destinationFields.destino_latitud,
          punto_partida_longitud: destinationFields.destino_longitud,
          punto_partida_place_id: destinationFields.destino_place_id,
          punto_partida_actualizado_at: new Date().toISOString(),
        }
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

  if (startDateChanged || endDateChanged) {
    const { error: itinerarySyncError } = await supabase
      .from('itinerarios')
      .update({
        fecha_inicio: nextStartDate,
        fecha_fin: nextEndDate,
        ultima_actualizacion: new Date().toISOString(),
      })
      .eq('grupo_id', groupId);

    if (itinerarySyncError) {
      throw Object.assign(
        new Error('ERR-23-002: No se pudo sincronizar el rango del itinerario. Inténtalo de nuevo.'),
        { statusCode: 500, errorCode: 'ERR-23-002' }
      );
    }
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

export const closeGroup = async (authUserId: string, groupId: string) => {
  const { usuarioId } = await ensureGroupAdmin(authUserId, groupId);

  const { data, error } = await supabase
    .from('grupos_viaje')
    .update({
      estado: 'cerrado',
      modulo_itinerario_bloqueado: true,
      modulo_presupuesto_bloqueado: true,
    })
    .eq('id', groupId)
    .eq('estado', 'activo')
    .select('*')
    .single();

  if (error || !data) {
    throw Object.assign(new Error('ERR-210-001: No se pudo cerrar el viaje. Inténtalo de nuevo.'), {
      statusCode: 409,
      errorCode: 'ERR-210-001',
    });
  }

  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'grupo_cerrado',
    entidadTipo: 'grupo',
    entidadId: Number(groupId),
    actorUsuarioId: Number(usuarioId),
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
