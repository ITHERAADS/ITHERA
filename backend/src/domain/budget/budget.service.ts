import { supabaseAdmin } from '../../infrastructure/db/supabase.client';
import * as NotificationsService from '../notifications/notifications.service';
import { getLocalUserId } from '../groups/groups.service';
import {
  BudgetCategory,
  BudgetExpensePayload,
  BudgetMember,
  BudgetPayment,
  BudgetSettlement,
  BudgetSplitType,
  MarkSettlementPaymentPayload,
  ReviewSettlementPaymentPayload,
  UpdateSettlementPaymentPayload,
} from './budget.entity';

type ServiceError = Error & { statusCode?: number };

type RawExpenseRow = {
  id: string | number;
  group_id: string | number;
  paid_by_user_id: string | number;
  created_by_user_id?: string | number | null;
  amount: number | string;
  description: string;
  category: BudgetCategory | string | null;
  split_type?: BudgetSplitType | string | null;
  expense_date?: string | null;
  created_at?: string | null;
  expense_splits?: Array<{
    id?: string | number;
    user_id: string | number;
    share: number | string;
    settled?: boolean | null;
  }>;
};

type RawPaymentRow = {
  id: string | number;
  group_id: string | number;
  from_user_id: string | number;
  to_user_id: string | number;
  amount: number | string;
  status?: string | null;
  payment_method?: string | null;
  paid_at: string;
  created_by_user_id: string | number;
  reviewed_by_user_id?: string | number | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  note?: string | null;
  settlement_payment_documents?: Array<{
    trip_document_id: string;
  }>;
};

const createError = (message: string, statusCode: number): ServiceError => {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  return err;
};

const emitBudgetDashboardUpdated = (
  groupId: string,
  tipo: string,
  entidadTipo: string,
  entidadId: string | number | null,
  actorUsuarioId: string | number | null,
  metadata: Record<string, unknown> = {},
): void => {
  NotificationsService.emitGroupDashboardUpdated(Number(groupId), {
    tipo,
    entidadTipo,
    entidadId: entidadId !== null ? Number(entidadId) : null,
    actorUsuarioId: actorUsuarioId !== null ? Number(actorUsuarioId) : null,
    metadata: { itemType: 'presupuesto', ...metadata },
  });
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const toDateKey = (value?: string | null): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const EXPENSE_WINDOW_MONTHS_BEFORE_TRIP = 2;
const EXPENSE_WINDOW_DAYS_AFTER_TRIP = 3;

const addMonthsToDateKey = (dateKey: string, months: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
};

const addDaysToDateKey = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const assertPositiveAmount = (amount: unknown): number => {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createError('El monto debe ser mayor a cero', 400);
  }
  return roundMoney(parsed);
};

const normalizeCategory = (category: unknown): BudgetCategory => {
  const value = String(category ?? '').trim().toLowerCase();
  if (['transporte', 'hospedaje', 'actividad', 'comida', 'otro'].includes(value)) {
    return value as BudgetCategory;
  }
  throw createError('Categoria de gasto invalida', 400);
};

const normalizeSplitType = (splitType: unknown): BudgetSplitType =>
  splitType === 'personalizada' ? 'personalizada' : 'equitativa';

const normalizePaymentStatus = (
  status: unknown,
): 'pendiente_validacion' | 'confirmado' | 'rechazado' => {
  if (status === 'confirmado' || status === 'rechazado') return status;
  return 'pendiente_validacion';
};

const normalizePaymentMethod = (
  method: unknown,
): 'efectivo_presencial' | 'transferencia' | null => {
  if (method === 'efectivo_presencial' || method === 'transferencia') return method;
  return null;
};

