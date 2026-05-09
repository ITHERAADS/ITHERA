import { apiClient } from './apiClient'
import type {
  CreateGroupPayload,
  CreateInvitationsResponse,
  Group,
  GroupHistoryItem,
  GroupMember,
  InvitePreview,
  UpdateGroupPayload,
  GroupInvitation,
} from '../types/groups'
import type { Activity } from '../components/ui/DayView/DayView'

const CURRENT_GROUP_STORAGE_KEY = 'ithera_current_group'

export interface ItineraryDay {
  dayNumber: number
  date: string
  activities: Activity[]
}

interface CreatedActivityPayload {
  id_actividad?: number | string
  propuesta_id?: number | string | null
  proposalId?: number | string | null
}

export const groupsService = {
  createGroup: async (payload: CreateGroupPayload, token: string) => {
    return apiClient.post<{ ok: boolean; message: string; group: Group }>(
      '/groups',
      payload,
      token
    )
  },

  getGroupDetails: async (groupId: string, token: string) => {
    return apiClient.get<{ ok: boolean; group: Group }>(
      `/groups/${groupId}`,
      token
    )
  },

  getMyHistory: async (token: string) => {
    return apiClient.get<{
      ok: boolean
      activos: GroupHistoryItem[]
      pasados: GroupHistoryItem[]
    }>('/groups/my-history', token)
  },

  joinGroup: async (codigo: string, token: string) => {
    return apiClient.post<{ ok: boolean; message: string; group: Group }>(
      '/groups/join',
      { codigo },
      token
    )
  },

  getInvitePreview: async (code: string) => {
    return apiClient.get<{ ok: boolean; preview: InvitePreview }>(
      `/groups/invite-preview/${encodeURIComponent(code)}`
    )
  },

  getMembers: async (groupId: string, token: string) => {
    return apiClient.get<{ ok: boolean; members: GroupMember[] }>(
      `/groups/${groupId}/members`,
      token
    )
  },

  getInvite: async (groupId: string, token: string) => {
    return apiClient.get<{
      ok: boolean
      groupId: string
      codigo: string
      inviteLink: string
    }>(`/groups/${groupId}/invite`, token)
  },

  getQr: async (groupId: string, token: string) => {
    return apiClient.get<{
      ok: boolean
      groupId: string
      codigo: string
      qrBase64: string
    }>(`/groups/${groupId}/qr`, token)
  },

  sendInvitations: async (groupId: string, emails: string[], token: string) => {
    return apiClient.post<CreateInvitationsResponse>(
      `/groups/${groupId}/invitations`,
      { emails },
      token
    )
  },

  updateGroup: async (groupId: string, payload: UpdateGroupPayload, token: string) => {
    return apiClient.patch<{ ok: boolean; message: string; group: Group }>(
      `/groups/${groupId}`,
      payload,
      token
    )
  },

  deleteGroup: async (groupId: string, token: string) => {
    return apiClient.delete<{ ok: boolean; message: string }>(
      `/groups/${groupId}`,
      token
    )
  },

  updateMemberRole: async (memberId: string, rol: 'admin' | 'viajero', token: string) => {
    return apiClient.patch<{ ok: boolean }>(
      `/groups/members/${memberId}/role`,
      { rol },
      token
    )
  },

  removeMember: async (groupId: string, memberId: string, token: string) => {
    return apiClient.delete<{ ok: boolean; message: string }>(
      `/groups/${groupId}/members/${memberId}`,
      token
    )
  },

  getInvitations: async (groupId: string, token: string) => {
    return apiClient.get<{ ok: boolean; invitations: GroupInvitation[] }>(
      `/groups/${groupId}/invitations`,
      token
    )
  },

  getItinerary: async (groupId: string, token: string) => {
    return apiClient.get<{
      ok: boolean
      itinerary: unknown | null
      days: ItineraryDay[]
    }>(`/groups/${groupId}/itinerary`, token)
  },

  createActivity: async (
    groupId: string,
    payload: {
      titulo: string
      descripcion?: string | null
      ubicacion?: string | null
      latitud?: number | null
      longitud?: number | null
      fecha_inicio?: string | null
      fecha_fin?: string | null
      referencia_externa?: string | null
      fuente?: string | null
      payload?: Record<string, unknown> | null
    },
    token: string
  ) => {
    return apiClient.post<{ ok: boolean; message: string; activity: CreatedActivityPayload }>(
      `/groups/${groupId}/itinerary/activities`,
      payload,
      token
    )
  },

  updateActivity: async (
    groupId: string,
    activityId: string,
    payload: {
      titulo?: string
      descripcion?: string | null
      ubicacion?: string | null
      latitud?: number | null
      longitud?: number | null
      fecha_inicio?: string | null
      fecha_fin?: string | null
      referencia_externa?: string | null
      fuente?: string | null
      payload?: Record<string, unknown> | null
    },
    token: string
  ) => {
    return apiClient.patch<{ ok: boolean; message: string; activity: unknown }>(
      `/groups/${groupId}/itinerary/activities/${activityId}`,
      payload,
      token
    )
  },

  deleteActivity: async (groupId: string, activityId: string, token: string) => {
    return apiClient.delete<{ ok: boolean; message: string }>(
      `/groups/${groupId}/itinerary/activities/${activityId}`,
      token
    )
  },
}

export function saveCurrentGroup(group: Group) {
  const previous = getCurrentGroup()
  const nextGroup: Group = {
    ...group,
    myRole: group.myRole ?? (previous && String(previous.id) === String(group.id) ? previous.myRole : undefined),
  }
  localStorage.setItem(CURRENT_GROUP_STORAGE_KEY, JSON.stringify(nextGroup))
}

export function getCurrentGroup(): Group | null {
  const raw = localStorage.getItem(CURRENT_GROUP_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as Group
  } catch {
    return null
  }
}

export function clearCurrentGroup() {
  localStorage.removeItem(CURRENT_GROUP_STORAGE_KEY)
}
