export type GroupStatus = 'activo' | 'finalizado' | 'cerrado' | 'archivado';
export type MemberRole = 'admin' | 'viajero';
export type InvitationStatus = 'pendiente' | 'aceptada' | 'revocada' | 'expirada';

export interface GrupoViaje {
  id: string;
  nombre: string;
  descripcion?: string | null;
  destino?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  maximo_miembros?: number | null;
  codigo_invitacion: string;
  creado_por: string;
  estado: GroupStatus;
  created_at?: string;
  destino_latitud?: number | null;
  destino_longitud?: number | null;
  destino_place_id?: string | null;
  destino_formatted_address?: string | null;
  destino_photo_name?: string | null;
  destino_photo_url?: string | null;
}

export interface GrupoMiembro {
  id: string;
  grupo_id: string;
  usuario_id: string;
  rol: MemberRole | string;
}

export interface CreateGroupPayload {
  nombre: string;
  descripcion?: string;
  destino?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  maximo_miembros?: number;
  destino_latitud?: number | null;
  destino_longitud?: number | null;
  destino_place_id?: string | null;
  destino_formatted_address?: string | null;
  destino_photo_name?: string | null;
  destino_photo_url?: string | null;
}

export interface UpdateGroupPayload {
  nombre?: string;
  descripcion?: string;
  destino?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  maximo_miembros?: number;
  destino_latitud?: number | null;
  destino_longitud?: number | null;
  destino_place_id?: string | null;
  destino_formatted_address?: string | null;
  destino_photo_name?: string | null;
  destino_photo_url?: string | null;
}

export interface JoinGroupPayload {
  codigo: string;
}

export interface CreateGroupInvitationsPayload {
  emails: string[];
}

export interface GroupInvitation {
  id: string;
  grupo_id: string;
  email: string;
  codigo_invitacion: string;
  token: string;
  estado: InvitationStatus;
  created_at?: string;
  updated_at?: string;
}

export interface GroupInvitePreview {
  groupId: string;
  nombre: string;
  descripcion?: string | null;
  destino?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado: GroupStatus;
  codigo: string;
  memberCount: number;
  maximo_miembros?: number | null;
  canJoin: boolean;
}