export const ensureGroupMember = async (authUserId: string, groupId: string) => {
  const usuarioId = await getLocalUserId(authUserId);
  const { data, error } = await supabaseAdmin
    .from('grupo_miembros')
    .select('id, rol, usuario_id, grupo_id')
    .eq('grupo_id', groupId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw createError(error.message, 500);
  if (!data) throw createError('No perteneces a este grupo', 403);

  return { usuarioId: String(usuarioId), membership: data };
};

export const ensureGroupAdmin = async (authUserId: string, groupId: string) => {
  const result = await ensureGroupMember(authUserId, groupId);
  if (String(result.membership.rol).toLowerCase() !== 'admin') {
    throw createError('Solo un administrador puede modificar finanzas del grupo', 403);
  }
  return result;
};

const getMembers = async (groupId: string): Promise<BudgetMember[]> => {
  const { data: memberships, error } = await supabaseAdmin
    .from('grupo_miembros')
    .select('id, usuario_id, rol')
    .eq('grupo_id', groupId);

  if (error) throw createError(error.message, 500);

  const userIds = Array.from(new Set((memberships ?? [])
    .map((item: any) => Number(item.usuario_id))
    .filter((id) => Number.isFinite(id))));

  let users: any[] = [];
  let usersError: any = null;

  if (userIds.length > 0) {
    const usersQuery = supabaseAdmin
      .from('usuarios')
      .select('id_usuario, nombre, email, avatar_url') as any;

    if (typeof usersQuery.in === 'function') {
      const response = await usersQuery.in('id_usuario', userIds);
      users = response.data ?? [];
      usersError = response.error ?? null;
    } else {
      const response = await usersQuery;
      users = (response.data ?? []).filter((user: any) =>
        userIds.includes(Number(user.id_usuario)),
      );
      usersError = response.error ?? null;
    }
  }

  if (usersError) throw createError(usersError.message, 500);

  const usersById = new Map((users ?? []).map((user: any) => [String(user.id_usuario), user]));

  return (memberships ?? []).map((item: any) => {
    const user = usersById.get(String(item.usuario_id));
    return ({
    id: String(item.id),
    usuario_id: String(item.usuario_id),
    rol: item.rol,
    nombre: user?.nombre ?? user?.email ?? `Usuario ${item.usuario_id}`,
    email: user?.email ?? '',
    avatar_url: user?.avatar_url ?? null,
  });
  });
};

const assertUserInGroup = (members: BudgetMember[], userId: string, message: string) => {
  if (!members.some((member) => String(member.usuario_id) === String(userId))) {
    throw createError(message, 400);
  }
};

const getGroupBudgetRecord = async (groupId: string) => {
  const { data, error } = await supabaseAdmin
    .from('grupos_viaje')
    .select('id, presupuesto_total')
    .eq('id', groupId)
    .single();

  if (error || !data) throw createError('Grupo no encontrado', 404);
  return data;
};

const assertExpenseDateWithinTripWindow = async (
  groupId: string,
  expenseDateRaw: string | null | undefined,
) => {
  const expenseDate = toDateKey(expenseDateRaw ?? null);
  if (!expenseDate) {
    throw createError('La fecha del gasto es invalida', 400);
  }

  const { data: group, error } = await supabaseAdmin
    .from('grupos_viaje')
    .select('fecha_inicio, fecha_fin')
    .eq('id', groupId)
    .maybeSingle();

  if (error) throw createError(error.message, 500);
  if (!group) throw createError('Grupo no encontrado', 404);

  const start = toDateKey(String((group as any).fecha_inicio ?? ''));
  const end = toDateKey(String((group as any).fecha_fin ?? ''));
  if (!start || !end) {
    // Mantiene compatibilidad con grupos legacy o fixtures de prueba sin fechas.
    // Solo aplicamos validacion estricta cuando existe ventana de viaje completa.
    return;
  }

  const minDate = addMonthsToDateKey(
    start,
    -EXPENSE_WINDOW_MONTHS_BEFORE_TRIP,
  );
  const maxDate = addDaysToDateKey(end, EXPENSE_WINDOW_DAYS_AFTER_TRIP);
  if (expenseDate < minDate || expenseDate > maxDate) {
    throw createError(
      `La fecha del gasto debe estar entre ${minDate} y ${maxDate}`,
      400,
    );
  }
};

const getExpenses = async (groupId: string): Promise<RawExpenseRow[]> => {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('*, expense_splits(*)')
    .eq('group_id', groupId)
    .order('expense_date', { ascending: true });

  if (error) throw createError(error.message, 500);
  return (data ?? []) as RawExpenseRow[];
};

const buildSplits = (
  expenseId: string,
  payload: BudgetExpensePayload,
  members: BudgetMember[],
  amount: number,
) => {
  const splitType = normalizeSplitType(payload.split_type);

  if (splitType === 'personalizada') {
    const splitAmounts = payload.split_amounts ?? {};
    const splits = Object.entries(splitAmounts)
      .filter(([, share]) => Number(share) > 0)
      .map(([userId, share]) => {
        assertUserInGroup(members, userId, 'Un integrante del split no pertenece al grupo');
        return {
          expense_id: expenseId,
          user_id: String(userId),
          share: roundMoney(Number(share)),
          settled: false,
        };
      });

    const total = roundMoney(splits.reduce((sum, split) => sum + Number(split.share), 0));
    if (Math.abs(total - amount) > 0.01) {
      throw createError('La suma de los splits personalizados debe coincidir con el total', 400);
    }
    return splits;
  }

  const selectedMemberIds = payload.member_ids?.length
    ? payload.member_ids.map(String)
    : members.map((member) => String(member.usuario_id));

  for (const memberId of selectedMemberIds) {
    assertUserInGroup(members, memberId, 'Un integrante del split no pertenece al grupo');
  }

  if (selectedMemberIds.length === 0) {
    throw createError('El gasto debe dividirse entre al menos un integrante', 400);
  }

  const share = roundMoney(amount / selectedMemberIds.length);
  return selectedMemberIds.map((userId, index) => ({
    expense_id: expenseId,
    user_id: userId,
    share: index === selectedMemberIds.length - 1
      ? roundMoney(amount - share * (selectedMemberIds.length - 1))
      : share,
    settled: false,
  }));
};

const categoryTotalsFromExpenses = (expenses: RawExpenseRow[]) => {
  const totals: Record<BudgetCategory, number> = {
    transporte: 0,
    hospedaje: 0,
    actividad: 0,
    comida: 0,
    otro: 0,
  };

  for (const expense of expenses) {
    const category = normalizeCategory(expense.category ?? 'otro');
    totals[category] = roundMoney(totals[category] + Number(expense.amount));
  }

  return totals;
};

const calculateBalances = (expenses: RawExpenseRow[]): Record<string, number> => {
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    const payerId = String(expense.paid_by_user_id);
    balances[payerId] = roundMoney((balances[payerId] ?? 0) + Number(expense.amount));

    for (const split of expense.expense_splits ?? []) {
      const userId = String(split.user_id);
      balances[userId] = roundMoney((balances[userId] ?? 0) - Number(split.share));
    }
  }

  return balances;
};

