import { supabaseAdmin } from '../../infrastructure/db/supabase.client';
import { Expense } from './budget.entity';
export const createExpense = async (data: {
  group_id: string;
  paid_by_user_id: string;
  amount: number;
  description: string;
  category: string;
  member_ids: string[];
}) => {
  const { data: expense, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      group_id: data.group_id,
      paid_by_user_id: data.paid_by_user_id,
      amount: data.amount,
      description: data.description,
      category: data.category,
    })
    .select()
    .single();

  if (error) throw error;

  const share = data.amount / data.member_ids.length;
  const splits = data.member_ids.map((user_id) => ({
    expense_id: expense.id,
    user_id,
    share,
    settled: false,
  }));

  const { error: splitError } = await supabaseAdmin
    .from('expense_splits')
    .insert(splits);

  if (splitError) throw splitError;

  return expense;
};

export const getBalances = async (group_id: string): Promise<Record<string, number>> => {
  const { data: expenses, error } = await supabaseAdmin
    .from('expenses')
    .select('*, expense_splits(*)')
    .eq('group_id', group_id);

  if (error) throw error;

  const balances: Record<string, number> = {};

  for (const expense of expenses ?? []) {
    balances[expense.paid_by_user_id] =
      (balances[expense.paid_by_user_id] || 0) + Number(expense.amount);

    for (const split of expense.expense_splits ?? []) {
      balances[split.user_id] =
        (balances[split.user_id] || 0) - Number(split.share);
    }
  }

  return balances;
};

export const getMinimumSettlements = async (group_id: string) => {
  const balances = await getBalances(group_id);

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [userId, balance] of Object.entries(balances)) {
    if (balance > 0) creditors.push({ id: userId, amount: balance });
    if (balance < 0) debtors.push({ id: userId, amount: -balance });
  }

  const settlements: { from: string; to: string; amount: number }[] = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const payment = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({
      from: debtors[i].id,
      to: creditors[j].id,
      amount: Math.round(payment * 100) / 100,
    });
    debtors[i].amount -= payment;
    creditors[j].amount -= payment;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }

  return settlements;
};