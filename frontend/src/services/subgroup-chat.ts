import { apiClient } from './apiClient'

export interface SubgroupChatMessage {
  id: string
  subgroupId: string
  userId: string
  authorName: string
  authorEmail: string | null
  authorAvatarUrl: string | null
  contenido: string
  createdAt: string
  clientId?: string | null
}

export const subgroupChatService = {
  getMessages: async (
    groupId: string,
    slotId: string | number,
    subgroupId: string | number,
    token: string,
    limit = 50
  ) => {
    return apiClient.get<{ ok: boolean; messages: SubgroupChatMessage[] }>(
      `/groups/${groupId}/itinerary/subgroups/slots/${slotId}/groups/${subgroupId}/chat/messages?limit=${limit}`,
      token
    )
  },

  sendMessage: async (
    groupId: string,
    slotId: string | number,
    subgroupId: string | number,
    contenido: string,
    token: string
  ) => {
    return apiClient.post<{ ok: boolean; message: SubgroupChatMessage }>(
      `/groups/${groupId}/itinerary/subgroups/slots/${slotId}/groups/${subgroupId}/chat/messages`,
      { contenido },
      token
    )
  },
}