const applyConfirmedPaymentsToBalances = (
  balances: Record<string, number>,
  payments: RawPaymentRow[],
): Record<string, number> => {
  const next = { ...balances };
  for (const payment of payments) {
    if (normalizePaymentStatus(payment.status) !== 'confirmado') continue;
    const from = String(payment.from_user_id);
    const to = String(payment.to_user_id);
    const amount = Number(payment.amount);
    next[from] = roundMoney((next[from] ?? 0) - amount);
    next[to] = roundMoney((next[to] ?? 0) + amount);
  }
  return next;
};

const calculateMinimumSettlements = (balances: Record<string, number>): BudgetSettlement[] => {
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const [userId, amount] of Object.entries(balances)) {
    if (amount < -0.01) debtors.push({ userId, amount: Math.abs(amount) });
    if (amount > 0.01) creditors.push({ userId, amount });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: BudgetSettlement[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const payment = Math.min(debtors[d].amount, creditors[c].amount);
    if (payment > 0.01) {
      settlements.push({
        from: debtors[d].userId,
        to: creditors[c].userId,
        amount: roundMoney(payment),
      });
    }

    debtors[d].amount -= payment;
    creditors[c].amount -= payment;
    if (debtors[d].amount < 0.01) d++;
    if (creditors[c].amount < 0.01) c++;
  }

  return settlements;
};

