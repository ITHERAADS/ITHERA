import { supabase } from '../../infrastructure/db/supabase.client';

export interface SubgroupChatMessageDTO {
  id: string;
  subgroupId: string;
  userId: string;
  authorName: string;
  authorEmail: string | null;
  authorAvatarUrl: string | null;
  contenido: string;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const getLocalUserRecord = async (
  authUserId: string
): Promise<{ id_usuario: number; email: string | null; nombre: string | null; avatar_url: string | null }> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id_usuario, email, nombre, avatar_url')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) {
    throw Object.assign(new Error('Usuario no encontrado en tabla local'), { statusCode: 404 });
  }

  return {
    id_usuario: Number(data.id_usuario),
    email: data.email ?? null,
    nombre: data.nombre ?? null,
    avatar_url: data.avatar_url ?? null,
  };
};

/**
 * Valida que el usuario pertenezca al subgrupo indicado
 * mediante la tabla subgroup_memberships.
 */
export const ensureSubgroupMember = async (
  localUserId: string,
  subgroupId: string
): Promise<void> => {
  const { data, error } = await supabase
    .from('subgroup_memberships')
    .select('id')
    .eq('subgroup_id', subgroupId)
    .eq('user_id', localUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    throw Object.assign(new Error('No perteneces a este subgrupo'), { statusCode: 403 });
  }
};

// ── Map & Hydrate ────────────────────────────────────────────────────────

const mapMessage = (
  row: any,
  author?: { id_usuario: number; nombre: string | null; email: string | null; avatar_url: string | null }
): SubgroupChatMessageDTO => ({
  id: String(row.id),
  subgroupId: String(row.subgroup_id),
  userId: String(row.usuario_id),
  authorName: author?.nombre || author?.email || 'Usuario',
  authorEmail: author?.email ?? null,
  authorAvatarUrl: author?.avatar_url ?? null,
  contenido: row.contenido,
  createdAt: row.created_at,
});

const hydrateMessages = async (rows: any[]): Promise<SubgroupChatMessageDTO[]> => {
  const userIds = Array.from(new Set(rows.map((row) => Number(row.usuario_id)).filter(Boolean)));

  if (userIds.length === 0) return [];

  const { data: users, error } = await supabase
    .from('usuarios')
    .select('id_usuario, nombre, email, avatar_url')
    .in('id_usuario', userIds);

  if (error) throw new Error(error.message);

  const usersById = new Map((users ?? []).map((user: any) => [Number(user.id_usuario), user]));
  return rows.map((row) => mapMessage(row, usersById.get(Number(row.usuario_id))));
};

// ── Public API ───────────────────────────────────────────────────────────

export const listSubgroupMessages = async (
  authUserId: string,
  subgroupId: string,
  limit = 50
): Promise<SubgroupChatMessageDTO[]> => {
  const localUser = await getLocalUserRecord(authUserId);
  await ensureSubgroupMember(String(localUser.id_usuario), subgroupId);

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const { data, error } = await supabase
    .from('subgroup_chat_mensajes')
    .select('id, subgroup_id, usuario_id, contenido, created_at')
    .eq('subgroup_id', subgroupId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(error.message);

  const rows = [...(data ?? [])].reverse();
  return hydrateMessages(rows);
};

export const createSubgroupMessageByAuthUser = async (
  authUserId: string,
  subgroupId: string,
  contenido: string
): Promise<SubgroupChatMessageDTO> => {
  const localUser = await getLocalUserRecord(authUserId);
  return createSubgroupMessageByLocalUser(String(localUser.id_usuario), subgroupId, contenido, {
    nombre: localUser.nombre,
    email: localUser.email,
    avatar_url: localUser.avatar_url,
  });
};

export const createSubgroupMessageByLocalUser = async (
  usuarioId: string,
  subgroupId: string,
  contenido: string,
  cachedAuthor?: { nombre: string | null; email: string | null; avatar_url: string | null }
): Promise<SubgroupChatMessageDTO> => {
  const cleanContent = contenido.trim();

  if (!cleanContent) {
    throw Object.assign(new Error('El mensaje no puede estar vacío'), { statusCode: 400 });
  }

  if (cleanContent.length > 1000) {
    throw Object.assign(new Error('El mensaje no puede superar 1000 caracteres'), { statusCode: 400 });
  }

  await ensureSubgroupMember(usuarioId, subgroupId);

  const { data, error } = await supabase
    .from('subgroup_chat_mensajes')
    .insert({
      subgroup_id: Number(subgroupId),
      usuario_id: Number(usuarioId),
      contenido: cleanContent,
    })
    .select('id, subgroup_id, usuario_id, contenido, created_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo guardar el mensaje');
  }

  if (cachedAuthor) {
    return mapMessage(data, {
      id_usuario: Number(usuarioId),
      nombre: cachedAuthor.nombre,
      email: cachedAuthor.email,
      avatar_url: cachedAuthor.avatar_url,
    });
  }

  const [message] = await hydrateMessages([data]);
  return message;
};
