import { supabase } from '../../infrastructure/db/supabase.client';
import { getLocalUserId } from '../groups/groups.service';
import { CreateSearchHistoryPayload } from './search-history.entity';

const dbText = (value: string | null | undefined, max = 200): string | null => {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
};

const assertGroupMembership = async (grupoId: string, authUserId: string) => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data: membership, error } = await supabase
    .from('grupo_miembros')
    .select('id, grupo_id, usuario_id')
    .eq('grupo_id', grupoId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!membership) {
    throw Object.assign(new Error('No tienes acceso a este grupo'), {
      statusCode: 403,
    });
  }

  return { usuarioId };
};

export const createSearchHistoryEntry = async (
  authUserId: string,
  payload: CreateSearchHistoryPayload,
) => {
  const { usuarioId } = await assertGroupMembership(payload.grupoId, authUserId);

  const { data, error } = await supabase
    .from('historial_busquedas')
    .insert({
      grupo_id: payload.grupoId,
      usuario_id: Number(usuarioId),
      tipo_item: payload.tipo,
      fuente: dbText(payload.fuente, 80) ?? payload.fuente,
      titulo: dbText(payload.titulo, 190) ?? payload.titulo,
      descripcion: payload.descripcion ?? null,
      search_payload: payload.searchPayload ?? null,
      result_payload: payload.resultPayload ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo registrar el historial de búsqueda');
  }

  return data;
};

export const listSearchHistoryByGroup = async (
  authUserId: string,
  grupoId: string,
) => {
  await assertGroupMembership(grupoId, authUserId);

  const { data, error } = await supabase
    .from('historial_busquedas')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};
