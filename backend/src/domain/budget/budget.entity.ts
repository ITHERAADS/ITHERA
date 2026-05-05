export type BudgetCategory = 'transporte' | 'hospedaje' | 'actividad' | 'comida' | 'otro';
export type BudgetSplitType = 'equitativa' | 'personalizada';
export type MemberRole = 'admin' | 'viajero' | string;

export interface Expense {
  id?: string;
  group_id: string;
  paid_by_user_id: string;
  amount: number;
  description: string;
  category: BudgetCategory;
  split_type?: BudgetSplitType;
  expense_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseSplit {
  id?: string;
  expense_id: string;
  user_id: string;
  share: number;
  settled: boolean;
}

export interface BudgetMember {
  id: string;
  usuario_id: string;
  nombre: string;
  email: string;
  avatar_url?: string | null;
  rol: MemberRole;
}

export interface BudgetSettlement {
  from: string;
  to: string;
  amount: number;
}

export interface BudgetPayment {
  id: string;
  from: string;
  to: string;
  amount: number;
  paid_at: string;
  created_by_user_id: string;
  note?: string | null;
}

export interface BudgetExpensePayload {
  paid_by_user_id: string;
  amount: number;
  description: string;
  category: BudgetCategory;
  split_type?: BudgetSplitType;
  member_ids?: string[];
  split_amounts?: Record<string, number>;
  expense_date?: string | null;
}

export interface MarkSettlementPaymentPayload {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  note?: string | null;
}
