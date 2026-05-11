import { supabaseAdmin } from '../../infrastructure/db/supabase.client';
import { getLocalUserId } from '../groups/groups.service';
import {
  ContextEntityRef,
  ContextEntitySummary,
  ContextEntityType,
  ContextLink,
  ContextLinkOptions,
  CreateContextLinkPayload,
} from './context-links.entity';

type ServiceError = Error & { statusCode?: number };

type RawContextLink = {
  id: string | number;
  group_id: string | number;
  entity_a_type: ContextEntityType;
  entity_a_id: string;
  entity_b_type: ContextEntityType;
  entity_b_id: string;
  created_by_user_id: string | number;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const ENTITY_TYPES: ContextEntityType[] = ['activity', 'document', 'expense', 'subgroup_activity'];

const createError = (message: string, statusCode: number): ServiceError => {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  return err;
};

const isContextEntityType = (value: unknown): value is ContextEntityType =>
  typeof value === 'string' && ENTITY_TYPES.includes(value as ContextEntityType);

const normalizeEntityRef = (value: unknown, fieldName: string): ContextEntityRef => {
  const raw = value as Partial<ContextEntityRef> | null | undefined;
  const type = raw?.type;
  const id = raw?.id;

  if (!isContextEntityType(type)) {
    throw createError(`${fieldName}.type no es valido`, 400);
  }

  const normalizedId = String(id ?? '').trim();
  if (!normalizedId) {
    throw createError(`${fieldName}.id es requerido`, 400);
  }

  return { type, id: normalizedId };
};

const canonicalizePair = (first: ContextEntityRef, second: ContextEntityRef) => {
  if (first.type === second.type && first.id === second.id) {
    throw createError('No puedes relacionar un elemento consigo mismo', 400);
  }

  const firstKey = `${ENTITY_TYPES.indexOf(first.type)}:${first.id}`;
  const secondKey = `${ENTITY_TYPES.indexOf(second.type)}:${second.id}`;
  return firstKey <= secondKey
    ? { entityA: first, entityB: second }
    : { entityA: second, entityB: first };
};

const ensureGroupMember = async (authUserId: string, groupId: string) => {
  const usuarioId = await getLocalUserId(authUserId);
  const { data, error } = await supabaseAdmin
    .from('grupo_miembros')
    .select('id, rol, usuario_id, grupo_id')
    .eq('grupo_id', groupId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw createError(error.message, 500);
  if (!data) throw createError('No perteneces a este grupo', 403);

  return { usuarioId, membership: data };
};

const formatMoney = (value: unknown): string | null => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount);
};

const compactSubtitle = (...parts: Array<string | null | undefined>): string | null => {
  const value = parts.filter(Boolean).join(' - ');
  return value.length > 0 ? value : null;
};

const keyFor = (entity: ContextEntityRef): string => `${entity.type}:${entity.id}`;

const missingSummary = (entity: ContextEntityRef): ContextEntitySummary => ({
  ...entity,
  label: `${entity.type} ${entity.id}`,
  subtitle: 'Elemento no disponible',
});

const getItineraryIds = async (groupId: string): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from('itinerarios')
    .select('id_itinerario')
    .eq('grupo_id', groupId);

  if (error) throw createError(error.message, 500);
  return (data ?? []).map((item: any) => String(item.id_itinerario));
};

const getSlotIds = async (groupId: string): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from('subgroup_slots')
    .select('id')
    .eq('group_id', groupId);

  if (error) throw createError(error.message, 500);
  return (data ?? []).map((item: any) => String(item.id));
};

const loadExpenses = async (groupId: string): Promise<ContextEntitySummary[]> => {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('id, description, amount, category, expense_date')
    .eq('group_id', groupId)
    .order('expense_date', { ascending: false });

  if (error) throw createError(error.message, 500);

  return (data ?? []).map((item: any) => ({
    type: 'expense',
    id: String(item.id),
    label: item.description || `Gasto ${item.id}`,
    subtitle: compactSubtitle(formatMoney(item.amount), item.expense_date, item.category),
    metadata: {
      amount: Number(item.amount),
      category: item.category,
      expenseDate: item.expense_date,
    },
  }));
};

