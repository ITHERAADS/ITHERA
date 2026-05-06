import { supabase } from '../../infrastructure/db/supabase.client';
import { getIO } from '../../infrastructure/sockets/socket.server';
import {
  CreateNotificationPayload,
  DashboardUpdatedPayload,
  NotificationItem,
  NotificationPreferences,
  UpdatePreferencesPayload,
} from './notifications.entity';

const DEFAULT_PREFERENCES = {
  notificaciones_correo: true,
  notificaciones_grupo: true,
  notificaciones_votos: true,
  notificaciones_comentarios: true,
  notificaciones_invitaciones: true,
  notificaciones_finanzas: true,
  notificaciones_vuelos: true,
  notificaciones_hospedajes: true,
};

const getLocalUserId = async (authUserId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id_usuario')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) {
    throw new Error('Usuario no encontrado');
  }
  return Number(data.id_usuario);
};

export const getUserDisplayName = async (usuarioId: number | string): Promise<string> => {
  const { data } = await supabase
    .from('usuarios')
    .select('nombre, email')
    .eq('id_usuario', usuarioId)
    .maybeSingle();

  const name = String(data?.nombre ?? '').trim();
  if (name) return name;

  const email = String(data?.email ?? '').trim();
  if (email) return email.split('@')[0] || email;

  return 'Alguien';
};

export const getPreferences = async (authUserId: string): Promise<NotificationPreferences> => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data, error } = await supabase
    .from('usuario_preferencias_notificacion')
    .select('*')
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    const { data: newData, error: insertError } = await supabase
      .from('usuario_preferencias_notificacion')
      .insert({
        usuario_id: usuarioId,
        ...DEFAULT_PREFERENCES,
      })
      .select('*')
      .single();

    if (insertError) throw new Error(insertError.message);
    return newData as NotificationPreferences;
  }

  return data as NotificationPreferences;
};

export const updatePreferences = async (
  authUserId: string,
  payload: UpdatePreferencesPayload
): Promise<NotificationPreferences> => {
  const usuarioId = await getLocalUserId(authUserId);

  await getPreferences(authUserId);

  const updateData: UpdatePreferencesPayload & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (payload.notificaciones_correo !== undefined) updateData.notificaciones_correo = payload.notificaciones_correo;
  if (payload.notificaciones_grupo !== undefined) updateData.notificaciones_grupo = payload.notificaciones_grupo;
  if (payload.notificaciones_votos !== undefined) updateData.notificaciones_votos = payload.notificaciones_votos;
  if (payload.notificaciones_comentarios !== undefined) updateData.notificaciones_comentarios = payload.notificaciones_comentarios;
  if (payload.notificaciones_invitaciones !== undefined) updateData.notificaciones_invitaciones = payload.notificaciones_invitaciones;
  if (payload.notificaciones_finanzas !== undefined) updateData.notificaciones_finanzas = payload.notificaciones_finanzas;
  if (payload.notificaciones_vuelos !== undefined) updateData.notificaciones_vuelos = payload.notificaciones_vuelos;
  if (payload.notificaciones_hospedajes !== undefined) updateData.notificaciones_hospedajes = payload.notificaciones_hospedajes;

  const { data, error } = await supabase
    .from('usuario_preferencias_notificacion')
    .update(updateData)
    .eq('usuario_id', usuarioId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as NotificationPreferences;
};

export const getNotifications = async (authUserId: string): Promise<NotificationItem[]> => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data as NotificationItem[];
};

export const getUnreadCount = async (authUserId: string): Promise<number> => {
  const usuarioId = await getLocalUserId(authUserId);

  const { count, error } = await supabase
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .eq('leida', false);

  if (error) throw new Error(error.message);
  return count ?? 0;
};

export const markAsRead = async (authUserId: string, notificationId: number): Promise<void> => {
  const usuarioId = await getLocalUserId(authUserId);

  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', notificationId)
    .eq('usuario_id', usuarioId);

  if (error) throw new Error(error.message);
};

export const markAllAsRead = async (authUserId: string): Promise<void> => {
  const usuarioId = await getLocalUserId(authUserId);

  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('usuario_id', usuarioId)
    .eq('leida', false);

  if (error) throw new Error(error.message);
};

const shouldNotifyByPreferences = (
  tipo: string,
  preferences: typeof DEFAULT_PREFERENCES
): boolean => {
  if (tipo.includes('voto')) return preferences.notificaciones_votos;
  if (tipo.includes('comentario')) return preferences.notificaciones_comentarios;
  if (tipo.includes('invitacion')) return preferences.notificaciones_invitaciones;
  if (tipo.includes('finanzas') || tipo.includes('gasto') || tipo.includes('presupuesto')) return preferences.notificaciones_finanzas ?? true;
  if (tipo.includes('vuelo')) return preferences.notificaciones_vuelos ?? true;
  if (tipo.includes('hospedaje') || tipo.includes('hotel')) return preferences.notificaciones_hospedajes ?? true;
  if (
    tipo.includes('grupo') ||
    tipo.includes('miembro') ||
    tipo.includes('propuesta') ||
    tipo.includes('actividad')
  ) {
    return preferences.notificaciones_grupo;
  }

  return true;
};