const getSettlementPayments = async (groupId: string): Promise<RawPaymentRow[]> => {
  const { data, error } = await supabaseAdmin
    .from('settlement_payments')
    .select('*, settlement_payment_documents(trip_document_id)')
    .eq('group_id', groupId)
    .order('paid_at', { ascending: false });

  if (error) throw createError(error.message, 500);
  return (data ?? []) as RawPaymentRow[];
};

const mapPayment = (payment: RawPaymentRow): BudgetPayment => ({
  id: String(payment.id),
  from: String(payment.from_user_id),
  to: String(payment.to_user_id),
  amount: Number(payment.amount),
  status: normalizePaymentStatus(payment.status),
  payment_method: normalizePaymentMethod(payment.payment_method),
  paid_at: String(payment.paid_at),
  created_by_user_id: String(payment.created_by_user_id),
  reviewed_by_user_id: payment.reviewed_by_user_id != null ? String(payment.reviewed_by_user_id) : null,
  reviewed_at: payment.reviewed_at ?? null,
  rejection_reason: payment.rejection_reason ?? null,
  proof_document_id: payment.settlement_payment_documents?.[0]?.trip_document_id ?? null,
  note: payment.note ?? null,
});

const mapExpense = (expense: RawExpenseRow, membersById: Map<string, BudgetMember>) => {
  const splitAmounts = Object.fromEntries(
    (expense.expense_splits ?? []).map((split) => [String(split.user_id), Number(split.share)])
  );
  const paidByUserId = String(expense.paid_by_user_id);

  return {
    id: String(expense.id),
    groupId: String(expense.group_id),
    paidByUserId,
    paidByName: membersById.get(paidByUserId)?.nombre ?? `Usuario ${paidByUserId}`,
    amount: Number(expense.amount),
    description: expense.description,
    category: normalizeCategory(expense.category ?? 'otro'),
    splitType: normalizeSplitType(expense.split_type),
    splitAmounts,
    expenseDate: expense.expense_date ?? expense.created_at ?? null,
    createdAt: expense.created_at ?? null,
  };
};

export const getBudgetDashboard = async (authUserId: string, groupId: string) => {
  const { membership, usuarioId } = await ensureGroupMember(authUserId, groupId);
  const [group, members, expenses, payments] = await Promise.all([
    getGroupBudgetRecord(groupId),
    getMembers(groupId),
    getExpenses(groupId),
    getSettlementPayments(groupId),
  ]);

  const membersById = new Map(members.map((member) => [String(member.usuario_id), member]));
  const totalBudget = Number(group.presupuesto_total ?? 0);
  const committed = roundMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount), 0));
  const balances = applyConfirmedPaymentsToBalances(calculateBalances(expenses), payments);
  const settlements = calculateMinimumSettlements(balances);
  const groupSettlementSummary = {
    totalTransfers: settlements.length,
    totalAmount: roundMoney(settlements.reduce((sum, settlement) => sum + settlement.amount, 0)),
  };
  const personalSettlements = settlements.filter(
    (settlement) => settlement.from === String(usuarioId) || settlement.to === String(usuarioId),
  );
  const personalPaymentHistory = payments
    .map(mapPayment)
    .filter((payment) => payment.from === String(usuarioId) || payment.to === String(usuarioId));

  return {
    ok: true,
    groupId: String(groupId),
    myRole: membership.rol,
    summary: {
      totalBudget,
      committed,
      available: roundMoney(totalBudget - committed),
      percentCommitted: totalBudget > 0 ? Math.min(roundMoney((committed / totalBudget) * 100), 100) : 0,
      categoryTotals: categoryTotalsFromExpenses(expenses),
    },
    members,
    expenses: expenses.map((expense) => mapExpense(expense, membersById)),
    balances,
    settlements: personalSettlements,
    groupSettlementSummary,
    paymentHistory: personalPaymentHistory,
  };
};

