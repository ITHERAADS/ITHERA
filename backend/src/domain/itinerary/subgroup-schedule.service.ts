import { supabase } from '../../infrastructure/db/supabase.client';
import { getLocalUserId } from '../groups/groups.service';

type Role = 'admin' | 'viajero';

const isThirtyMinuteBoundary = (value: string): boolean => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0 && date.getUTCMinutes() % 30 === 0;
};

const getMexicoDateOnly = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
};

const validateSlotDateRules = async (
  groupId: string,
  startsAt: string,
  endsAt: string,
) => {
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    throw Object.assign(new Error('Fechas inválidas para horario de subgrupos'), { statusCode: 400 });
  }
  if (ends.getTime() <= starts.getTime()) {
    throw Object.assign(new Error('La fecha fin debe ser mayor a la fecha inicio'), { statusCode: 400 });
  }
  if (!isThirtyMinuteBoundary(startsAt) || !isThirtyMinuteBoundary(endsAt)) {
    throw Object.assign(new Error('Los horarios deben estar en intervalos de 30 minutos exactos'), { statusCode: 400 });
  }

  const { data: group, error } = await supabase
    .from('grupos_viaje')
    .select('fecha_inicio, fecha_fin')
    .eq('id', groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!group) throw Object.assign(new Error('Grupo no encontrado'), { statusCode: 404 });
  if (!group.fecha_inicio || !group.fecha_fin) {
    throw Object.assign(new Error('El viaje debe tener fecha de inicio y fin para usar subgrupos'), { statusCode: 400 });
  }

  const startDay = getMexicoDateOnly(starts);
  const endDay = getMexicoDateOnly(ends);
  if (startDay < String(group.fecha_inicio) || endDay > String(group.fecha_fin)) {
    throw Object.assign(
      new Error(`El horario debe estar dentro del rango del viaje (${group.fecha_inicio} a ${group.fecha_fin})`),
      { statusCode: 400 },
    );
  }
};

