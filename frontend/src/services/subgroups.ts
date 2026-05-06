import { apiClient } from './apiClient'

export interface SubgroupActivity {
  id: number
  slot_id: number
  subgroup_id: number
  title: string
  description?: string | null
  location?: string | null
  starts_at?: string | null
  ends_at?: string | null
  created_by: number
}

export interface SubgroupMembership {
  id: number
  slot_id: number
  subgroup_id?: number | null
  user_id: number
  usuarios?: {
    id_usuario: number
    nombre?: string | null
    avatar_url?: string | null
  } | null
}

export interface Subgroup {
  id: number
  slot_id: number
  name: string
  description?: string | null
  created_by: number
  activities: SubgroupActivity[]
  members: SubgroupMembership[]
}

export interface SubgroupSlot {
  id: number
  group_id: number
  title: string
  description?: string | null
  starts_at: string
  ends_at: string
  created_by: number
  subgroups: Subgroup[]
  memberships: SubgroupMembership[]
}

export const subgroupScheduleService = {
  getSchedule: async (groupId: string, token: string) =>
    apiClient.get<{ ok: boolean; slots: SubgroupSlot[]; myUserId: number }>(
      `/groups/${groupId}/itinerary/subgroups/schedule`,
      token,
    ),

  createSlot: async (
    groupId: string,
    payload: { title: string; description?: string | null; starts_at: string; ends_at: string },
    token: string,
  ) => apiClient.post<{ ok: boolean; slot: SubgroupSlot }>(
    `/groups/${groupId}/itinerary/subgroups/slots`,
    payload,
    token,
  ),

  createSubgroup: async (
    groupId: string,
    slotId: number,
    payload: { name: string; description?: string | null },
    token: string,
  ) => apiClient.post<{ ok: boolean; subgroup: Subgroup }>(
    `/groups/${groupId}/itinerary/subgroups/slots/${slotId}/groups`,
    payload,
    token,
  ),

  updateSlot: async (
    groupId: string,
    slotId: number,
    payload: Partial<{ title: string; description: string | null; starts_at: string; ends_at: string }>,
    token: string,
  ) => apiClient.patch<{ ok: boolean; slot: SubgroupSlot }>(
    `/groups/${groupId}/itinerary/subgroups/slots/${slotId}`,
    payload,
    token,
  ),

  deleteSlot: async (groupId: string, slotId: number, token: string) =>
    apiClient.delete<{ ok: boolean }>(
      `/groups/${groupId}/itinerary/subgroups/slots/${slotId}`,
      token,
    ),

  updateSubgroup: async (
    groupId: string,
    slotId: number,
    subgroupId: number,
    payload: Partial<{ name: string; description: string | null }>,
    token: string,
  ) => apiClient.patch<{ ok: boolean; subgroup: Subgroup }>(
    `/groups/${groupId}/itinerary/subgroups/slots/${slotId}/groups/${subgroupId}`,
    payload,
    token,
  ),

  deleteSubgroup: async (groupId: string, slotId: number, subgroupId: number, token: string) =>
    apiClient.delete<{ ok: boolean }>(
      `/groups/${groupId}/itinerary/subgroups/slots/${slotId}/groups/${subgroupId}`,
      token,
    ),

  joinSubgroup: async (groupId: string, slotId: number, subgroupId: number | null, token: string) =>
    apiClient.post<{ ok: boolean }>(
      `/groups/${groupId}/itinerary/subgroups/slots/${slotId}/join`,
      { subgroupId },
      token,
    ),

  createSubgroupActivity: async (
    groupId: string,
    slotId: number,
    subgroupId: number,
    payload: { title: string; description?: string | null; location?: string | null; starts_at?: string | null; ends_at?: string | null },
    token: string,
  ) => apiClient.post<{ ok: boolean; activity: SubgroupActivity }>(
    `/groups/${groupId}/itinerary/subgroups/slots/${slotId}/groups/${subgroupId}/activities`,
    payload,
    token,
  ),

  updateSubgroupActivity: async (
    groupId: string,
    slotId: number,
    activityId: number,
    payload: Partial<{ title: string; description: string | null; location: string | null; starts_at: string | null; ends_at: string | null }>,
    token: string,
  ) => apiClient.patch<{ ok: boolean; activity: SubgroupActivity }>(
    `/groups/${groupId}/itinerary/subgroups/slots/${slotId}/activities/${activityId}`,
    payload,
    token,
  ),

  deleteSubgroupActivity: async (groupId: string, slotId: number, activityId: number, token: string) =>
    apiClient.delete<{ ok: boolean }>(
      `/groups/${groupId}/itinerary/subgroups/slots/${slotId}/activities/${activityId}`,
      token,
    ),
}
