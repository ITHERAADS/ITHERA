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
  codigo_invitacion: string
  estado: GroupStatus
  created_at?: string
  memberCount?: number
  myRole?: GroupRole
  destino_latitud?: number | null
  destino_longitud?: number | null
  destino_place_id?: string | null
  destino_formatted_address?: string | null
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
}

export interface CreateGroupPayload {
  nombre: string
  descripcion?: string
  destino?: string
  fecha_inicio?: string
  fecha_fin?: string
  maximo_miembros?: number
  destino_latitud?: number | null
  destino_longitud?: number | null
  destino_place_id?: string | null
  destino_formatted_address?: string | null
}

export interface UpdateGroupPayload {
  nombre?: string
  descripcion?: string
  destino?: string
  fecha_inicio?: string
  fecha_fin?: string
  maximo_miembros?: number
  destino_latitud?: number | null
  destino_longitud?: number | null
  destino_place_id?: string | null
  destino_formatted_address?: string | null
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
}

export interface GroupInvitation {
  id: string
  email: string
  codigo_invitacion: string
  estado: 'pendiente' | 'aceptada' | 'revocada' | 'expirada'
  created_at?: string
}