const ensureGroupMember = async (authUserId: string, groupId: string) => {
  const userId = await getLocalUserId(authUserId);
  const { data, error } = await supabase
    .from('grupo_miembros')
    .select('id, rol')
    .eq('grupo_id', groupId)
    .eq('usuario_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw Object.assign(new Error('No perteneces a este grupo'), { statusCode: 403 });

  return {
    userId: Number(userId),
    role: String((data as any).rol ?? 'viajero') as Role,
  };
};

const ensureGroupAdmin = async (authUserId: string, groupId: string) => {
  const member = await ensureGroupMember(authUserId, groupId);
  if (member.role !== 'admin') {
    throw Object.assign(new Error('Solo admin puede administrar horarios de subgrupos'), { statusCode: 403 });
  }
  return member;
};

const ensureSlotInGroup = async (slotId: string, groupId: string) => {
  const { data, error } = await supabase
    .from('subgroup_slots')
    .select('*')
    .eq('id', slotId)
    .eq('group_id', groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw Object.assign(new Error('Horario de subgrupos no encontrado'), { statusCode: 404 });
  return data;
};

const ensureSubgroupInSlot = async (subgroupId: string, slotId: string) => {
  const { data, error } = await supabase
    .from('subgroups')
    .select('*')
    .eq('id', subgroupId)
    .eq('slot_id', slotId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw Object.assign(new Error('Subgrupo no encontrado en este horario'), { statusCode: 404 });
  return data;
};

const getGroupUserProfiles = async (groupId: string) => {
  const { data: groupMembers, error } = await supabase
    .from('grupo_miembros')
    .select('usuario_id')
    .eq('grupo_id', groupId);
  if (error) throw new Error(error.message);

  const userIds = Array.from(new Set((groupMembers ?? [])
    .map((row: any) => Number(row.usuario_id))
    .filter((id) => Number.isFinite(id))));
  if (userIds.length === 0) return new Map<number, any>();

  const users = await Promise.all(userIds.map(async (userId) => {
    const { data, error: userError } = await supabase
      .from('usuarios')
      .select('id_usuario, nombre, email, avatar_url')
      .eq('id_usuario', userId)
      .maybeSingle();
    if (userError) throw new Error(userError.message);
    return data;
  }));

  return new Map((users ?? []).map((user: any) => [Number(user.id_usuario), user]));
};

export const getSubgroupSchedule = async (authUserId: string, groupId: string) => {
  const member = await ensureGroupMember(authUserId, groupId);

  const { data: slots, error: slotsError } = await supabase
    .from('subgroup_slots')
    .select('*')
    .eq('group_id', groupId)
    .order('starts_at', { ascending: true });
  if (slotsError) throw new Error(slotsError.message);

  const slotIds = (slots ?? []).map((slot: any) => slot.id);
  if (slotIds.length === 0) {
    return { slots: [], myUserId: member.userId };
  }

  const [{ data: subgroups, error: subgroupsError }, { data: activities, error: activitiesError }, { data: memberships, error: membershipsError }, userProfiles] = await Promise.all([
    supabase.from('subgroups').select('*').in('slot_id', slotIds).order('created_at', { ascending: true }),
    supabase.from('subgroup_activities').select('*').in('slot_id', slotIds).order('created_at', { ascending: true }),
    supabase.from('subgroup_memberships').select('*, usuarios!user_id(id_usuario, nombre, avatar_url)').in('slot_id', slotIds),
    getGroupUserProfiles(groupId),
  ]);

  if (subgroupsError) throw new Error(subgroupsError.message);
  if (activitiesError) throw new Error(activitiesError.message);
  if (membershipsError) throw new Error(membershipsError.message);

  const subgroupsBySlot = new Map<number, any[]>();
  for (const subgroup of subgroups ?? []) {
    const slotId = Number((subgroup as any).slot_id);
    const list = subgroupsBySlot.get(slotId) ?? [];
    list.push(subgroup);
    subgroupsBySlot.set(slotId, list);
  }

  const activitiesBySubgroup = new Map<number, any[]>();
  for (const activity of activities ?? []) {
    const subgroupId = Number((activity as any).subgroup_id);
    const list = activitiesBySubgroup.get(subgroupId) ?? [];
    list.push(activity);
    activitiesBySubgroup.set(subgroupId, list);
  }

  const membershipsBySlot = new Map<number, any[]>();
  for (const row of memberships ?? []) {
    const slotId = Number((row as any).slot_id);
    const list = membershipsBySlot.get(slotId) ?? [];
    const user = userProfiles.get(Number((row as any).user_id)) ?? (row as any).usuarios ?? null;
    list.push({
      ...row,
      usuarios: user,
      user,
    });
    membershipsBySlot.set(slotId, list);
  }

  const normalizedSlots = (slots ?? []).map((slot: any) => {
    const slotSubgroups = (subgroupsBySlot.get(Number(slot.id)) ?? []).map((subgroup: any) => ({
      ...subgroup,
      activities: activitiesBySubgroup.get(Number(subgroup.id)) ?? [],
      members: (membershipsBySlot.get(Number(slot.id)) ?? []).filter(
        (m: any) => m.subgroup_id != null && Number(m.subgroup_id) === Number(subgroup.id),
      ),
    }));

    return {
      ...slot,
      subgroups: slotSubgroups,
      memberships: membershipsBySlot.get(Number(slot.id)) ?? [],
    };
  });

  return { slots: normalizedSlots, myUserId: member.userId };
};

export const createSlot = async (
  authUserId: string,
  groupId: string,
  payload: { title: string; description?: string | null; starts_at: string; ends_at: string },
) => {
  const admin = await ensureGroupAdmin(authUserId, groupId);
  await validateSlotDateRules(groupId, payload.starts_at, payload.ends_at);

  const { data, error } = await supabase
    .from('subgroup_slots')
    .insert({
      group_id: Number(groupId),
      title: payload.title,
      description: payload.description ?? null,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      created_by: admin.userId,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo crear horario');
  return data;
};

export const updateSlot = async (
  authUserId: string,
  groupId: string,
  slotId: string,
  payload: Partial<{ title: string; description: string | null; starts_at: string; ends_at: string }>,
) => {
  await ensureGroupAdmin(authUserId, groupId);
  const current = await ensureSlotInGroup(slotId, groupId);
  const nextStartsAt = payload.starts_at ?? String((current as any).starts_at);
  const nextEndsAt = payload.ends_at ?? String((current as any).ends_at);
  await validateSlotDateRules(groupId, nextStartsAt, nextEndsAt);

  const { data, error } = await supabase
    .from('subgroup_slots')
    .update({
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.starts_at !== undefined ? { starts_at: payload.starts_at } : {}),
      ...(payload.ends_at !== undefined ? { ends_at: payload.ends_at } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', slotId)
    .eq('group_id', groupId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo actualizar horario');
  return data;
};

export const deleteSlot = async (authUserId: string, groupId: string, slotId: string) => {
  await ensureGroupAdmin(authUserId, groupId);
  await ensureSlotInGroup(slotId, groupId);
  const { error } = await supabase.from('subgroup_slots').delete().eq('id', slotId).eq('group_id', groupId);
  if (error) throw new Error(error.message);
};

export const createSubgroup = async (
  authUserId: string,
  groupId: string,
  slotId: string,
  payload: { name: string; description?: string | null },
) => {
  const member = await ensureGroupMember(authUserId, groupId);
  await ensureSlotInGroup(slotId, groupId);

  const { data, error } = await supabase
    .from('subgroups')
    .insert({
      slot_id: Number(slotId),
      name: payload.name,
      description: payload.description ?? null,
      created_by: member.userId,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo crear subgrupo');

  const { error: membershipError } = await supabase
    .from('subgroup_memberships')
    .upsert({
      slot_id: Number(slotId),
      subgroup_id: Number((data as any).id),
      user_id: member.userId,
      assigned_by: member.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slot_id,user_id' });
  if (membershipError) {
    await supabase.from('subgroups').delete().eq('id', (data as any).id);
    throw new Error(membershipError.message);
  }

  return data;
};

export const updateSubgroup = async (
  authUserId: string,
  groupId: string,
  slotId: string,
  subgroupId: string,
  payload: Partial<{ name: string; description: string | null }>,
) => {
  const member = await ensureGroupMember(authUserId, groupId);
  const subgroup = await ensureSubgroupInSlot(subgroupId, slotId);
  const isOwner = Number((subgroup as any).created_by) === member.userId;
  const isAdmin = member.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error('Solo creador o admin puede editar subgrupos'), { statusCode: 403 });
  }

  const { data, error } = await supabase
    .from('subgroups')
    .update({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subgroupId)
    .eq('slot_id', slotId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo actualizar subgrupo');
  return data;
};

export const deleteSubgroup = async (
  authUserId: string,
  groupId: string,
  slotId: string,
  subgroupId: string,
) => {
  const member = await ensureGroupMember(authUserId, groupId);
  const subgroup = await ensureSubgroupInSlot(subgroupId, slotId);
  const isOwner = Number((subgroup as any).created_by) === member.userId;
  const isAdmin = member.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error('Solo creador o admin puede eliminar subgrupos'), { statusCode: 403 });
  }

  const { error } = await supabase.from('subgroups').delete().eq('id', subgroupId).eq('slot_id', slotId);
  if (error) throw new Error(error.message);
};

export const joinSubgroup = async (
  authUserId: string,
  groupId: string,
  slotId: string,
  subgroupId: string | null,
) => {
  const member = await ensureGroupMember(authUserId, groupId);
  await ensureSlotInGroup(slotId, groupId);
  if (subgroupId) await ensureSubgroupInSlot(subgroupId, slotId);

  const { data: currentMembership, error: currentMembershipError } = await supabase
    .from('subgroup_memberships')
    .select('subgroup_id')
    .eq('slot_id', slotId)
    .eq('user_id', member.userId)
    .maybeSingle();
  if (currentMembershipError) throw new Error(currentMembershipError.message);

  const currentSubgroupId = (currentMembership as any)?.subgroup_id;
  if (currentSubgroupId && Number(currentSubgroupId) !== Number(subgroupId)) {
    const { count, error: countError } = await supabase
      .from('subgroup_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', slotId)
      .eq('subgroup_id', currentSubgroupId)
      .neq('user_id', member.userId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) === 0) {
      throw Object.assign(
        new Error('El subgrupo debe tener al menos una persona. Eliminalo o espera a que alguien mas se una.'),
        { statusCode: 400 },
      );
    }
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('subgroup_memberships')
    .upsert({
      slot_id: Number(slotId),
      subgroup_id: subgroupId ? Number(subgroupId) : null,
      user_id: member.userId,
      assigned_by: member.userId,
      updated_at: now,
    }, { onConflict: 'slot_id,user_id' })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo actualizar tu subgrupo');
  return data;
};

export const createSubgroupActivity = async (
  authUserId: string,
  groupId: string,
  slotId: string,
  subgroupId: string,
  payload: { title: string; description?: string | null; location?: string | null; starts_at?: string | null; ends_at?: string | null },
) => {
  const member = await ensureGroupMember(authUserId, groupId);
  const slot = await ensureSlotInGroup(slotId, groupId);
  await ensureSubgroupInSlot(subgroupId, slotId);

  const startsAt = payload.starts_at ?? null;
  if (startsAt) {
    const starts = new Date(startsAt);
    const slotStarts = new Date(String((slot as any).starts_at));
    const slotEnds = new Date(String((slot as any).ends_at));
    if (Number.isNaN(starts.getTime()) || starts < slotStarts || starts >= slotEnds) {
      throw Object.assign(
        new Error('La hora estimada debe estar dentro del horario de subgrupos y antes de la hora de termino'),
        { statusCode: 400 },
      );
    }
    if (!isThirtyMinuteBoundary(startsAt)) {
      throw Object.assign(new Error('La hora estimada debe estar en intervalos de 30 minutos exactos'), { statusCode: 400 });
    }
  }

  const { data, error } = await supabase
    .from('subgroup_activities')
    .insert({
      slot_id: Number(slotId),
      subgroup_id: Number(subgroupId),
      title: payload.title,
      description: payload.description ?? null,
      location: payload.location ?? null,
      starts_at: payload.starts_at ?? null,
      ends_at: payload.ends_at ?? (startsAt ? String((slot as any).ends_at) : null),
      created_by: member.userId,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo crear actividad');
  return data;
};

export const updateSubgroupActivity = async (
  authUserId: string,
  groupId: string,
  slotId: string,
  activityId: string,
  payload: Partial<{ title: string; description: string | null; location: string | null; starts_at: string | null; ends_at: string | null }>,
) => {
  const member = await ensureGroupMember(authUserId, groupId);
  await ensureSlotInGroup(slotId, groupId);

  const { data: activity, error: activityError } = await supabase
    .from('subgroup_activities')
    .select('*')
    .eq('id', activityId)
    .eq('slot_id', slotId)
    .maybeSingle();
  if (activityError) throw new Error(activityError.message);
  if (!activity) throw Object.assign(new Error('Actividad de subgrupo no encontrada'), { statusCode: 404 });

  const isOwner = Number((activity as any).created_by) === member.userId;
  const isAdmin = member.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error('Solo creador o admin puede editar actividades'), { statusCode: 403 });
  }

  const { data, error } = await supabase
    .from('subgroup_activities')
    .update({
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.location !== undefined ? { location: payload.location } : {}),
      ...(payload.starts_at !== undefined ? { starts_at: payload.starts_at } : {}),
      ...(payload.ends_at !== undefined ? { ends_at: payload.ends_at } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', activityId)
    .eq('slot_id', slotId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo actualizar actividad');
  return data;
};

export const deleteSubgroupActivity = async (
  authUserId: string,
  groupId: string,
  slotId: string,
  activityId: string,
) => {
  const member = await ensureGroupMember(authUserId, groupId);
  await ensureSlotInGroup(slotId, groupId);

  const { data: activity, error: activityError } = await supabase
    .from('subgroup_activities')
    .select('*')
    .eq('id', activityId)
    .eq('slot_id', slotId)
    .maybeSingle();
  if (activityError) throw new Error(activityError.message);
  if (!activity) throw Object.assign(new Error('Actividad de subgrupo no encontrada'), { statusCode: 404 });

  const isOwner = Number((activity as any).created_by) === member.userId;
  const isAdmin = member.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error('Solo creador o admin puede eliminar actividades'), { statusCode: 403 });
  }

  const { error } = await supabase.from('subgroup_activities').delete().eq('id', activityId).eq('slot_id', slotId);
  if (error) throw new Error(error.message);
};
