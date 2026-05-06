// Módulo M4 - Presupuesto y Gastos

import { supabaseAdmin } from '../../infrastructure/db/supabase.client';
import * as NotificationsService from '../notifications/notifications.service';

export interface BudgetMember {
  id: string;
  nombre: string;
  email?: string | null;
}

export interface BudgetExpense {
  id: string;
  group_id: string;
  paid_by_user_id: string;
  paid_by_name: string;
  amount: number;
  description: string;
  category: 'transporte' | 'hospedaje' | 'actividad' | 'comida' | 'otro';
  split_type: 'equitativa' | 'personalizada';
  expense_date: string;
  created_at: string;
  updated_at: string;
  splits: Array<{
    id: string;
    user_id: string;
    user_name: string;
    share: number;
    settled: boolean;
  }>;
}

export interface BudgetDashboard {
  groupId: string;
  totalBudget: number;
  expenses: BudgetExpense[];
  members: BudgetMember[];
  balances: Record<string, number>;
}

const VALID_CATEGORIES = new Set(['transporte', 'hospedaje', 'actividad', 'comida', 'otro']);
const VALID_SPLIT_TYPES = new Set(['equitativa', 'personalizada']);

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getLocalUserId(authUserId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
  return Number(data.id_usuario);
}

async function assertGroupMembership(groupId: string, authUserId: string) {
  const usuarioId = await getLocalUserId(authUserId);

  const { data, error } = await supabaseAdmin
    .from('grupo_miembros')
    .select('id, rol')
    .eq('grupo_id', groupId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });
  if (!data) throw Object.assign(new Error('No perteneces a este grupo'), { statusCode: 403 });

  return { usuarioId, rol: String(data.rol ?? 'viajero') };
}

async function getGroupMembers(groupId: string): Promise<BudgetMember[]> {
  const { data, error } = await supabaseAdmin
    .from('grupo_miembros')
    .select('usuario_id, usuarios(id_usuario, nombre, email)')
    .eq('grupo_id', groupId);

  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

  return (data ?? []).map((row: any) => {
    const user = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios;
    const id = String(row.usuario_id ?? user?.id_usuario ?? '');
    const email = user?.email ?? null;
    return {
      id,
      nombre: String(user?.nombre ?? (email ? String(email).split('@')[0] : `Usuario ${id}`)),
      email,
    };
  }).filter((member) => member.id);
}

async function getGroupBudget(groupId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('grupos_viaje')
    .select('presupuesto_total')
    .eq('id', groupId)
    .single();

  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });
  return toNumber(data?.presupuesto_total, 0);
}

function normalizeExpense(row: any, memberNames: Map<string, string>): BudgetExpense {
  const splits = (row.expense_splits ?? []).map((split: any) => ({
    id: String(split.id),
    user_id: String(split.user_id),
    user_name: memberNames.get(String(split.user_id)) ?? `Usuario ${split.user_id}`,
    share: toNumber(split.share),
    settled: Boolean(split.settled),
  }));

  return {
    id: String(row.id),
    group_id: String(row.group_id),
    paid_by_user_id: String(row.paid_by_user_id),
    paid_by_name: memberNames.get(String(row.paid_by_user_id)) ?? `Usuario ${row.paid_by_user_id}`,
    amount: toNumber(row.amount),
    description: String(row.description ?? ''),
    category: String(row.category ?? 'otro') as BudgetExpense['category'],
    split_type: String(row.split_type ?? 'equitativa') as BudgetExpense['split_type'],
    expense_date: String(row.expense_date ?? new Date().toISOString().slice(0, 10)),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    splits,
  };
}

export const getBalances = async (groupId: string): Promise<Record<string, number>> => {
  const { data: expenses, error } = await supabaseAdmin
    .from('expenses')
    .select('*, expense_splits(*)')
    .eq('group_id', groupId);

  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

  const balances: Record<string, number> = {};

  for (const expense of expenses ?? []) {
    const paidBy = String(expense.paid_by_user_id);
    balances[paidBy] = (balances[paidBy] || 0) + toNumber(expense.amount);

    for (const split of expense.expense_splits ?? []) {
      const userId = String(split.user_id);
      balances[userId] = (balances[userId] || 0) - toNumber(split.share);
    }
  }

  return balances;
};

