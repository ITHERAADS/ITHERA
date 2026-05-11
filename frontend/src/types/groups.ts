export type GroupRole = 'admin' | 'viajero'
export type GroupStatus = 'activo' | 'finalizado' | 'cerrado' | 'archivado'

export interface Group {
  id: string
  nombre: string
  descripcion?: string | null
  destino?: string | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  maximo_miembros?: number | null
  es_publico?: boolean
  codigo_invitacion: string
  creado_por?: string | number | null
  estado: GroupStatus
  created_at?: string
  memberCount?: number
  myRole?: GroupRole
  destino_latitud?: number | null
  destino_longitud?: number | null
  destino_place_id?: string | null
  destino_formatted_address?: string | null
  destino_photo_name?: string | null
  destino_photo_url?: string | null
  presupuesto_total?: number | string | null
}

export interface GroupHistoryItem {
  rol: GroupRole
  grupos_viaje: Group
}

export interface GroupMember {
  id: string
  usuario_id: string
  rol: GroupRole
  nombre: string
  email: string
  avatar_url?: string | null
}

export interface CreateGroupPayload {
  nombre: string
  descripcion?: string
  destino?: string
  fecha_inicio?: string
  fecha_fin?: string
  maximo_miembros?: number
  es_publico?: boolean
  presupuesto_total: number
  destino_latitud?: number | null
  destino_longitud?: number | null
  destino_place_id?: string | null
  destino_formatted_address?: string | null
  destino_photo_name?: string | null
  destino_photo_url?: string | null
}

export interface UpdateGroupPayload {
  nombre?: string
  descripcion?: string
  destino?: string
  fecha_inicio?: string
  fecha_fin?: string
  maximo_miembros?: number
  es_publico?: boolean
  destino_latitud?: number | null
  destino_longitud?: number | null
  destino_place_id?: string | null
  destino_formatted_address?: string | null
  destino_photo_name?: string | null
  destino_photo_url?: string | null
}

export interface CreateInvitationsPayload {
  emails: string[]
}

export interface GroupInvitationResult {
  id?: string
  email: string
  status: 'existing_member' | 'already_invited' | 'created'
  inviteLink?: string
  codigo: string
}

export interface CreateInvitationsResponse {
  ok: boolean
  message: string
  groupId: string
  codigo: string
  invitations: GroupInvitationResult[]
}

export interface InvitePreview {
  groupId: string
  nombre: string
  descripcion?: string | null
  destino?: string | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  estado: GroupStatus
  codigo: string
  memberCount: number
  maximo_miembros?: number | null
  canJoin: boolean
  requiresApproval?: boolean
}

export interface GroupJoinRequest {
  id: string
  grupo_id: string
  usuario_id: string
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'
  mensaje?: string | null
  created_at?: string
  updated_at?: string
  nombre?: string | null
  email?: string | null
  avatar_url?: string | null
}

export interface GroupInvitation {
  id: string
  email: string
  codigo_invitacion: string
  estado: 'pendiente' | 'aceptada' | 'revocada' | 'expirada'
  created_at?: string
}
