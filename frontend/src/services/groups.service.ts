import { apiClient } from './apiClient'

export type GroupMember = {
  id: string
  rol: string
  usuarios: {
    id_usuario: string
    nombre: string
    email: string
  }
}

export type CreateGroupResponse = {
  id?: string
  nombre?: string
  codigo_invitacion?: string
  descripcion?: string | null
  destino?: string | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  maximo_miembros?: number | null
}

export const createGroup = (
  data: { nombre: string; descripcion: string },
  token?: string
) => {
  return apiClient.post<CreateGroupResponse>('/groups', data, token)
}

export const getGroupMembers = (groupId: string, token?: string) => {
  return apiClient.get<GroupMember[]>(`/groups/${groupId}/members`, token)
}

export const updateMemberRole = (memberId: string, rol: string, token?: string) => {
  return apiClient.post(`/groups/members/${memberId}/role`, { rol }, token)
}

export const getMyGroups = (token?: string) => {
  return apiClient.get('/groups/my-history', token)
}