export const updateBudget = async (authUserId: string, groupId: string, amount: unknown) => {
  await ensureGroupAdmin(authUserId, groupId);
  const totalBudget = Number(amount);
  if (!Number.isFinite(totalBudget) || totalBudget < 0) {
    throw createError('El presupuesto debe ser mayor o igual a cero', 400);
  }

  const expenses = await getExpenses(groupId);
  const committed = roundMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount), 0));
  if (roundMoney(totalBudget) + 0.01 < committed) {
    throw createError(
      `No puedes definir un presupuesto menor al comprometido actual (${committed}).`,
      400
    );
  }

  const { error } = await supabaseAdmin
    .from('grupos_viaje')
    .update({ presupuesto_total: roundMoney(totalBudget) })
    .eq('id', groupId);

  if (error) throw createError(error.message, 500);

  const actor = await ensureGroupMember(authUserId, groupId);
  emitBudgetDashboardUpdated(groupId, 'presupuesto_actualizado', 'presupuesto', groupId, actor.usuarioId, {
    amount: roundMoney(totalBudget),
  });

  return getBudgetDashboard(authUserId, groupId);
};

export const createExpense = async (
  authUserId: string,
  groupId: string,
  payload: BudgetExpensePayload,
) => {
  const actor = await ensureGroupMember(authUserId, groupId);
  const members = await getMembers(groupId);
  const amount = assertPositiveAmount(payload.amount);
  const category = normalizeCategory(payload.category);
  const splitType = normalizeSplitType(payload.split_type);
  const paidByUserId = String(payload.paid_by_user_id);
  assertUserInGroup(members, paidByUserId, 'El pagador no pertenece al grupo');
  const expenseDate = payload.expense_date ?? new Date().toISOString().split('T')[0];
  await assertExpenseDateWithinTripWindow(groupId, expenseDate);

  const { data: expense, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      group_id: groupId,
      paid_by_user_id: paidByUserId,
      created_by_user_id: actor.usuarioId,
      amount,
      description: String(payload.description ?? '').trim(),
      category,
      split_type: splitType,
      expense_date: expenseDate,
    })
    .select()
    .single();

  if (error || !expense) throw createError(error?.message ?? 'Error al registrar el gasto', 500);

  const splits = buildSplits(String(expense.id), payload, members, amount);
  const { error: splitError } = await supabaseAdmin.from('expense_splits').insert(splits);
  if (splitError) throw createError(splitError.message, 500);

  emitBudgetDashboardUpdated(groupId, 'gasto_creado', 'gasto', expense.id, paidByUserId, {
    amount,
    category,
    itemTitle: String(payload.description ?? '').trim() || 'Gasto',
  });

  return getBudgetDashboard(authUserId, groupId);
};

