import { apiClient } from './apiClient'

export interface ChatMessage {
  id: string
  groupId: string
  userId: string
  authorName: string
  authorEmail: string | null
  authorAvatarUrl: string | null
  contenido: string
  createdAt: string
  clientId?: string | null
}

export const chatService = {
  getMessages: async (groupId: string, token: string, limit = 50) => {
    return apiClient.get<{ ok: boolean; messages: ChatMessage[] }>(
      `/groups/${groupId}/chat/messages?limit=${limit}`,
      token
    )
  },

  sendMessage: async (groupId: string, contenido: string, token: string) => {
    return apiClient.post<{ ok: boolean; message: ChatMessage }>(
      `/groups/${groupId}/chat/messages`,
      { contenido },
      token
    )
  },
}