export const emitGroupDashboardUpdated = (
  grupoId: number | string,
  payload: Omit<DashboardUpdatedPayload, 'grupoId' | 'createdAt'> & { createdAt?: string }
): void => {
  try {
    const io = getIO();
    const eventPayload: DashboardUpdatedPayload = {
      grupoId: Number(grupoId),
      tipo: payload.tipo,
      entidadTipo: payload.entidadTipo ?? null,
      entidadId: payload.entidadId ?? null,
      actorUsuarioId: payload.actorUsuarioId ?? null,
      createdAt: payload.createdAt ?? new Date().toISOString(),
      metadata: payload.metadata ?? {},
    };

    io.to(String(grupoId)).emit('dashboard_updated', eventPayload);
  } catch (ioError) {
    console.log('[Notifications] No se pudo emitir dashboard_updated', ioError);
  }
};

export const createNotification = async (payload: CreateNotificationPayload): Promise<void> => {
  try {
    const { data: pref } = await supabase
      .from('usuario_preferencias_notificacion')
      .select('*')
      .eq('usuario_id', payload.usuarioId)
      .maybeSingle();

    const preferences = (pref || DEFAULT_PREFERENCES) as typeof DEFAULT_PREFERENCES;

    if (!shouldNotifyByPreferences(payload.tipo, preferences)) return;

    const { data, error } = await supabase
      .from('notificaciones')
      .insert({
        usuario_id: payload.usuarioId,
        grupo_id: payload.grupoId ?? null,
        tipo: payload.tipo,
        titulo: payload.titulo,
        mensaje: payload.mensaje,
        entidad_tipo: payload.entidadTipo ?? null,
        entidad_id: payload.entidadId ?? null,
        metadata: payload.metadata ?? {},
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Notifications] Error insertando notificacion:', error.message);
      return;
    }

    try {
      const io = getIO();
      const roomId = `user:${payload.usuarioId}`;
      io.to(roomId).emit('notification_created', data as NotificationItem);
    } catch (ioError) {
      console.log('[Notifications] No se pudo emitir evento por socket', ioError);
    }
  } catch (err) {
    console.error('[Notifications] Error inesperado en createNotification:', err);
  }
};

const getGroupNotificationRecipientIds = async (grupoId: number): Promise<number[]> => {
  const recipients = new Set<number>();

  const { data: members, error: membersError } = await supabase
    .from('grupo_miembros')
    .select('usuario_id')
    .eq('grupo_id', grupoId);

  if (membersError) {
    console.error('[Notifications] Error consultando miembros del grupo:', membersError.message);
  }

  for (const member of members ?? []) {
    const usuarioId = Number(member.usuario_id);
    if (Number.isFinite(usuarioId)) recipients.add(usuarioId);
  }

  // Respaldo para grupos antiguos o inconsistentes: el organizador puede estar en
  // grupos_viaje.creado_por aunque no exista, por error histórico, en grupo_miembros.
  const { data: group, error: groupError } = await supabase
    .from('grupos_viaje')
    .select('creado_por')
    .eq('id', grupoId)
    .maybeSingle();

  if (groupError) {
    console.error('[Notifications] Error consultando organizador del grupo:', groupError.message);
  }

  const creatorId = Number(group?.creado_por);
  if (Number.isFinite(creatorId)) recipients.add(creatorId);

  return Array.from(recipients);
};

export const createNotificationForGroupMembers = async (
  grupoId: number,
  excludeUsuarioId: number | null,
  payload: Omit<CreateNotificationPayload, 'usuarioId' | 'grupoId'>
): Promise<void> => {
  try {
    const excludedId = excludeUsuarioId === null ? null : Number(excludeUsuarioId);
    const recipientIds = (await getGroupNotificationRecipientIds(grupoId)).filter((usuarioId) => {
      if (!Number.isFinite(usuarioId)) return false;
      return excludedId === null || usuarioId !== excludedId;
    });

    if (recipientIds.length === 0) {
      emitGroupDashboardUpdated(grupoId, {
        tipo: payload.tipo,
        entidadTipo: payload.entidadTipo ?? null,
        entidadId: payload.entidadId ?? null,
        actorUsuarioId: excludedId,
        metadata: payload.metadata ?? {},
      });
      return;
    }

    await Promise.allSettled(
      recipientIds.map((usuarioId) =>
        createNotification({
          ...payload,
          usuarioId,
          grupoId,
        })
      )
    );

    emitGroupDashboardUpdated(grupoId, {
      tipo: payload.tipo,
      entidadTipo: payload.entidadTipo ?? null,
      entidadId: payload.entidadId ?? null,
      actorUsuarioId: excludedId,
      metadata: payload.metadata ?? {},
    });
  } catch (err) {
    console.error('[Notifications] Error inesperado en createNotificationForGroupMembers:', err);
  }
};