export const updateExpense = async (
  authUserId: string,
  groupId: string,
  expenseId: string,
  payload: BudgetExpensePayload,
) => {
  const actor = await ensureGroupMember(authUserId, groupId);
  const isAdmin = String(actor.membership.rol).toLowerCase() === 'admin';
  const { data: existingExpense, error: expenseError } = await supabaseAdmin
    .from('expenses')
    .select('id, paid_by_user_id, created_by_user_id, group_id')
    .eq('id', expenseId)
    .eq('group_id', groupId)
    .maybeSingle();
  if (expenseError) throw createError(expenseError.message, 500);
  if (!existingExpense) throw createError('Gasto no encontrado', 404);
  const creatorUserId = String((existingExpense as { created_by_user_id?: string | number | null }).created_by_user_id ?? '');
  if (!isAdmin && creatorUserId !== String(actor.usuarioId)) {
    throw createError('Solo el creador del gasto o un admin pueden modificarlo', 403);
  }

  const members = await getMembers(groupId);
  const amount = assertPositiveAmount(payload.amount);
  const category = normalizeCategory(payload.category);
  const splitType = normalizeSplitType(payload.split_type);
  const paidByUserId = String(payload.paid_by_user_id);
  assertUserInGroup(members, paidByUserId, 'El pagador no pertenece al grupo');
  const expenseDate = payload.expense_date ?? new Date().toISOString().split('T')[0];
  await assertExpenseDateWithinTripWindow(groupId, expenseDate);

  const { error } = await supabaseAdmin
    .from('expenses')
    .update({
      paid_by_user_id: paidByUserId,
      amount,
      description: String(payload.description ?? '').trim(),
      category,
      split_type: splitType,
      expense_date: expenseDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .eq('group_id', groupId);

  if (error) throw createError(error.message, 500);

  const { error: deleteSplitsError } = await supabaseAdmin
    .from('expense_splits')
    .delete()
    .eq('expense_id', expenseId);
  if (deleteSplitsError) throw createError(deleteSplitsError.message, 500);

  const splits = buildSplits(expenseId, payload, members, amount);
  const { error: insertSplitsError } = await supabaseAdmin.from('expense_splits').insert(splits);
  if (insertSplitsError) throw createError(insertSplitsError.message, 500);

  emitBudgetDashboardUpdated(groupId, 'gasto_actualizado', 'gasto', expenseId, actor.usuarioId, {
    amount,
    category,
    itemTitle: String(payload.description ?? '').trim() || 'Gasto',
  });

  return getBudgetDashboard(authUserId, groupId);
};

export const deleteExpense = async (authUserId: string, groupId: string, expenseId: string) => {
  const actor = await ensureGroupMember(authUserId, groupId);
  const isAdmin = String(actor.membership.rol).toLowerCase() === 'admin';
  const { data: existingExpense, error: expenseError } = await supabaseAdmin
    .from('expenses')
    .select('id, paid_by_user_id, created_by_user_id, group_id')
    .eq('id', expenseId)
    .eq('group_id', groupId)
    .maybeSingle();
  if (expenseError) throw createError(expenseError.message, 500);
  if (!existingExpense) throw createError('Gasto no encontrado', 404);
  const creatorUserId = String((existingExpense as { created_by_user_id?: string | number | null }).created_by_user_id ?? '');
  if (!isAdmin && creatorUserId !== String(actor.usuarioId)) {
    throw createError('Solo el creador del gasto o un admin pueden eliminarlo', 403);
  }

  const { error: splitError } = await supabaseAdmin
    .from('expense_splits')
    .delete()
    .eq('expense_id', expenseId);
  if (splitError) throw createError(splitError.message, 500);

  const { error } = await supabaseAdmin
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('group_id', groupId);

  if (error) throw createError(error.message, 500);

  emitBudgetDashboardUpdated(groupId, 'gasto_eliminado', 'gasto', expenseId, actor.usuarioId);

  return getBudgetDashboard(authUserId, groupId);
};

export const getBalances = async (groupId: string): Promise<Record<string, number>> => {
  return calculateBalances(await getExpenses(groupId));
};

export const getMinimumSettlements = async (groupId: string) => {
  return calculateMinimumSettlements(await getBalances(groupId));
};

export const markSettlementPaid = async (
  authUserId: string,
  groupId: string,
  payload: MarkSettlementPaymentPayload,
) => {
  const { usuarioId, membership } = await ensureGroupMember(authUserId, groupId);
  const amount = assertPositiveAmount(payload.amount);
  const fromUserId = String(payload.from_user_id);
  const toUserId = String(payload.to_user_id);

  if (fromUserId === toUserId) {
    throw createError('No puedes liquidar un pago contra el mismo usuario', 400);
  }

  const members = await getMembers(groupId);
  assertUserInGroup(members, fromUserId, 'El usuario deudor no pertenece al grupo');
  assertUserInGroup(members, toUserId, 'El usuario acreedor no pertenece al grupo');

  const isAdmin = String(membership.rol).toLowerCase() === 'admin';
  if (!isAdmin && String(usuarioId) !== fromUserId) {
    throw createError('Solo el deudor o un admin pueden marcar este pago', 403);
  }

  const paymentMethod = normalizePaymentMethod(payload.payment_method);
  if (!paymentMethod) {
    throw createError('Metodo de pago invalido', 400);
  }
  const proofDocumentId = payload.proof_document_id ? String(payload.proof_document_id) : null;
  if (paymentMethod === 'transferencia' && !proofDocumentId) {
    throw createError('Para transferencia debes adjuntar comprobante', 400);
  }

  const expenses = await getExpenses(groupId);
  const payments = await getSettlementPayments(groupId);
  const currentSettlements = calculateMinimumSettlements(
    applyConfirmedPaymentsToBalances(calculateBalances(expenses), payments),
  );

  const pendingPair = currentSettlements.find(
    (settlement) => settlement.from === fromUserId && settlement.to === toUserId,
  );

  if (!pendingPair) {
    throw createError('No hay una liquidacion pendiente para este par', 400);
  }

  if (amount - pendingPair.amount > 0.01) {
    throw createError('El monto excede la liquidacion pendiente', 400);
  }

  const duplicatedPending = payments.find((payment) =>
    normalizePaymentStatus(payment.status) === 'pendiente_validacion' &&
    String(payment.from_user_id) === fromUserId &&
    String(payment.to_user_id) === toUserId
  );
  if (duplicatedPending) {
    throw createError('Ya tienes un pago pendiente de validacion para este acreedor', 409);
  }

  const { data: inserted, error } = await supabaseAdmin.from('settlement_payments').insert({
      group_id: groupId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount,
      status: 'pendiente_validacion',
      payment_method: paymentMethod,
      note: payload.note ?? null,
      created_by_user_id: usuarioId,
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw createError(error.message, 500);
  if (!inserted) throw createError('No se pudo registrar el pago', 500);

  if (proofDocumentId) {
    const { error: proofError } = await supabaseAdmin.from('settlement_payment_documents').insert({
      settlement_payment_id: inserted.id,
      trip_document_id: proofDocumentId,
    });
    if (proofError) throw createError(proofError.message, 500);
  }

  emitBudgetDashboardUpdated(groupId, 'pago_liquidacion_registrado', 'settlement_payment', null, usuarioId, {
    fromUserId,
    toUserId,
    amount,
    status: 'pendiente_validacion',
  });

  return getBudgetDashboard(authUserId, groupId);
};

export const updatePendingSettlementPayment = async (
  authUserId: string,
  groupId: string,
  paymentId: string,
  payload: UpdateSettlementPaymentPayload,
) => {
  const { usuarioId } = await ensureGroupMember(authUserId, groupId);
  const amount = assertPositiveAmount(payload.amount);
  const paymentMethod = normalizePaymentMethod(payload.payment_method);
  if (!paymentMethod) throw createError('Metodo de pago invalido', 400);
  const proofDocumentId = payload.proof_document_id ? String(payload.proof_document_id) : null;
  if (paymentMethod === 'transferencia' && !proofDocumentId) {
    throw createError('Para transferencia debes adjuntar comprobante', 400);
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('settlement_payments')
    .select('id, group_id, from_user_id, to_user_id, status, created_by_user_id')
    .eq('id', paymentId)
    .eq('group_id', groupId)
    .maybeSingle();
  if (paymentError) throw createError(paymentError.message, 500);
  if (!payment) throw createError('Pago no encontrado', 404);
  if (String(payment.created_by_user_id) !== String(usuarioId)) {
    throw createError('Solo quien registro el pago puede editarlo', 403);
  }
  if (normalizePaymentStatus(payment.status) !== 'pendiente_validacion') {
    throw createError('Solo se puede editar un pago pendiente', 400);
  }

  const expenses = await getExpenses(groupId);
  const payments = await getSettlementPayments(groupId);
  const currentSettlements = calculateMinimumSettlements(
    applyConfirmedPaymentsToBalances(calculateBalances(expenses), payments),
  );
  const pendingPair = currentSettlements.find(
    (settlement) => settlement.from === String(payment.from_user_id) && settlement.to === String(payment.to_user_id),
  );
  if (!pendingPair || amount - pendingPair.amount > 0.01) {
    throw createError('El monto excede la liquidacion pendiente', 400);
  }

  const { error: updateError } = await supabaseAdmin
    .from('settlement_payments')
    .update({ amount, payment_method: paymentMethod, note: payload.note ?? null, paid_at: new Date().toISOString() })
    .eq('id', paymentId)
    .eq('group_id', groupId);
  if (updateError) throw createError(updateError.message, 500);

  await supabaseAdmin.from('settlement_payment_documents').delete().eq('settlement_payment_id', paymentId);
  if (proofDocumentId) {
    const { error: proofError } = await supabaseAdmin.from('settlement_payment_documents').insert({
      settlement_payment_id: paymentId,
      trip_document_id: proofDocumentId,
    });
    if (proofError) throw createError(proofError.message, 500);
  }

  return getBudgetDashboard(authUserId, groupId);
};

export const deletePendingSettlementPayment = async (
  authUserId: string,
  groupId: string,
  paymentId: string,
) => {
  const { usuarioId } = await ensureGroupMember(authUserId, groupId);
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('settlement_payments')
    .select('id, group_id, status, created_by_user_id')
    .eq('id', paymentId)
    .eq('group_id', groupId)
    .maybeSingle();
  if (paymentError) throw createError(paymentError.message, 500);
  if (!payment) throw createError('Pago no encontrado', 404);
  if (String(payment.created_by_user_id) !== String(usuarioId)) {
    throw createError('Solo quien registro el pago puede eliminarlo', 403);
  }
  if (normalizePaymentStatus(payment.status) !== 'pendiente_validacion') {
    throw createError('Solo se puede eliminar un pago pendiente', 400);
  }

  await supabaseAdmin.from('settlement_payment_documents').delete().eq('settlement_payment_id', paymentId);
  const { error: deleteError } = await supabaseAdmin
    .from('settlement_payments')
    .delete()
    .eq('id', paymentId)
    .eq('group_id', groupId);
  if (deleteError) throw createError(deleteError.message, 500);

  return getBudgetDashboard(authUserId, groupId);
};

export const reviewSettlementPayment = async (
  authUserId: string,
  groupId: string,
  paymentId: string,
  payload: ReviewSettlementPaymentPayload,
) => {
  const { usuarioId } = await ensureGroupMember(authUserId, groupId);
  const status = payload.status;
  if (status !== 'confirmado' && status !== 'rechazado') {
    throw createError('Estado de revision invalido', 400);
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('settlement_payments')
    .select('id, group_id, from_user_id, to_user_id, status')
    .eq('id', paymentId)
    .eq('group_id', groupId)
    .maybeSingle();

  if (paymentError) throw createError(paymentError.message, 500);
  if (!payment) throw createError('Pago no encontrado', 404);
  if (String(payment.to_user_id) !== String(usuarioId)) {
    throw createError('Solo el acreedor puede revisar este pago', 403);
  }
  if (normalizePaymentStatus(payment.status) !== 'pendiente_validacion') {
    throw createError('Este pago ya fue revisado', 400);
  }
  if (status === 'rechazado' && !String(payload.rejection_reason ?? '').trim()) {
    throw createError('Debes indicar el motivo de rechazo', 400);
  }

  const { error: updateError } = await supabaseAdmin
    .from('settlement_payments')
    .update({
      status,
      reviewed_by_user_id: usuarioId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: status === 'rechazado' ? String(payload.rejection_reason ?? '').trim() : null,
    })
    .eq('id', paymentId)
    .eq('group_id', groupId);

  if (updateError) throw createError(updateError.message, 500);

  emitBudgetDashboardUpdated(groupId, 'pago_liquidacion_revisado', 'settlement_payment', paymentId, usuarioId, {
    fromUserId: String(payment.from_user_id),
    toUserId: String(payment.to_user_id),
    status,
  });

  return getBudgetDashboard(authUserId, groupId);
};

