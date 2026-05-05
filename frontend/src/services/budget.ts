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
  getDashboard: (groupId: string, token: string) =>
    apiClient.get<BudgetDashboardResponse>(`/groups/${groupId}/budget`, token),

  updateBudget: (groupId: string, totalBudget: number, token: string) =>
    apiClient.patch<BudgetDashboardResponse>(
      `/groups/${groupId}/budget`,
      { totalBudget },
      token
    ),

  createExpense: (groupId: string, payload: SaveBudgetExpensePayload, token: string) =>
    apiClient.post<BudgetDashboardResponse>(
      `/groups/${groupId}/expenses`,
      payload,
      token
    ),

  updateExpense: (groupId: string, expenseId: string, payload: SaveBudgetExpensePayload, token: string) =>
    apiClient.put<BudgetDashboardResponse>(
      `/groups/${groupId}/expenses/${expenseId}`,
      payload,
      token
    ),

  deleteExpense: (groupId: string, expenseId: string, token: string) =>
    apiClient.delete<BudgetDashboardResponse>(
      `/groups/${groupId}/expenses/${expenseId}`,
      token
    ),

  markSettlementPaid: (groupId: string, payload: MarkSettlementPaymentPayload, token: string) =>
    apiClient.post<BudgetDashboardResponse>(
      `/groups/${groupId}/settlements/payments`,
      payload,
      token
    ),
}
