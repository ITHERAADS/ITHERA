export type GroupRole = 'admin' | 'viajero';

export interface Group {
  id: string;
  nombre: string;
  descripcion?: string | null;
  destino?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  maximo_miembros?: number | null;
  codigo_invitacion: string;
  estado: 'activo' | 'finalizado' | 'cerrado' | 'archivado';
  created_at?: string;
}

export interface GroupHistoryItem {
  rol: GroupRole;
  grupos_viaje: Group;
}

export interface GroupMember {
  id: string;
  usuario_id: string;
  rol: GroupRole;
  nombre: string;
  email: string;
}

export interface CreateGroupPayload {
  nombre: string;
  descripcion?: string;
  destino?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  maximo_miembros?: number;
}

export interface UpdateGroupPayload {
  nombre?: string;
  descripcion?: string;
  destino?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  maximo_miembros?: number;
}