export const getBudgetDashboard = async (groupId: string, authUserId: string): Promise<BudgetDashboard> => {
  await assertGroupMembership(groupId, authUserId);

  const [members, totalBudget] = await Promise.all([
    getGroupMembers(groupId),
    getGroupBudget(groupId),
  ]);
  const memberNames = new Map(members.map((member) => [member.id, member.nombre]));

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('*, expense_splits(*)')
    .eq('group_id', groupId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

  return {
    groupId,
    totalBudget,
    members,
    expenses: (data ?? []).map((row) => normalizeExpense(row, memberNames)),
    balances: await getBalances(groupId),
  };
};

function buildSplits(amount: number, splitType: string, memberIds: string[], customSplits?: Record<string, number>) {
  const uniqueMemberIds = Array.from(new Set(memberIds.map(String).filter(Boolean)));
  if (uniqueMemberIds.length === 0) throw Object.assign(new Error('Debes seleccionar al menos un integrante'), { statusCode: 400 });

  if (splitType === 'personalizada') {
    const splits = uniqueMemberIds.map((userId) => ({
      user_id: userId,
      share: Math.round(toNumber(customSplits?.[userId], 0) * 100) / 100,
      settled: false,
    }));
    const total = Math.round(splits.reduce((sum, split) => sum + split.share, 0) * 100) / 100;
    if (Math.abs(total - amount) > 0.02) {
      throw Object.assign(new Error('La suma de la división personalizada debe coincidir con el monto'), { statusCode: 400 });
    }
    return splits;
  }

  const share = Math.round((amount / uniqueMemberIds.length) * 100) / 100;
  const splits = uniqueMemberIds.map((userId) => ({ user_id: userId, share, settled: false }));
  const diff = Math.round((amount - splits.reduce((sum, split) => sum + split.share, 0)) * 100) / 100;
  if (splits[0]) splits[0].share = Math.round((splits[0].share + diff) * 100) / 100;
  return splits;
}

export const createExpense = async (authUserId: string, data: {
  group_id: string;
  paid_by_user_id?: string;
  amount: number;
  description: string;
  category: string;
  split_type?: string;
  expense_date?: string;
  member_ids: string[];
  split_amounts?: Record<string, number>;
}) => {
  const { usuarioId } = await assertGroupMembership(data.group_id, authUserId);

  const amount = Math.round(toNumber(data.amount) * 100) / 100;
  if (amount <= 0) throw Object.assign(new Error('El monto debe ser mayor a 0'), { statusCode: 400 });
  if (!data.description?.trim()) throw Object.assign(new Error('La descripción es requerida'), { statusCode: 400 });
  if (!VALID_CATEGORIES.has(data.category)) throw Object.assign(new Error('Categoría inválida'), { statusCode: 400 });

  const splitType = VALID_SPLIT_TYPES.has(String(data.split_type)) ? String(data.split_type) : 'equitativa';
  const paidBy = data.paid_by_user_id ? String(data.paid_by_user_id) : String(usuarioId);
  const selectedMemberIds = data.member_ids?.length ? data.member_ids : [paidBy];

  const splits = buildSplits(amount, splitType, selectedMemberIds, data.split_amounts).map((split) => ({
    ...split,
    expense_id: 0,
  }));

  const { data: expense, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      group_id: data.group_id,
      paid_by_user_id: paidBy,
      amount,
      description: data.description.trim(),
      category: data.category,
      split_type: splitType,
      expense_date: data.expense_date ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

  const { error: splitError } = await supabaseAdmin
    .from('expense_splits')
    .insert(splits.map(({ expense_id, ...split }) => ({ ...split, expense_id: expense.id })));

  if (splitError) {
    await supabaseAdmin.from('expenses').delete().eq('id', expense.id);
    throw Object.assign(new Error(splitError.message), { statusCode: 500 });
  }

  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  await NotificationsService.createNotificationForGroupMembers(Number(data.group_id), Number(usuarioId), {
    tipo: 'finanzas_gasto_creado',
    titulo: 'Nuevo gasto registrado',
    mensaje: `${actorName} registró el gasto "${data.description.trim()}" por $${amount.toFixed(2)} MXN.`,
    entidadTipo: 'gasto',
    entidadId: Number(expense.id),
    metadata: { actorName, actorUsuarioId: Number(usuarioId), amount, category: data.category },
  });

  return expense;
};

export const updateExpense = async (expenseId: string, authUserId: string, data: {
  group_id: string;
  paid_by_user_id?: string;
  amount: number;
  description: string;
  category: string;
  split_type?: string;
  expense_date?: string;
  member_ids: string[];
  split_amounts?: Record<string, number>;
}) => {
  const { usuarioId, rol } = await assertGroupMembership(data.group_id, authUserId);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .eq('group_id', data.group_id)
    .single();

  if (existingError || !existing) throw Object.assign(new Error('Gasto no encontrado'), { statusCode: 404 });
  if (String(existing.paid_by_user_id) !== String(usuarioId) && rol !== 'admin') {
    throw Object.assign(new Error('Solo el pagador o el admin pueden editar este gasto'), { statusCode: 403 });
  }

  const amount = Math.round(toNumber(data.amount) * 100) / 100;
  const splitType = VALID_SPLIT_TYPES.has(String(data.split_type)) ? String(data.split_type) : 'equitativa';
  const paidBy = data.paid_by_user_id ? String(data.paid_by_user_id) : String(existing.paid_by_user_id);
  const selectedMemberIds = data.member_ids?.length ? data.member_ids : [paidBy];
  const splits = buildSplits(amount, splitType, selectedMemberIds, data.split_amounts);

  const { data: updated, error } = await supabaseAdmin
    .from('expenses')
    .update({
      paid_by_user_id: paidBy,
      amount,
      description: data.description.trim(),
      category: data.category,
      split_type: splitType,
      expense_date: data.expense_date ?? existing.expense_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .eq('group_id', data.group_id)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

  await supabaseAdmin.from('expense_splits').delete().eq('expense_id', expenseId);
  const { error: splitError } = await supabaseAdmin
    .from('expense_splits')
    .insert(splits.map((split) => ({ ...split, expense_id: expenseId })));

  if (splitError) throw Object.assign(new Error(splitError.message), { statusCode: 500 });

  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  await NotificationsService.createNotificationForGroupMembers(Number(data.group_id), Number(usuarioId), {
    tipo: 'finanzas_gasto_actualizado',
    titulo: 'Gasto actualizado',
    mensaje: `${actorName} actualizó el gasto "${data.description.trim()}".`,
    entidadTipo: 'gasto',
    entidadId: Number(expenseId),
    metadata: { actorName, actorUsuarioId: Number(usuarioId), amount, category: data.category },
  });

  return updated;
};

export const deleteExpense = async (expenseId: string, groupId: string, authUserId: string): Promise<void> => {
  const { usuarioId, rol } = await assertGroupMembership(groupId, authUserId);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .eq('group_id', groupId)
    .single();

  if (existingError || !existing) throw Object.assign(new Error('Gasto no encontrado'), { statusCode: 404 });
  if (String(existing.paid_by_user_id) !== String(usuarioId) && rol !== 'admin') {
    throw Object.assign(new Error('Solo el pagador o el admin pueden eliminar este gasto'), { statusCode: 403 });
  }

  const { error: splitError } = await supabaseAdmin.from('expense_splits').delete().eq('expense_id', expenseId);
  if (splitError) throw Object.assign(new Error(splitError.message), { statusCode: 500 });

  const { error } = await supabaseAdmin.from('expenses').delete().eq('id', expenseId).eq('group_id', groupId);
  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  await NotificationsService.createNotificationForGroupMembers(Number(groupId), Number(usuarioId), {
    tipo: 'finanzas_gasto_eliminado',
    titulo: 'Gasto eliminado',
    mensaje: `${actorName} eliminó el gasto "${existing.description}".`,
    entidadTipo: 'gasto',
    entidadId: Number(expenseId),
    metadata: { actorName, actorUsuarioId: Number(usuarioId), amount: Number(existing.amount) },
  });
};

export const updateGroupBudget = async (groupId: string, authUserId: string, totalBudget: number) => {
  const { usuarioId, rol } = await assertGroupMembership(groupId, authUserId);
  if (rol !== 'admin') throw Object.assign(new Error('Solo el admin puede ajustar el presupuesto'), { statusCode: 403 });

  const value = Math.round(toNumber(totalBudget) * 100) / 100;
  if (value < 0) throw Object.assign(new Error('El presupuesto no puede ser negativo'), { statusCode: 400 });

  const { data, error } = await supabaseAdmin
    .from('grupos_viaje')
    .update({ presupuesto_total: value })
    .eq('id', groupId)
    .select('id, presupuesto_total')
    .single();

  if (error) throw Object.assign(new Error(error.message), { statusCode: 500 });

  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  await NotificationsService.createNotificationForGroupMembers(Number(groupId), Number(usuarioId), {
    tipo: 'finanzas_presupuesto_actualizado',
    titulo: 'Presupuesto actualizado',
    mensaje: `${actorName} ajustó el presupuesto total del viaje a $${value.toFixed(2)} MXN.`,
    entidadTipo: 'presupuesto',
    entidadId: Number(groupId),
    metadata: { actorName, actorUsuarioId: Number(usuarioId), totalBudget: value },
  });

  return data;
};

export const getMinimumSettlements = async (groupId: string, authUserId?: string) => {
  if (authUserId) await assertGroupMembership(groupId, authUserId);
  const balances = await getBalances(groupId);

  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const [userId, amount] of Object.entries(balances)) {
    if (amount < -0.01) debtors.push({ userId, amount: Math.abs(amount) });
    else if (amount > 0.01) creditors.push({ userId, amount });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: { from: string; to: string; amount: number }[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const payment = Math.min(debtors[d].amount, creditors[c].amount);
    if (payment > 0.01) settlements.push({ from: debtors[d].userId, to: creditors[c].userId, amount: Math.round(payment * 100) / 100 });
    debtors[d].amount -= payment;
    creditors[c].amount -= payment;
    if (debtors[d].amount < 0.01) d++;
    if (creditors[c].amount < 0.01) c++;
  }

  return settlements;
};
