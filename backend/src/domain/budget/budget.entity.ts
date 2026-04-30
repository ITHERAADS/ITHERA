export interface Expense {
  id?: string;
  group_id: string;
  paid_by_user_id: string;
  amount: number;
  description: string;
  category: string;
  created_at?: string;
}

export interface ExpenseSplit {
  id?: string;
  expense_id: string;
  user_id: string;
  share: number;
  settled: boolean;
}