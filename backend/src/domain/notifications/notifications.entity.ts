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

export interface CreateNotificationPayload {
  usuarioId: number;
  grupoId?: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidadTipo?: string;
  entidadId?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdatePreferencesPayload {
  notificaciones_correo?: boolean;
  notificaciones_grupo?: boolean;
  notificaciones_votos?: boolean;
  notificaciones_comentarios?: boolean;
  notificaciones_invitaciones?: boolean;
  notificaciones_finanzas?: boolean;
  notificaciones_vuelos?: boolean;
  notificaciones_hospedajes?: boolean;
}


export interface DashboardUpdatedPayload {
  grupoId: number;
  tipo: string;
  entidadTipo?: string | null;
  entidadId?: number | null;
  actorUsuarioId?: number | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
