import * as BudgetService from '../src/domain/budget/budget.service';
import { supabaseAdmin } from '../src/infrastructure/db/supabase.client';
import { getLocalUserId } from '../src/domain/groups/groups.service';

jest.mock('../src/infrastructure/db/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn((table: string) => mockFrom(table)),
  },
}));

jest.mock('../src/domain/groups/groups.service', () => ({
  getLocalUserId: jest.fn(),
}));

type Row = Record<string, any>;
type MockDatabase = Record<string, Row[]>;

const initialDb = (): MockDatabase => ({
  grupos_viaje: [
    { id: '7', presupuesto_total: 10000 },
  ],
  grupo_miembros: [
    { id: '1', grupo_id: '7', usuario_id: '1', rol: 'admin' },
    { id: '2', grupo_id: '7', usuario_id: '2', rol: 'viajero' },
    { id: '3', grupo_id: '7', usuario_id: '3', rol: 'viajero' },
  ],
  usuarios: [
    { id_usuario: '1', nombre: 'Admin', email: 'admin@test.com' },
    { id_usuario: '2', nombre: 'Ana', email: 'ana@test.com' },
    { id_usuario: '3', nombre: 'Beto', email: 'beto@test.com' },
  ],
  expenses: [],
  expense_splits: [],
  settlement_payments: [],
});

let mockDb: MockDatabase = initialDb();

const clone = (row: Row): Row => {
  if (row.usuarios) return { ...row, usuarios: { ...row.usuarios } };
  return { ...row };
};

const hydrateRelations = (tableName: string, row: Row): Row => {
  if (tableName === 'grupo_miembros') {
    return {
      ...row,
      usuarios: mockDb.usuarios.find((user) => String(user.id_usuario) === String(row.usuario_id)) ?? null,
    };
  }

  if (tableName === 'expenses') {
    return {
      ...row,
      expense_splits: mockDb.expense_splits
        .filter((split) => String(split.expense_id) === String(row.id))
        .map(clone),
    };
  }

  return row;
};

const matches = (row: Row, filters: Array<{ column: string; value: any }>) =>
  filters.every((filter) => String(row[filter.column]) === String(filter.value));

const mockCreateQuery = (tableName: string) => {
  const filters: Array<{ column: string; value: any }> = [];
  let mutationRows: Row[] | null = null;
  let deleteRequested = false;

  const table = () => {
    if (!mockDb[tableName]) mockDb[tableName] = [];
    return mockDb[tableName];
  };

  const filtered = () => table().filter((row) => matches(row, filters));
  const resultRows = () => (mutationRows ?? filtered()).map((row) => hydrateRelations(tableName, clone(row)));

  const builder: any = {
    select: jest.fn(() => builder),
    order: jest.fn(() => builder),
    eq: jest.fn((column: string, value: any) => {
      filters.push({ column, value });
      return builder;
    }),
    maybeSingle: jest.fn(async () => ({ data: resultRows()[0] ?? null, error: null })),
    single: jest.fn(async () => ({ data: resultRows()[0] ?? null, error: null })),
    insert: jest.fn((payload: Row | Row[]) => {
      const rows = (Array.isArray(payload) ? payload : [payload]).map((row, index) => ({
        id: row.id ?? String(table().length + index + 1),
        created_at: row.created_at ?? '2026-05-05T00:00:00.000Z',
        ...row,
      }));
      table().push(...rows);
      mutationRows = rows;
      return builder;
    }),
    update: jest.fn((payload: Row) => {
      const rows = filtered();
      for (const row of rows) Object.assign(row, payload);
      mutationRows = rows;
      return builder;
    }),
    delete: jest.fn(() => {
      deleteRequested = true;
      return builder;
    }),
    then: (resolve: (value: { data: Row[] | null; error: null }) => any) => {
      if (deleteRequested) {
        mockDb[tableName] = table().filter((row) => !matches(row, filters));
        return Promise.resolve({ data: null, error: null }).then(resolve);
      }
      return Promise.resolve({ data: resultRows(), error: null }).then(resolve);
    },
  };

  return builder;
};

function mockFrom(table: string) {
  return mockCreateQuery(table);
}