const loadDocuments = async (groupId: string): Promise<ContextEntitySummary[]> => {
  const { data, error } = await supabaseAdmin
    .from('trip_documents')
    .select('id, file_name, category, created_at, file_size')
    .eq('trip_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw createError(error.message, 500);

  return (data ?? []).map((item: any) => ({
    type: 'document',
    id: String(item.id),
    label: item.file_name || `Documento ${item.id}`,
    subtitle: compactSubtitle(item.category, item.created_at),
    metadata: {
      category: item.category,
      createdAt: item.created_at,
      fileSize: item.file_size,
    },
  }));
};

const loadActivities = async (groupId: string): Promise<ContextEntitySummary[]> => {
  const itineraryIds = await getItineraryIds(groupId);
  if (itineraryIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('actividades')
    .select('id_actividad, titulo, ubicacion, fecha_inicio, estado, itinerario_id')
    .in('itinerario_id', itineraryIds)
    .order('fecha_inicio', { ascending: true, nullsFirst: false });

  if (error) throw createError(error.message, 500);

  return (data ?? []).map((item: any) => ({
    type: 'activity',
    id: String(item.id_actividad),
    label: item.titulo || `Actividad ${item.id_actividad}`,
    subtitle: compactSubtitle(item.fecha_inicio, item.ubicacion, item.estado),
    metadata: {
      startsAt: item.fecha_inicio,
      location: item.ubicacion,
      status: item.estado,
      itineraryId: item.itinerario_id,
    },
  }));
};

const loadSubgroupActivities = async (groupId: string): Promise<ContextEntitySummary[]> => {
  const slotIds = await getSlotIds(groupId);
  if (slotIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('subgroup_activities')
    .select('id, title, location, starts_at, subgroup_id, slot_id')
    .in('slot_id', slotIds)
    .order('starts_at', { ascending: true, nullsFirst: false });

  if (error) throw createError(error.message, 500);

  return (data ?? []).map((item: any) => ({
    type: 'subgroup_activity',
    id: String(item.id),
    label: item.title || `Actividad de subgrupo ${item.id}`,
    subtitle: compactSubtitle(item.starts_at, item.location),
    metadata: {
      startsAt: item.starts_at,
      location: item.location,
      subgroupId: item.subgroup_id,
      slotId: item.slot_id,
    },
  }));
};

const buildSummaryMap = async (groupId: string): Promise<Map<string, ContextEntitySummary>> => {
  const options = await getContextLinkOptionsForGroup(groupId);
  const summaries = [
    ...options.expenses,
    ...options.documents,
    ...options.activities,
    ...options.subgroupActivities,
  ];

  return new Map(summaries.map((summary) => [keyFor(summary), summary]));
};

const assertEntityBelongsToGroup = async (groupId: string, entity: ContextEntityRef) => {
  switch (entity.type) {
    case 'expense': {
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .select('id')
        .eq('group_id', groupId)
        .eq('id', entity.id)
        .maybeSingle();
      if (error) throw createError(error.message, 500);
      if (!data) throw createError('El elemento seleccionado no existe o no pertenece a este grupo', 404);
      return;
    }
    case 'document': {
      const { data, error } = await supabaseAdmin
        .from('trip_documents')
        .select('id')
        .eq('trip_id', groupId)
        .eq('id', entity.id)
        .maybeSingle();
      if (error) throw createError(error.message, 500);
      if (!data) throw createError('El elemento seleccionado no existe o no pertenece a este grupo', 404);
      return;
    }
    case 'activity': {
      const itineraryIds = await getItineraryIds(groupId);
      if (itineraryIds.length === 0) throw createError('El elemento seleccionado no existe o no pertenece a este grupo', 404);

      const { data, error } = await supabaseAdmin
        .from('actividades')
        .select('id_actividad')
        .eq('id_actividad', entity.id)
        .in('itinerario_id', itineraryIds)
        .maybeSingle();
      if (error) throw createError(error.message, 500);
      if (!data) throw createError('El elemento seleccionado no existe o no pertenece a este grupo', 404);
      return;
    }
    case 'subgroup_activity': {
      const slotIds = await getSlotIds(groupId);
      if (slotIds.length === 0) throw createError('El elemento seleccionado no existe o no pertenece a este grupo', 404);

      const { data, error } = await supabaseAdmin
        .from('subgroup_activities')
        .select('id')
        .eq('id', entity.id)
        .in('slot_id', slotIds)
        .maybeSingle();
      if (error) throw createError(error.message, 500);
      if (!data) throw createError('El elemento seleccionado no existe o no pertenece a este grupo', 404);
      return;
    }
  }
};

const mapLink = (
  row: RawContextLink,
  summaryMap: Map<string, ContextEntitySummary>,
): ContextLink => {
  const entityA = { type: row.entity_a_type, id: String(row.entity_a_id) };
  const entityB = { type: row.entity_b_type, id: String(row.entity_b_id) };

  return {
    id: String(row.id),
    groupId: String(row.group_id),
    entityA: summaryMap.get(keyFor(entityA)) ?? missingSummary(entityA),
    entityB: summaryMap.get(keyFor(entityB)) ?? missingSummary(entityB),
    createdByUserId: String(row.created_by_user_id),
    metadata: row.metadata ?? {},
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
};

export const getContextLinkOptionsForGroup = async (groupId: string): Promise<ContextLinkOptions> => {
  const [expenses, documents, activities, subgroupActivities] = await Promise.all([
    loadExpenses(groupId),
    loadDocuments(groupId),
    loadActivities(groupId),
    loadSubgroupActivities(groupId),
  ]);

  return { expenses, documents, activities, subgroupActivities };
};

export const getContextLinkOptions = async (authUserId: string, groupId: string) => {
  await ensureGroupMember(authUserId, groupId);
  return getContextLinkOptionsForGroup(groupId);
};

export const listContextLinks = async (
  authUserId: string,
  groupId: string,
  filter?: Partial<ContextEntityRef>,
): Promise<ContextLink[]> => {
  await ensureGroupMember(authUserId, groupId);

  const { data, error } = await supabaseAdmin
    .from('trip_context_links')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw createError(error.message, 500);

  const summaryMap = await buildSummaryMap(groupId);
  const rows = ((data ?? []) as RawContextLink[]).filter((row) => {
    if (!filter?.type || !filter?.id) return true;
    return (
      (row.entity_a_type === filter.type && String(row.entity_a_id) === String(filter.id)) ||
      (row.entity_b_type === filter.type && String(row.entity_b_id) === String(filter.id))
    );
  });

  return rows.map((row) => mapLink(row, summaryMap));
};

export const createContextLink = async (
  authUserId: string,
  groupId: string,
  payload: CreateContextLinkPayload,
): Promise<ContextLink> => {
  const { usuarioId } = await ensureGroupMember(authUserId, groupId);
  const source = normalizeEntityRef(payload.source ?? payload.entityA, 'source');
  const target = normalizeEntityRef(payload.target ?? payload.entityB, 'target');
  const { entityA, entityB } = canonicalizePair(source, target);

  await Promise.all([
    assertEntityBelongsToGroup(groupId, entityA),
    assertEntityBelongsToGroup(groupId, entityB),
  ]);

  const { data, error } = await supabaseAdmin
    .from('trip_context_links')
    .upsert({
      group_id: groupId,
      entity_a_type: entityA.type,
      entity_a_id: entityA.id,
      entity_b_type: entityB.type,
      entity_b_id: entityB.id,
      created_by_user_id: usuarioId,
      metadata: payload.metadata ?? {},
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'group_id,entity_a_type,entity_a_id,entity_b_type,entity_b_id',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw createError(error?.message ?? 'No se pudo crear la relacion', 500);
  }

  const summaryMap = await buildSummaryMap(groupId);
  return mapLink(data as RawContextLink, summaryMap);
};

export const deleteContextLink = async (
  authUserId: string,
  groupId: string,
  linkId: string,
) => {
  await ensureGroupMember(authUserId, groupId);

  const { error } = await supabaseAdmin
    .from('trip_context_links')
    .delete()
    .eq('id', linkId)
    .eq('group_id', groupId);

  if (error) throw createError(error.message, 500);
  return { ok: true };
};
