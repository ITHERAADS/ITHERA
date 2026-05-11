export type ContextEntityType = 'expense' | 'document' | 'activity' | 'subgroup_activity';

export interface ContextEntityRef {
  type: ContextEntityType;
  id: string;
}

export interface ContextEntitySummary extends ContextEntityRef {
  label: string;
  subtitle?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ContextLink {
  id: string;
  groupId: string;
  entityA: ContextEntitySummary;
  entityB: ContextEntitySummary;
  createdByUserId: string;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateContextLinkPayload {
  source?: ContextEntityRef;
  target?: ContextEntityRef;
  entityA?: ContextEntityRef;
  entityB?: ContextEntityRef;
  metadata?: Record<string, unknown>;
}

export interface ContextLinkOptions {
  expenses: ContextEntitySummary[];
  documents: ContextEntitySummary[];
  activities: ContextEntitySummary[];
  subgroupActivities: ContextEntitySummary[];
}
