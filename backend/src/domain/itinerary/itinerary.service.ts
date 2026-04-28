import { supabase } from '../../infrastructure/db/supabase.client';
import { getLocalUserId } from '../groups/groups.service';
import { ItineraryDay } from './itinerary.entity';

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
      estado,
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
      image: DEFAULT_ACTIVITY_IMAGE,
    });
  }

  return {
    itinerary,
    days,
  };
};