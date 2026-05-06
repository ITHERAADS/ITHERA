import { apiClient } from './apiClient'

export interface BudgetMember {
  id: string
  nombre: string
  email?: string | null
}

export interface BudgetSplit {
  id: string
  user_id: string
  user_name: string
  share: number
  settled: boolean
}

export interface BudgetExpenseApi {
  id: string
  group_id: string
  paid_by_user_id: string
  paid_by_name: string
  amount: number
  description: string
  category: 'transporte' | 'hospedaje' | 'actividad' | 'comida' | 'otro'
  split_type: 'equitativa' | 'personalizada'
  expense_date: string
  created_at: string
  updated_at: string
  splits: BudgetSplit[]
}

export interface BudgetDashboardApi {
  groupId: string
  totalBudget: number
  expenses: BudgetExpenseApi[]
  members: BudgetMember[]
  balances: Record<string, number>
}

export interface SaveExpensePayload {
  group_id: string
  paid_by_user_id: string
  amount: number
  description: string
  category: BudgetExpenseApi['category']
  split_type: BudgetExpenseApi['split_type']
  expense_date: string
  member_ids: string[]
  split_amounts?: Record<string, number>
}

export const budgetService = {
  getDashboard: async (groupId: string, token: string) => {
    const response = await apiClient.get<{ ok: boolean; data: BudgetDashboardApi }>(`/budget/groups/${groupId}/dashboard`, token)
    return response.data
  },

  createExpense: async (payload: SaveExpensePayload, token: string) => {
    return apiClient.post<{ ok: boolean; data: unknown }>('/budget/expenses', payload, token)
  },

  updateExpense: async (expenseId: string, payload: SaveExpensePayload, token: string) => {
    return apiClient.put<{ ok: boolean; data: unknown }>(`/budget/expenses/${expenseId}`, payload, token)
  },

  deleteExpense: async (groupId: string, expenseId: string, token: string) => {
    return apiClient.delete<{ ok: boolean }>(`/budget/groups/${groupId}/expenses/${expenseId}`, token)
  },

  updateGroupBudget: async (groupId: string, totalBudget: number, token: string) => {
    return apiClient.patch<{ ok: boolean; data: unknown }>(`/budget/groups/${groupId}/budget`, { totalBudget }, token)
  },
}
