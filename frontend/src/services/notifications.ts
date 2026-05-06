import { apiClient } from './apiClient';

export interface NotificationItem {
  id: number;
  usuario_id: number;
  grupo_id: number | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad_tipo: string | null;
  entidad_id: number | null;
  leida: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}


type RawNotificationItem = Partial<NotificationItem> & {
  usuarioId?: number;
  grupoId?: number | null;
  entidadTipo?: string | null;
  entidadId?: number | null;
  createdAt?: string;
};

export function normalizeNotification(raw: RawNotificationItem): NotificationItem {
  return {
    id: Number(raw.id),
    usuario_id: Number(raw.usuario_id ?? raw.usuarioId ?? 0),
    grupo_id: raw.grupo_id ?? raw.grupoId ?? null,
    tipo: String(raw.tipo ?? ''),
    titulo: String(raw.titulo ?? 'Notificación'),
    mensaje: String(raw.mensaje ?? ''),
    entidad_tipo: raw.entidad_tipo ?? raw.entidadTipo ?? null,
    entidad_id: raw.entidad_id ?? raw.entidadId ?? null,
    leida: Boolean(raw.leida),
    metadata: raw.metadata ?? {},
    created_at: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
  };
}

export interface NotificationPreferences {
  usuario_id: number;
  notificaciones_correo: boolean;
  notificaciones_grupo: boolean;
  notificaciones_votos: boolean;
  notificaciones_comentarios: boolean;
  notificaciones_invitaciones: boolean;
  notificaciones_finanzas: boolean;
  notificaciones_vuelos: boolean;
  notificaciones_hospedajes: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationsService = {
  getNotifications: async (token: string): Promise<{ ok: boolean; notifications: NotificationItem[] }> => {
    const response = await apiClient.get<{ ok: boolean; notifications: RawNotificationItem[] }>('/notifications', token);
    return {
      ok: response.ok,
      notifications: (response.notifications ?? []).map(normalizeNotification),
    };
  },

  getUnreadCount: async (token: string): Promise<{ ok: boolean; count: number }> => {
    return apiClient.get('/notifications/unread-count', token);
  },

  markAsRead: async (notificationId: number, token: string): Promise<{ ok: boolean }> => {
    return apiClient.patch(`/notifications/${notificationId}/read`, undefined, token);
  },

  markAllAsRead: async (token: string): Promise<{ ok: boolean }> => {
    return apiClient.patch('/notifications/read-all', undefined, token);
  },

  getPreferences: async (token: string): Promise<{ ok: boolean; preferences: NotificationPreferences }> => {
    return apiClient.get('/notifications/preferences', token);
  },

  updatePreferences: async (
    payload: Partial<Omit<NotificationPreferences, 'usuario_id' | 'created_at' | 'updated_at'>>,
    token: string
  ): Promise<{ ok: boolean; preferences: NotificationPreferences }> => {
    return apiClient.patch('/notifications/preferences', payload, token);
  },
};
