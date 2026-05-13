import { supabase } from '../../infrastructure/db/supabase.client';
import { getLocalUserId } from '../groups/groups.service';
import { CreateItineraryActivityPayload, ItineraryDay } from './itinerary.entity';
import * as NotificationsService from '../notifications/notifications.service';

const DEFAULT_ACTIVITY_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=300&fit=crop';

const ensureGroupMember = async (authUserId: string, groupId: string) => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data, error } = await supabase
    .from('grupo_miembros')
    .select('id, rol, usuario_id')
    .eq('grupo_id', groupId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    throw Object.assign(new Error('No perteneces a este grupo'), { statusCode: 403 });
  }

  return {
    usuarioId,
    membership: {
      id: String((data as any).id),
      rol: String((data as any).rol ?? 'viajero'),
      usuario_id: String((data as any).usuario_id),
    },
  };
};

const getUniqueGroupMemberCount = async (groupId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('grupo_miembros')
    .select('usuario_id')
    .eq('grupo_id', groupId);

  if (error) throw new Error(error.message);

  const unique = new Set((data ?? []).map((row: any) => String(row.usuario_id)));
  return unique.size;
};

const isMissingVoteTypeColumnError = (error: { message?: string } | null | undefined): boolean => {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes("voto_tipo") && message.includes("could not find");
};

const formatDateLabel = (date: string): string => {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
};

