import { supabase } from '../../infrastructure/db/supabase.client';
import { getLocalUserId } from '../groups/groups.service';
import { CreateItineraryActivityPayload, ItineraryDay } from './itinerary.entity';

const DEFAULT_ACTIVITY_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=300&fit=crop';

const ensureGroupMember = async (authUserId: string, groupId: string) => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data, error } = await supabase
    .from('grupo_miembros')
    .select('id')
    .eq('grupo_id', groupId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    throw Object.assign(new Error('No perteneces a este grupo'), { statusCode: 403 });
  }
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

  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
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
  await ensureGroupMember(authUserId, groupId);

  const { data: itinerary, error: itineraryError } = await supabase
    .from('itinerarios')
    .select('*')
    .eq('grupo_id', groupId)
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (itineraryError) throw new Error(itineraryError.message);

  if (!itinerary) {
    return {
      itinerary: null,
      days: [],
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
      referencia_externa,
      payload,
      propuestas (
        id_propuesta,
        tipo_item,
        titulo,
        payload
      )
    `)
    .eq('itinerario_id', itinerary.id_itinerario)
    .neq('estado', 'cancelada')
    .order('fecha_inicio', { ascending: true });

  if (activitiesError) throw new Error(activitiesError.message);

  const startDate = itinerary.fecha_inicio ?? new Date().toISOString().slice(0, 10);
  const endDate = itinerary.fecha_fin ?? startDate;

  const totalDays = Math.max(1, diffDays(startDate, endDate) + 1);

  const days: ItineraryDay[] = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(`${startDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);

    const isoDate = date.toISOString().slice(0, 10);

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

    days[dayIndex].activities.push({
      id: String(activity.id_actividad),
      title: activity.titulo,
      description: activity.descripcion ?? 'Sin descripción',
      category: getActivityCategory(activity),
      status: activity.estado === 'confirmada' ? 'confirmada' : 'pendiente',
      price: 0,
      currency: 'MXN',
      time: formatTimeLabel(activity.fecha_inicio),
      location: activity.ubicacion ?? undefined,
      image: getPayloadImage(activity),
      externalReference: activity.referencia_externa ?? null,
      latitude: activity.latitud ?? null,
      longitude: activity.longitud ?? null,
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

  return activity;
};

export const updateGroupActivity = async (
  authUserId: string,
  groupId: string,
  activityId: string,
  payload: Partial<CreateItineraryActivityPayload>
) => {
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

  return data;
};
export const deleteGroupActivity = async (
  authUserId: string,
  groupId: string,
  activityId: string
) => {
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

  const { data: activity, error: activityLookupError } = await supabase
    .from('actividades')
    .select('id_actividad, propuesta_id')
    .eq('id_actividad', activityId)
    .eq('itinerario_id', itinerary.id_itinerario)
    .maybeSingle();

  if (activityLookupError) throw new Error(activityLookupError.message);
  if (!activity) throw Object.assign(new Error('Actividad no encontrada'), { statusCode: 404 });

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

  return true;
};
