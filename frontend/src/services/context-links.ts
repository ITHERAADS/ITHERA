import { apiClient } from './apiClient'

export type ContextEntityType = 'expense' | 'document' | 'activity' | 'subgroup_activity'

export interface ContextEntityRef {
  type: ContextEntityType
  id: string
}

export interface ContextEntitySummary extends ContextEntityRef {
  label: string
  subtitle?: string | null
  metadata?: Record<string, unknown>
}

export interface ContextLink {
  id: string
  groupId: string
  entityA: ContextEntitySummary
  entityB: ContextEntitySummary
  createdByUserId: string
  metadata: Record<string, unknown>
  createdAt: string | null
  updatedAt: string | null
}

export interface ContextLinkOptions {
  expenses: ContextEntitySummary[]
  documents: ContextEntitySummary[]
  activities: ContextEntitySummary[]
  subgroupActivities: ContextEntitySummary[]
}

export interface CreateContextLinkPayload {
  source: ContextEntityRef
  target: ContextEntityRef
  metadata?: Record<string, unknown>
}

export interface ContextLinksResponse {
  ok: boolean
  links: ContextLink[]
}

export interface ContextLinkResponse {
  ok: boolean
  link: ContextLink
}

export interface ContextLinkOptionsResponse {
  ok: boolean
  options: ContextLinkOptions
}

const queryForEntity = (entity?: ContextEntityRef): string => {
  if (!entity) return ''
  const params = new URLSearchParams({
    entity_type: entity.type,
    entity_id: entity.id,
  })
  return `?${params.toString()}`
}

export const contextLinksService = {
  list: async (groupId: string, token: string, entity?: ContextEntityRef) =>
    apiClient.get<ContextLinksResponse>(
      `/groups/${groupId}/context-links${queryForEntity(entity)}`,
      token,
    ),

  options: async (groupId: string, token: string) =>
    apiClient.get<ContextLinkOptionsResponse>(
      `/groups/${groupId}/context-links/options`,
      token,
    ),

  create: async (groupId: string, payload: CreateContextLinkPayload, token: string) =>
    apiClient.post<ContextLinkResponse>(
      `/groups/${groupId}/context-links`,
      payload,
      token,
    ),

  remove: async (groupId: string, linkId: string, token: string) =>
    apiClient.delete<{ ok: boolean }>(
      `/groups/${groupId}/context-links/${linkId}`,
      token,
    ),
}
