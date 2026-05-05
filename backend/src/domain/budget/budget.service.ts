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

/**
 * Calcula la liquidación óptima de deudas para un grupo.
 * Implementa el algoritmo de minimización de transacciones (Greedy Settlement).
 * Garantiza que como máximo habrá n-1 transacciones, donde n es el número de miembros con saldo no nulo.
 * 
 * Este algoritmo es ideal para viajes grupales ya que reduce la complejidad de los pagos,
 * asegurando que el deudor más grande le pague al acreedor más grande de forma iterativa.
 */
export const getMinimumSettlements = async (group_id: string) => {
  // 1. Obtener los balances netos de cada usuario
  const balances = await getBalances(group_id);

  // 2. Separar a los usuarios en deudores y acreedores (ignorando saldos insignificantes < 0.01)
  // - Deudores: Tienen saldo negativo (deben dinero)
  // - Acreedores: Tienen saldo positivo (les deben dinero)
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const [userId, amount] of Object.entries(balances)) {
    if (amount < -0.01) {
      debtors.push({ userId, amount: Math.abs(amount) });
    } else if (amount > 0.01) {
      creditors.push({ userId, amount });
    }
  }

  // 3. Ordenar ambos grupos de mayor a menor monto.
  // La estrategia Greedy (codiciosa) dicta que liquidar las deudas más grandes primero
  // optimiza la percepción de orden y reduce el número de pagos pequeños fragmentados.
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: { from: string; to: string; amount: number }[] = [];

  let d = 0; // Puntero para recorrer la lista de deudores
  let c = 0; // Puntero para recorrer la lista de acreedores

  // 4. Proceso de liquidación iterativo
  while (d < debtors.length && c < creditors.length) {
    // La transacción es por el mínimo entre lo que el deudor debe y lo que el acreedor espera recibir
    const payment = Math.min(debtors[d].amount, creditors[c].amount);
    
    if (payment > 0.01) {
      settlements.push({
        from: debtors[d].userId,
        to: creditors[c].userId,
        amount: Math.round(payment * 100) / 100, // Redondeo para evitar errores de precisión de punto flotante
      });
    }

    // Actualizar los saldos pendientes de los punteros actuales
    debtors[d].amount -= payment;
    creditors[c].amount -= payment;

    // Si el deudor ya pagó todo su saldo neto, avanzamos al siguiente deudor
    if (debtors[d].amount < 0.01) d++;
    
    // Si el acreedor ya recuperó todo su saldo neto, avanzamos al siguiente acreedor
    if (creditors[c].amount < 0.01) c++;
  }

  // Retornamos el arreglo de transacciones optimizado
  return settlements;
};