const formatTimeLabel = (value?: string | null): string => {
  if (!value) return 'Hora pendiente';

  const match = value.match(/T([01]\d|2[0-3]):([0-5]\d)/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  try {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  } catch {
    return 'Hora pendiente';
  }
};

const resolveActivityDateTime = (activity: any, fallbackDate: string): string | null => {
  if (activity.fecha_inicio) return String(activity.fecha_inicio);

  const activityPayload = activity.payload && typeof activity.payload === 'object' ? activity.payload : {};
  const proposalPayload =
    activity.propuestas?.payload && typeof activity.propuestas.payload === 'object'
      ? activity.propuestas.payload
      : {};

  const directDateTime =
    activityPayload.fecha_inicio ??
    activityPayload.fechaInicio ??
    activityPayload.scheduledAt ??
    proposalPayload.fecha_inicio ??
    proposalPayload.fechaInicio ??
    proposalPayload.scheduledAt ??
    null;

  if (directDateTime) return String(directDateTime);

  const hhmm =
    activityPayload.hora ??
    activityPayload.time ??
    activityPayload.selectedTime ??
    proposalPayload.hora ??
    proposalPayload.time ??
    proposalPayload.selectedTime ??
    null;

  if (typeof hhmm === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(hhmm)) {
    return `${fallbackDate}T${hhmm}:00.000Z`;
  }

  return null;
};

const diffDays = (startDate: string, currentDate: string): number => {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const current = new Date(`${currentDate}T00:00:00.000Z`).getTime();

  return Math.floor((current - start) / 86_400_000);
};

const getActivityDate = (activity: any, fallbackDate: string): string => {
  if (!activity.fecha_inicio) return fallbackDate;
  return String(activity.fecha_inicio).slice(0, 10);
};

const toActivityRange = (startsAt?: string | null, endsAt?: string | null) => {
  if (!startsAt) return null;

  const startMs = new Date(startsAt).getTime();
  if (!Number.isFinite(startMs)) return null;

  const endCandidateMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const endMs = Number.isFinite(endCandidateMs) && endCandidateMs > startMs
    ? endCandidateMs
    : startMs;

  return {
    startsAt,
    endsAt: endsAt ?? startsAt,
    day: String(startsAt).slice(0, 10),
    startMs,
    endMs,
  };
};

const rangesOverlap = (
  left: NonNullable<ReturnType<typeof toActivityRange>>,
  right: NonNullable<ReturnType<typeof toActivityRange>>,
): boolean => {
  if (left.day !== right.day) return false;

  const leftEndExclusive = left.endMs > left.startMs ? left.endMs : left.startMs + 1;
  const rightEndExclusive = right.endMs > right.startMs ? right.endMs : right.startMs + 1;

  return left.startMs < rightEndExclusive && right.startMs < leftEndExclusive;
};

const ensureNoGroupActivityCollision = async ({
  itineraryId,
  groupId,
  nextStartsAt,
  nextEndsAt,
  excludeActivityId,
}: {
  itineraryId: string | number;
  groupId?: string | number | null;
  nextStartsAt?: string | null;
  nextEndsAt?: string | null;
  excludeActivityId?: string | null;
}) => {
  const candidateRange = toActivityRange(nextStartsAt, nextEndsAt);
  if (!candidateRange) return;

  const { data: siblingActivities, error } = await supabase
    .from('actividades')
    .select('id_actividad, titulo, fecha_inicio, fecha_fin, estado')
    .eq('itinerario_id', itineraryId);

  if (error) throw new Error(error.message);

  const conflictingActivity = (siblingActivities ?? []).find((activity: any) => {
    if (excludeActivityId && String(activity.id_actividad) === String(excludeActivityId)) return false;
    if (String(activity.estado ?? '') === 'cancelada') return false;

    const siblingRange = toActivityRange(
      activity.fecha_inicio ? String(activity.fecha_inicio) : null,
      activity.fecha_fin ? String(activity.fecha_fin) : null,
    );

    return siblingRange ? rangesOverlap(candidateRange, siblingRange) : false;
  });

  if (conflictingActivity) {
    throw Object.assign(
      new Error(`Ya existe una actividad grupal que se empalma con este horario: "${String(conflictingActivity.titulo ?? 'Actividad existente')}"`),
      { statusCode: 409 },
    );
  }

  if (!groupId) return;

  const { data: subgroupSlots, error: subgroupSlotsError } = await supabase
    .from('subgroup_slots')
    .select('id, title, starts_at, ends_at')
    .eq('group_id', groupId);
  if (subgroupSlotsError) throw new Error(subgroupSlotsError.message);

  const conflictingSlot = (subgroupSlots ?? []).find((slot: any) => {
    const slotRange = toActivityRange(
      slot.starts_at ? String(slot.starts_at) : null,
      slot.ends_at ? String(slot.ends_at) : null,
    );
    return slotRange ? rangesOverlap(candidateRange, slotRange) : false;
  });

  if (conflictingSlot) {
    throw Object.assign(
      new Error(`Este horario se empalma con el bloque de subgrupos "${String((conflictingSlot as any).title ?? 'Horario de subgrupos')}"`),
      { statusCode: 409 },
    );
  }
};

const addDays = (dateValue: string, days: number): string => {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const minDate = (dates: string[]): string | null =>
  dates.length > 0 ? dates.reduce((min, date) => (date < min ? date : min), dates[0]) : null;

const maxDate = (dates: string[]): string | null =>
  dates.length > 0 ? dates.reduce((max, date) => (date > max ? date : max), dates[0]) : null;

const getActivityCategory = (activity: any): 'transporte' | 'hospedaje' | 'actividad' => {
  const tipo = activity.propuestas?.tipo_item;

  if (tipo === 'vuelo') return 'transporte';
  if (tipo === 'hospedaje') return 'hospedaje';

  return 'actividad';
};

const getPayloadImage = (activity: any): string => {
  const activityPayload = activity.payload && typeof activity.payload === 'object' ? activity.payload : {};
  const proposalPayload = activity.propuestas?.payload && typeof activity.propuestas.payload === 'object' ? activity.propuestas.payload : {};

  return (
    activityPayload.imageUrl ??
    activityPayload.photoUrl ??
    proposalPayload.imageUrl ??
    proposalPayload.photoUrl ??
    DEFAULT_ACTIVITY_IMAGE
  );
};

export const getGroupItinerary = async (
  authUserId: string,
  groupId: string
): Promise<{ itinerary: any | null; days: ItineraryDay[] }> => {
  const { usuarioId } = await ensureGroupMember(authUserId, groupId);

  const { data: group, error: groupError } = await supabase
    .from('grupos_viaje')
    .select('id, nombre, fecha_inicio, fecha_fin')
    .eq('id', groupId)
    .single();

  if (groupError || !group) {
    throw Object.assign(new Error('Grupo no encontrado'), { statusCode: 404 });
  }

  const { data: itineraries, error: itineraryError } = await supabase
    .from('itinerarios')
    .select('*')
    .eq('grupo_id', groupId)
    .order('fecha_creacion', { ascending: false });

  if (itineraryError) throw new Error(itineraryError.message);

  const itinerary = (itineraries ?? [])[0] ?? null;
  const itineraryIds = (itineraries ?? []).map((item: any) => item.id_itinerario).filter(Boolean);

  if (itineraryIds.length === 0) {
    const startDate = group.fecha_inicio ?? new Date().toISOString().slice(0, 10);
    const endDate = group.fecha_fin ?? startDate;
    const totalDays = Math.max(1, diffDays(startDate, endDate) + 1);

    return {
      itinerary: null,
      days: Array.from({ length: totalDays }, (_, index) => {
        const isoDate = addDays(startDate, index);
        return {
          dayNumber: index + 1,
          date: formatDateLabel(isoDate),
          activities: [],
        };
      }),
    };
  }

  const { data: activities, error: activitiesError } = await supabase
    .from('actividades')
    .select(`
      id_actividad,
      propuesta_id,
      titulo,
      descripcion,
      fecha_inicio,
      fecha_fin,
      ubicacion,
      latitud,
      longitud,
      estado,
      creado_por,
      referencia_externa,
      payload,
      propuestas (
        id_propuesta,
        tipo_item,
        titulo,
        creado_por,
        payload
      )
    `)
    .in('itinerario_id', itineraryIds)
    .neq('estado', 'cancelada')
    .order('fecha_inicio', { ascending: true });

  if (activitiesError) throw new Error(activitiesError.message);

  const uniqueMembersCount = await getUniqueGroupMemberCount(groupId);
  const votesRequired = Math.floor(uniqueMembersCount / 2) + 1;

  const pendingProposalIds = (activities ?? [])
    .filter((activity: any) => activity.estado === 'pendiente' && activity.propuesta_id != null)
    .map((activity: any) => Number(activity.propuesta_id));

  if (pendingProposalIds.length > 0) {
    let votesByProposal: any[] | null = null;
    let votesByProposalError: any = null;
    ({ data: votesByProposal, error: votesByProposalError } = await supabase
      .from('voto')
      .select('id_propuesta, voto_tipo')
      .in('id_propuesta', pendingProposalIds));

    if (votesByProposalError && isMissingVoteTypeColumnError(votesByProposalError)) {
      const fallback = await supabase
        .from('voto')
        .select('id_propuesta')
        .in('id_propuesta', pendingProposalIds);
      votesByProposal = (fallback.data ?? []).map((row: any) => ({ ...row, voto_tipo: 'a_favor' }));
      votesByProposalError = fallback.error;
    }

    if (votesByProposalError) throw new Error(votesByProposalError.message);

    const voteCountMap = new Map<number, number>();
    for (const row of votesByProposal ?? []) {
      const proposalId = Number((row as any).id_propuesta);
      const voteType = String((row as any).voto_tipo ?? 'a_favor');
      if (voteType !== 'a_favor') continue;
      voteCountMap.set(proposalId, (voteCountMap.get(proposalId) ?? 0) + 1);
    }

    const proposalIdsToConfirm = pendingProposalIds.filter((proposalId) => {
      const votes = voteCountMap.get(proposalId) ?? 0;
      return votes >= votesRequired;
    });

    if (proposalIdsToConfirm.length > 0) {
      const nowIso = new Date().toISOString();

      const { error: confirmActivitiesError } = await supabase
        .from('actividades')
        .update({ estado: 'confirmada', ultima_actualizacion: nowIso })
        .in('propuesta_id', proposalIdsToConfirm);

      if (confirmActivitiesError) throw new Error(confirmActivitiesError.message);

      const { error: approveProposalsError } = await supabase
        .from('propuestas')
        .update({ estado: 'aprobada', fecha_cierre: nowIso, ultima_actualizacion: nowIso })
        .in('id_propuesta', proposalIdsToConfirm)
        .eq('grupo_id', groupId);

      if (approveProposalsError) throw new Error(approveProposalsError.message);

      for (const activity of activities ?? []) {
        if (activity.propuesta_id != null && proposalIdsToConfirm.includes(Number(activity.propuesta_id))) {
          activity.estado = 'confirmada';
        }
      }
    }
  }

  const proposalIds = (activities ?? [])
    .filter((activity: any) => activity.propuesta_id != null)
    .map((activity: any) => Number(activity.propuesta_id));

  const { data: myVotes, error: myVotesError } = proposalIds.length > 0
    ? await supabase
        .from('voto')
        .select('id_propuesta')
        .eq('id_usuario', usuarioId)
        .in('id_propuesta', proposalIds)
    : { data: [], error: null };

  if (myVotesError) throw new Error(myVotesError.message);

  const myVotedProposalIds = new Set(
    (myVotes ?? []).map((vote: any) => String(vote.id_propuesta))
  );

  const activityDates = (activities ?? [])
    .map((activity: any) => activity.fecha_inicio ? String(activity.fecha_inicio).slice(0, 10) : null)
    .filter((date: string | null): date is string => Boolean(date));

  const plannedStartDate =
    itinerary.fecha_inicio ??
    group.fecha_inicio ??
    minDate(activityDates) ??
    new Date().toISOString().slice(0, 10);
  const plannedEndDate =
    itinerary.fecha_fin ??
    group.fecha_fin ??
    maxDate(activityDates) ??
    plannedStartDate;

  const earliestActivityDate = minDate(activityDates);
  const latestActivityDate = maxDate(activityDates);
  const startDate =
    earliestActivityDate && earliestActivityDate < plannedStartDate
      ? earliestActivityDate
      : plannedStartDate;
  const endDate =
    latestActivityDate && latestActivityDate > plannedEndDate
      ? latestActivityDate
      : plannedEndDate;

  const totalDays = Math.max(1, diffDays(startDate, endDate) + 1);

  const days: ItineraryDay[] = Array.from({ length: totalDays }, (_, index) => {
    const isoDate = addDays(startDate, index);

    return {
      dayNumber: index + 1,
      date: formatDateLabel(isoDate),
      activities: [],
    };
  });

  for (const activity of activities ?? []) {
    const activityDate = getActivityDate(activity, startDate);
    const dayIndex = diffDays(startDate, activityDate);

    if (dayIndex < 0 || dayIndex >= days.length) continue;

    const proposalRow = Array.isArray(activity.propuestas)
      ? (activity.propuestas[0] ?? null)
      : (activity.propuestas ?? null);
    const proposalPayload =
      proposalRow?.payload && typeof proposalRow.payload === 'object'
        ? proposalRow.payload
        : {};
    const adminDecisionType =
      proposalPayload && (proposalPayload as any).decisionType
        ? String((proposalPayload as any).decisionType)
        : null;

    days[dayIndex].activities.push({
      id: String(activity.id_actividad),
      proposalId: activity.propuesta_id ? String(activity.propuesta_id) : null,
      createdBy: String(
        activity.creado_por ??
        ((activity.propuestas as any)?.creado_por) ??
        ''
      ),
      hasVoted: activity.propuesta_id
        ? myVotedProposalIds.has(String(activity.propuesta_id))
        : false,
      title: activity.titulo,
      description: activity.descripcion ?? 'Sin descripción',
      category: getActivityCategory(activity),
      status: activity.estado === 'confirmada' ? 'confirmada' : 'pendiente',
      price: 0,
      currency: 'MXN',
      time: formatTimeLabel(resolveActivityDateTime(activity, activityDate)),
      location: activity.ubicacion ?? undefined,
      image: getPayloadImage(activity),
      externalReference: activity.referencia_externa ?? null,
      latitude: activity.latitud ?? null,
      longitude: activity.longitud ?? null,
      adminDecisionType: adminDecisionType === 'A' ? 'A' : null,
      startsAt: activity.fecha_inicio ? String(activity.fecha_inicio) : null,
      endsAt: activity.fecha_fin ? String(activity.fecha_fin) : null,
    });
  }

  return {
    itinerary,
    days,
  };
};

export const createGroupActivity = async (
  authUserId: string,
  groupId: string,
  payload: CreateItineraryActivityPayload
) => {
  const usuarioId = await getLocalUserId(authUserId);
  await ensureGroupMember(authUserId, groupId);

  const { data: group, error: groupError } = await supabase
    .from('grupos_viaje')
    .select('id, nombre, fecha_inicio, fecha_fin')
    .eq('id', groupId)
    .single();

  if (groupError || !group) {
    throw Object.assign(new Error('Grupo no encontrado'), { statusCode: 404 });
  }

  const { data: existingItinerary, error: itineraryLookupError } = await supabase
    .from('itinerarios')
    .select('*')
    .eq('grupo_id', groupId)
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (itineraryLookupError) throw new Error(itineraryLookupError.message);

  let itinerary = existingItinerary;

  if (!itinerary) {
    const { data: createdItinerary, error: createItineraryError } = await supabase
      .from('itinerarios')
      .insert({
        grupo_id: Number(groupId),
        nombre: `Itinerario de ${group.nombre}`,
        descripcion: null,
        fecha_inicio: group.fecha_inicio,
        fecha_fin: group.fecha_fin,
        estado: 'activo',
        creado_por: Number(usuarioId),
      })
      .select('*')
      .single();

    if (createItineraryError || !createdItinerary) {
      throw new Error(createItineraryError?.message ?? 'Error al crear itinerario');
    }

    itinerary = createdItinerary;
  }

  await ensureNoGroupActivityCollision({
    itineraryId: itinerary.id_itinerario,
    groupId,
    nextStartsAt: payload.fecha_inicio ?? null,
    nextEndsAt: payload.fecha_fin ?? payload.fecha_inicio ?? null,
  });

  const { data: proposal, error: proposalError } = await supabase
  .from('propuestas')
  .insert({
    grupo_id: Number(groupId),
    tipo_item: 'actividad',
    titulo: payload.titulo,
    descripcion: payload.descripcion ?? null,
    referencia_externa: payload.referencia_externa ?? null,
    fuente: payload.fuente ?? 'google_maps',
    payload: payload.payload ?? {},
    estado: 'en_votacion',
    creado_por: Number(usuarioId),
    fecha_apertura: new Date().toISOString(),
    fecha_cierre: null,
  })
  .select('*')
  .single();

  if (proposalError || !proposal) {
    throw new Error(proposalError?.message ?? 'Error al crear propuesta');
  }

  const { data: activity, error: activityError } = await supabase
  .from('actividades')
  .insert({
    itinerario_id: itinerary.id_itinerario,
    propuesta_id: proposal.id_propuesta,
    titulo: payload.titulo,
    descripcion: payload.descripcion ?? null,
    fecha_inicio: payload.fecha_inicio ?? null,
    fecha_fin: payload.fecha_fin ?? null,
    ubicacion: payload.ubicacion ?? null,
    latitud: payload.latitud ?? null,
    longitud: payload.longitud ?? null,
    referencia_externa: payload.referencia_externa ?? null,
    fuente: payload.fuente ?? 'google_maps',
    payload: payload.payload ?? null,
    estado: 'pendiente',
    creado_por: Number(usuarioId),
  })
  .select('*')
  .single();

  if (activityError || !activity) {
    await supabase.from('propuestas').delete().eq('id_propuesta', proposal.id_propuesta);
    throw new Error(activityError?.message ?? 'Error al crear actividad');
  }

  // Si el grupo tiene un solo integrante, su mayoría simple es 1.
  // Confirmamos de inmediato para evitar que quede "por confirmar" innecesariamente.
  const uniqueMembersCount = await getUniqueGroupMemberCount(groupId);

  if (uniqueMembersCount <= 1) {
    let voteInsertError: any = null;
    ({ error: voteInsertError } = await supabase
      .from('voto')
      .insert({
        id_propuesta: proposal.id_propuesta,
        id_usuario: Number(usuarioId),
        voto_tipo: 'a_favor',
      }));

    if (voteInsertError && isMissingVoteTypeColumnError(voteInsertError)) {
      const fallbackInsert = await supabase
        .from('voto')
        .insert({
          id_propuesta: proposal.id_propuesta,
          id_usuario: Number(usuarioId),
        });
      voteInsertError = fallbackInsert.error;
    }

    if (voteInsertError) throw new Error(voteInsertError.message);

    const nowIso = new Date().toISOString();
    const { error: proposalApproveError } = await supabase
      .from('propuestas')
      .update({
        estado: 'aprobada',
        fecha_cierre: nowIso,
        ultima_actualizacion: nowIso,
      })
      .eq('id_propuesta', proposal.id_propuesta)
      .eq('grupo_id', groupId);

    if (proposalApproveError) throw new Error(proposalApproveError.message);

    const { error: activityConfirmError } = await supabase
      .from('actividades')
      .update({
        estado: 'confirmada',
        ultima_actualizacion: nowIso,
      })
      .eq('id_actividad', activity.id_actividad);

    if (activityConfirmError) throw new Error(activityConfirmError.message);
  }

  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  await NotificationsService.createNotificationForGroupMembers(
    Number(groupId),
    Number(usuarioId),
    {
      tipo: 'actividad_creada',
      titulo: 'Nueva actividad',
      mensaje: `${actorName} agregó "${payload.titulo}" al itinerario.`,
      entidadTipo: 'actividad',
      entidadId: activity.id_actividad,
      metadata: {
        actorName,
        actorUsuarioId: Number(usuarioId),
        itemTitle: payload.titulo,
        itemType: 'actividad',
        scheduledAt: payload.fecha_inicio ?? null,
        scheduledEndAt: payload.fecha_fin ?? null,
        location: payload.ubicacion ?? null,
      },
    }
  );

  return activity;
};

export const updateGroupActivity = async (
  authUserId: string,
  groupId: string,
  activityId: string,
  payload: Partial<CreateItineraryActivityPayload>
) => {
  const usuarioId = await getLocalUserId(authUserId);
  await ensureGroupMember(authUserId, groupId);

  const { data: itinerary, error: itineraryError } = await supabase
    .from('itinerarios')
    .select('id_itinerario')
    .eq('grupo_id', groupId)
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (itineraryError) throw new Error(itineraryError.message);
  if (!itinerary) throw Object.assign(new Error('Itinerario no encontrado'), { statusCode: 404 });

  const { data: currentActivity, error: currentActivityError } = await supabase
    .from('actividades')
    .select('id_actividad, estado, propuesta_id, creado_por, titulo, descripcion, ubicacion, latitud, longitud, fecha_inicio, fecha_fin')
    .eq('id_actividad', activityId)
    .eq('itinerario_id', itinerary.id_itinerario)
    .maybeSingle();

  if (currentActivityError) throw new Error(currentActivityError.message);
  if (!currentActivity) throw Object.assign(new Error('Actividad no encontrada'), { statusCode: 404 });
  if (String((currentActivity as any).creado_por) !== String(usuarioId)) {
    throw Object.assign(new Error('Solo el creador de la propuesta puede editarla'), {
      statusCode: 403,
    });
  }

  const nextStartsAt =
    payload.fecha_inicio !== undefined ? payload.fecha_inicio : ((currentActivity as any).fecha_inicio ?? null);
  const nextEndsAt =
    payload.fecha_fin !== undefined ? payload.fecha_fin : ((currentActivity as any).fecha_fin ?? nextStartsAt ?? null);

  await ensureNoGroupActivityCollision({
    itineraryId: itinerary.id_itinerario,
    groupId,
    nextStartsAt,
    nextEndsAt,
    excludeActivityId: activityId,
  });

  const updateData = {
    ...(payload.titulo !== undefined ? { titulo: payload.titulo } : {}),
    ...(payload.descripcion !== undefined ? { descripcion: payload.descripcion } : {}),
    ...(payload.ubicacion !== undefined ? { ubicacion: payload.ubicacion } : {}),
    ...(payload.latitud !== undefined ? { latitud: payload.latitud } : {}),
    ...(payload.longitud !== undefined ? { longitud: payload.longitud } : {}),
    ...(payload.fecha_inicio !== undefined ? { fecha_inicio: payload.fecha_inicio } : {}),
    ...(payload.fecha_fin !== undefined ? { fecha_fin: payload.fecha_fin } : {}),
    ...(payload.referencia_externa !== undefined ? { referencia_externa: payload.referencia_externa } : {}),
    ...(payload.fuente !== undefined ? { fuente: payload.fuente } : {}),
    ...(payload.payload !== undefined ? { payload: payload.payload } : {}),
    ultima_actualizacion: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('actividades')
    .update(updateData)
    .eq('id_actividad', activityId)
    .eq('itinerario_id', itinerary.id_itinerario)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo actualizar la actividad');
  }

  const toComparable = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };
  const sameNumber = (a: unknown, b: unknown): boolean => {
    if (a === null || a === undefined || b === null || b === undefined) return a == null && b == null;
    return Number(a) === Number(b);
  };

  const titleChanged =
    payload.titulo !== undefined &&
    toComparable(payload.titulo) !== toComparable((currentActivity as any).titulo);
  const descriptionChanged =
    payload.descripcion !== undefined &&
    toComparable(payload.descripcion) !== toComparable((currentActivity as any).descripcion);
  const locationChanged =
    payload.ubicacion !== undefined &&
    toComparable(payload.ubicacion) !== toComparable((currentActivity as any).ubicacion);
  const latChanged =
    payload.latitud !== undefined &&
    !sameNumber(payload.latitud, (currentActivity as any).latitud);
  const lngChanged =
    payload.longitud !== undefined &&
    !sameNumber(payload.longitud, (currentActivity as any).longitud);
  const startChanged =
    payload.fecha_inicio !== undefined &&
    toComparable(payload.fecha_inicio) !== toComparable((currentActivity as any).fecha_inicio);
  const endChanged =
    payload.fecha_fin !== undefined &&
    toComparable(payload.fecha_fin) !== toComparable((currentActivity as any).fecha_fin);

  const touchedVotingFields =
    titleChanged ||
    descriptionChanged ||
    locationChanged ||
    latChanged ||
    lngChanged ||
    startChanged ||
    endChanged;

  if (currentActivity.estado === 'confirmada' && touchedVotingFields && currentActivity.propuesta_id) {
    const nowIso = new Date().toISOString();

    const { error: setPendingError } = await supabase
      .from('actividades')
      .update({ estado: 'pendiente', ultima_actualizacion: nowIso })
      .eq('id_actividad', activityId);

    if (setPendingError) throw new Error(setPendingError.message);

    const { error: resetProposalError } = await supabase
      .from('propuestas')
      .update({ estado: 'en_votacion', fecha_cierre: null, ultima_actualizacion: nowIso })
      .eq('id_propuesta', currentActivity.propuesta_id)
      .eq('grupo_id', groupId);

    if (resetProposalError) throw new Error(resetProposalError.message);

    const { error: clearVotesError } = await supabase
      .from('voto')
      .delete()
      .eq('id_propuesta', currentActivity.propuesta_id);

    if (clearVotesError) throw new Error(clearVotesError.message);
  }

  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'actividad_actualizada',
    entidadTipo: 'actividad',
    entidadId: Number(activityId),
    actorUsuarioId: Number(usuarioId),
    metadata: {
      actorName,
      actorUsuarioId: Number(usuarioId),
      itemTitle: data.titulo ?? (currentActivity as any).titulo ?? 'Actividad',
      itemType: 'actividad',
      scheduledAt: data.fecha_inicio ?? null,
      scheduledEndAt: data.fecha_fin ?? null,
      location: data.ubicacion ?? null,
      proposalId: currentActivity.propuesta_id ?? null,
      requiresRevote: Boolean(currentActivity.estado === 'confirmada' && touchedVotingFields && currentActivity.propuesta_id),
    },
  });

  return data;
};
export const deleteGroupActivity = async (
  authUserId: string,
  groupId: string,
  activityId: string
) => {
  const { usuarioId, membership } = await ensureGroupMember(authUserId, groupId);

  const { data: itinerary, error: itineraryError } = await supabase
    .from('itinerarios')
    .select('id_itinerario')
    .eq('grupo_id', groupId)
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (itineraryError) throw new Error(itineraryError.message);
  if (!itinerary) throw Object.assign(new Error('Itinerario no encontrado'), { statusCode: 404 });

  const { data: activity, error: activityLookupError } = await supabase
    .from('actividades')
    .select('id_actividad, propuesta_id, creado_por, titulo, ubicacion, fecha_inicio')
    .eq('id_actividad', activityId)
    .eq('itinerario_id', itinerary.id_itinerario)
    .maybeSingle();

  if (activityLookupError) throw new Error(activityLookupError.message);
  if (!activity) throw Object.assign(new Error('Actividad no encontrada'), { statusCode: 404 });
  const isOwner = String((activity as any).creado_por) === String(usuarioId);
  const isAdmin = membership.rol === 'admin';

  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error('Solo el creador o un administrador del grupo puede eliminarla'), {
      statusCode: 403,
    });
  }

  const proposalId = activity.propuesta_id;

  const { error: activityDeleteError } = await supabase
    .from('actividades')
    .delete()
    .eq('id_actividad', activityId)
    .eq('itinerario_id', itinerary.id_itinerario);

  if (activityDeleteError) throw new Error(activityDeleteError.message);

  if (proposalId) {
    await supabase.from('voto').delete().eq('id_propuesta', proposalId);
    await supabase.from('comentario').delete().eq('id_propuesta', proposalId);

    const { error: proposalDeleteError } = await supabase
      .from('propuestas')
      .delete()
      .eq('id_propuesta', proposalId)
      .eq('grupo_id', groupId);

    if (proposalDeleteError) throw new Error(proposalDeleteError.message);
  }

  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo: 'actividad_eliminada',
    entidadTipo: 'actividad',
    entidadId: Number(activityId),
    actorUsuarioId: Number(usuarioId),
    metadata: {
      actorName,
      actorUsuarioId: Number(usuarioId),
      itemTitle: (activity as any).titulo ?? 'Actividad',
      itemType: 'actividad',
      proposalId: proposalId ?? null,
      location: (activity as any).ubicacion ?? null,
      scheduledAt: (activity as any).fecha_inicio ?? null,
    },
  });

  return true;
};
