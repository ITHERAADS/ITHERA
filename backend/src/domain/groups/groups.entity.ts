export type GroupStatus = 'activo' | 'finalizado' | 'cerrado' | 'archivado';
export type MemberRole = 'admin' | 'viajero';
export type InvitationStatus = 'pendiente' | 'aceptada' | 'revocada' | 'expirada';
export type JoinRequestStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';

export interface GrupoViaje {
  id: string;
  nombre: string;
  descripcion?: string | null;
  destino?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  maximo_miembros?: number | null;
  es_publico?: boolean;
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
  punto_partida_tipo?: 'destino_viaje' | 'hotel_reservado' | null;
  punto_partida_nombre?: string | null;
  punto_partida_direccion?: string | null;
  punto_partida_latitud?: number | null;
  punto_partida_longitud?: number | null;
  punto_partida_place_id?: string | null;
  punto_partida_hospedaje_id?: number | null;
  punto_partida_propuesta_id?: number | null;
  punto_partida_actualizado_at?: string | null;
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
  es_publico?: boolean;
  presupuesto_total: number;
  destino_latitud?: number | null;
  destino_longitud?: number | null;
  destino_place_id?: string | null;
  destino_formatted_address?: string | null;
  destino_photo_name?: string | null;
  destino_photo_url?: string | null;
  punto_partida_tipo?: 'destino_viaje' | 'hotel_reservado' | null;
  punto_partida_nombre?: string | null;
  punto_partida_direccion?: string | null;
  punto_partida_latitud?: number | null;
  punto_partida_longitud?: number | null;
  punto_partida_place_id?: string | null;
  punto_partida_hospedaje_id?: number | null;
  punto_partida_propuesta_id?: number | null;
  punto_partida_actualizado_at?: string | null;
}

export interface UpdateGroupPayload {
  nombre?: string;
  descripcion?: string;
  destino?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  maximo_miembros?: number;
  es_publico?: boolean;
  destino_latitud?: number | null;
  destino_longitud?: number | null;
  destino_place_id?: string | null;
  destino_formatted_address?: string | null;
  destino_photo_name?: string | null;
  destino_photo_url?: string | null;
  punto_partida_tipo?: 'destino_viaje' | 'hotel_reservado' | null;
  punto_partida_nombre?: string | null;
  punto_partida_direccion?: string | null;
  punto_partida_latitud?: number | null;
  punto_partida_longitud?: number | null;
  punto_partida_place_id?: string | null;
  punto_partida_hospedaje_id?: number | null;
  punto_partida_propuesta_id?: number | null;
  punto_partida_actualizado_at?: string | null;
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
  es_publico: boolean;
  canJoin: boolean;
  cannotJoinReason?: 'GROUP_CAPACITY_REACHED' | string | null;
  requiresApproval?: boolean;
}

export interface GroupJoinRequest {
  id: string;
  grupo_id: string;
  usuario_id: string;
  estado: JoinRequestStatus;
  mensaje?: string | null;
  created_at?: string;
  updated_at?: string;
  nombre?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export type TravelStartLocationSource = 'hotel_reservado' | 'destino_viaje';

export interface TravelStartLocation {
  source: TravelStartLocationSource;
  label: string | null;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  photoUrl: string | null;
  hotelId?: string | null;
  folioReserva?: string | null;
}

export interface GroupTravelContext {
  groupId: string;
  startLocation: TravelStartLocation;
  destinationLocation: TravelStartLocation;
}
