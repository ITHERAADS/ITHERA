import { apiClient } from './apiClient'

export type BudgetCategory = 'transporte' | 'hospedaje' | 'actividad' | 'comida' | 'otro'
export type BudgetSplitType = 'equitativa' | 'personalizada'

export interface BudgetMember {
  id: string
  usuario_id: string
  nombre: string
  email: string
  avatar_url?: string | null
  rol: string
}

export interface BudgetExpense {
  id: string
  groupId: string
  paidByUserId: string
  paidByName: string
  amount: number
  description: string
  category: BudgetCategory
  splitType: BudgetSplitType
  splitAmounts: Record<string, number>
  expenseDate: string | null
  createdAt: string | null
}

export interface BudgetSummary {
  totalBudget: number
  committed: number
  available: number
  percentCommitted: number
  categoryTotals: Record<BudgetCategory, number>
}

export interface BudgetSettlement {
  from: string
  to: string
  amount: number
}

export interface BudgetPaymentHistoryItem {
  id: string
  from: string
  to: string
  amount: number
  paid_at: string
  created_by_user_id: string
  note?: string | null
}

export interface BudgetDashboardResponse {
  ok: boolean
  groupId: string
  myRole: string
  summary: BudgetSummary
  members: BudgetMember[]
  expenses: BudgetExpense[]
  balances: Record<string, number>
  settlements: BudgetSettlement[]
  paymentHistory: BudgetPaymentHistoryItem[]
}

export interface SaveBudgetExpensePayload {
  paid_by_user_id: string
  amount: number
  description: string
  category: BudgetCategory
  split_type: BudgetSplitType
  member_ids?: string[]
  split_amounts?: Record<string, number>
  expense_date?: string | null
}

export interface MarkSettlementPaymentPayload {
  from_user_id: string
  to_user_id: string
  amount: number
  note?: string | null
}

export const budgetService = {
  getDashboard: async (groupId: string, token: string) => {
    try {
      return await apiClient.get<BudgetDashboardResponse>(`/groups/${groupId}/budget`, token)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const shouldFallback =
        message.includes('Cannot GET /api/groups/') ||
        message.includes('HTTP 404')

      if (!shouldFallback) throw error
      return apiClient.get<BudgetDashboardResponse>(`/budget/${groupId}`, token)
    }
  },

  updateBudget: async (groupId: string, totalBudget: number, token: string) => {
    try {
      return await apiClient.patch<BudgetDashboardResponse>(
        `/groups/${groupId}/budget`,
        { totalBudget },
        token
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const shouldFallback =
        message.includes('Cannot PATCH /api/groups/') ||
        message.includes('HTTP 404')

      if (!shouldFallback) throw error
      return apiClient.patch<BudgetDashboardResponse>(
        `/budget/${groupId}`,
        { totalBudget },
        token
      )
    }
  },

  createExpense: async (groupId: string, payload: SaveBudgetExpensePayload, token: string) => {
    try {
      return await apiClient.post<BudgetDashboardResponse>(
        `/groups/${groupId}/expenses`,
        payload,
        token
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const shouldFallback =
        message.includes('Cannot POST /api/groups/') ||
        message.includes('HTTP 404')

      if (!shouldFallback) throw error
      return apiClient.post<BudgetDashboardResponse>(
        `/budget/${groupId}/expenses`,
        payload,
        token
      )
    }
  },

  updateExpense: async (groupId: string, expenseId: string, payload: SaveBudgetExpensePayload, token: string) => {
    try {
      return await apiClient.put<BudgetDashboardResponse>(
        `/groups/${groupId}/expenses/${expenseId}`,
        payload,
        token
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const shouldFallback =
        message.includes('Cannot PUT /api/groups/') ||
        message.includes('HTTP 404')

      if (!shouldFallback) throw error
      return apiClient.put<BudgetDashboardResponse>(
        `/budget/${groupId}/expenses/${expenseId}`,
        payload,
        token
      )
    }
  },

  deleteExpense: async (groupId: string, expenseId: string, token: string) => {
    try {
      return await apiClient.delete<BudgetDashboardResponse>(
        `/groups/${groupId}/expenses/${expenseId}`,
        token
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const shouldFallback =
        message.includes('Cannot DELETE /api/groups/') ||
        message.includes('HTTP 404')

      if (!shouldFallback) throw error
      return apiClient.delete<BudgetDashboardResponse>(
        `/budget/${groupId}/expenses/${expenseId}`,
        token
      )
    }
  },

  markSettlementPaid: async (groupId: string, payload: MarkSettlementPaymentPayload, token: string) => {
    try {
      return await apiClient.post<BudgetDashboardResponse>(
        `/groups/${groupId}/settlements/payments`,
        payload,
        token
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const shouldFallback =
        message.includes('Cannot POST /api/groups/') ||
        message.includes('HTTP 404')

      if (!shouldFallback) throw error
      return apiClient.post<BudgetDashboardResponse>(
        `/budget/${groupId}/settlements/payments`,
        payload,
        token
      )
    }
  },
}