describe('BudgetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = initialDb();
    (getLocalUserId as jest.Mock).mockResolvedValue('1');
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => mockFrom(table));
  });

  it('createExpense: registra gasto equitativo y recalcula resumen', async () => {
    const dashboard = await BudgetService.createExpense('auth-user', '7', {
      paid_by_user_id: '1',
      amount: 900,
      description: 'Taxi aeropuerto',
      category: 'transporte',
      split_type: 'equitativa',
      member_ids: ['1', '2', '3'],
    });

    expect(dashboard.summary.committed).toBe(900);
    expect(dashboard.summary.categoryTotals.transporte).toBe(900);
    expect(mockDb.expense_splits).toHaveLength(3);
    expect(mockDb.expense_splits[0]).toMatchObject({ user_id: '1', share: 300 });
  });

  it('createExpense: registra gasto personalizado', async () => {
    await BudgetService.createExpense('auth-user', '7', {
      paid_by_user_id: '2',
      amount: 600,
      description: 'Cena',
      category: 'comida',
      split_type: 'personalizada',
      split_amounts: { '1': 100, '2': 200, '3': 300 },
    });

    expect(mockDb.expense_splits.map((split) => split.share)).toEqual([100, 200, 300]);
  });

  it('getBalances y getMinimumSettlements: calculan deuda minima', async () => {
    await BudgetService.createExpense('auth-user', '7', {
      paid_by_user_id: '1',
      amount: 900,
      description: 'Hotel',
      category: 'hospedaje',
      split_type: 'equitativa',
      member_ids: ['1', '2', '3'],
    });

    const balances = await BudgetService.getBalances('7');
    expect(balances).toMatchObject({ '1': 600, '2': -300, '3': -300 });

    const settlements = await BudgetService.getMinimumSettlements('7');
    expect(settlements).toEqual([
      { from: '2', to: '1', amount: 300 },
      { from: '3', to: '1', amount: 300 },
    ]);
  });

  it('ensureGroupMember: bloquea usuario fuera del grupo', async () => {
    (getLocalUserId as jest.Mock).mockResolvedValue('99');

    await expect(BudgetService.getBudgetDashboard('auth-user', '7'))
      .rejects
      .toMatchObject({ statusCode: 403 });
  });

  it('updateBudget: bloquea ajuste si no es admin', async () => {
    (getLocalUserId as jest.Mock).mockResolvedValue('2');

    await expect(BudgetService.updateBudget('auth-user', '7', 15000))
      .rejects
      .toMatchObject({ statusCode: 403 });
  });

  it('markSettlementPaid: deudor puede marcar pago y reduce liquidacion', async () => {
    await BudgetService.createExpense('auth-user', '7', {
      paid_by_user_id: '1',
      amount: 900,
      description: 'Hotel',
      category: 'hospedaje',
      split_type: 'equitativa',
      member_ids: ['1', '2', '3'],
    });

    (getLocalUserId as jest.Mock).mockResolvedValue('2');

    const dashboard = await BudgetService.markSettlementPaid('auth-user', '7', {
      from_user_id: '2',
      to_user_id: '1',
      amount: 300,
    });

    expect(dashboard.settlements).toEqual([
      { from: '3', to: '1', amount: 300 },
    ]);
    expect(dashboard.paymentHistory).toHaveLength(1);
  });

  it('markSettlementPaid: bloquea si no es admin ni deudor', async () => {
    await BudgetService.createExpense('auth-user', '7', {
      paid_by_user_id: '1',
      amount: 900,
      description: 'Hotel',
      category: 'hospedaje',
      split_type: 'equitativa',
      member_ids: ['1', '2', '3'],
    });

    (getLocalUserId as jest.Mock).mockResolvedValue('3');

    await expect(BudgetService.markSettlementPaid('auth-user', '7', {
      from_user_id: '2',
      to_user_id: '1',
      amount: 100,
    }))
      .rejects
      .toMatchObject({ statusCode: 403 });
  });

  it('updateExpense y deleteExpense: solo admin y reflejan cambios en resumen', async () => {
    const created = await BudgetService.createExpense('auth-user', '7', {
      paid_by_user_id: '1',
      amount: 500,
      description: 'Traslado',
      category: 'transporte',
      split_type: 'equitativa',
      member_ids: ['1', '2'],
    });

    const expenseId = created.expenses[0].id;

    await BudgetService.updateExpense('auth-user', '7', expenseId, {
      paid_by_user_id: '1',
      amount: 700,
      description: 'Traslado actualizado',
      category: 'transporte',
      split_type: 'equitativa',
      member_ids: ['1', '2'],
    });

    let dashboard = await BudgetService.getBudgetDashboard('auth-user', '7');
    expect(dashboard.summary.committed).toBe(700);
    expect(dashboard.expenses[0].description).toBe('Traslado actualizado');

    dashboard = await BudgetService.deleteExpense('auth-user', '7', expenseId);
    expect(dashboard.summary.committed).toBe(0);
    expect(dashboard.expenses).toHaveLength(0);
  });

  it('updateExpense: bloquea si no es admin', async () => {
    const created = await BudgetService.createExpense('auth-user', '7', {
      paid_by_user_id: '1',
      amount: 400,
      description: 'Taxi',
      category: 'transporte',
      split_type: 'equitativa',
      member_ids: ['1', '2'],
    });

    const expenseId = created.expenses[0].id;
    (getLocalUserId as jest.Mock).mockResolvedValue('2');

    await expect(BudgetService.updateExpense('auth-user', '7', expenseId, {
      paid_by_user_id: '2',
      amount: 450,
      description: 'Taxi edit',
      category: 'transporte',
      split_type: 'equitativa',
      member_ids: ['1', '2'],
    }))
      .rejects
      .toMatchObject({ statusCode: 403 });
  });

  it('markSettlementPaid: bloquea sobrepago de liquidacion', async () => {
    await BudgetService.createExpense('auth-user', '7', {
      paid_by_user_id: '1',
      amount: 900,
      description: 'Hotel',
      category: 'hospedaje',
      split_type: 'equitativa',
      member_ids: ['1', '2', '3'],
    });

    (getLocalUserId as jest.Mock).mockResolvedValue('2');

    await expect(BudgetService.markSettlementPaid('auth-user', '7', {
      from_user_id: '2',
      to_user_id: '1',
      amount: 500,
    }))
      .rejects
      .toMatchObject({ statusCode: 400 });
  });
});
