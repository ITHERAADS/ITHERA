import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import * as ContextLinksService from '../src/domain/context-links/context-links.service';
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
  grupo_miembros: [
    { id: '1', grupo_id: '7', usuario_id: '1', rol: 'admin' },
  ],
  expenses: [
    { id: '10', group_id: '7', description: 'Cena centro', amount: 900, category: 'comida', expense_date: '2026-06-06' },
    { id: '11', group_id: '7', description: 'Taxi museo', amount: 250, category: 'transporte', expense_date: '2026-06-07' },
    { id: '99', group_id: '8', description: 'Gasto otro grupo', amount: 100, category: 'otro', expense_date: '2026-06-08' },
  ],
  trip_documents: [
    { id: 'doc-a', trip_id: '7', file_name: 'recibo-cena.pdf', category: 'gasto', created_at: '2026-06-06T10:00:00Z', file_size: 1000 },
    { id: 'doc-b', trip_id: '7', file_name: 'boleto-museo.pdf', category: 'actividad', created_at: '2026-06-07T10:00:00Z', file_size: 2000 },
  ],
  itinerarios: [
    { id_itinerario: '20', grupo_id: '7' },
    { id_itinerario: '21', grupo_id: '8' },
  ],
  actividades: [
    { id_actividad: '30', itinerario_id: '20', titulo: 'Museo', ubicacion: 'Centro', fecha_inicio: '2026-06-07T12:00:00Z', estado: 'confirmada' },
    { id_actividad: '31', itinerario_id: '21', titulo: 'Actividad otro grupo', ubicacion: 'Otro', fecha_inicio: '2026-06-07T12:00:00Z', estado: 'confirmada' },
  ],
  subgroup_slots: [
    { id: '40', group_id: '7' },
  ],
  subgroup_activities: [
    { id: '50', slot_id: '40', subgroup_id: '41', title: 'Playa en subgrupo', location: 'Bahia', starts_at: '2026-06-08T12:00:00Z' },
  ],
  trip_context_links: [],
});

let mockDb: MockDatabase = initialDb();

const clone = (row: Row): Row => ({ ...row });

const matches = (row: Row, filters: Array<{ column: string; value: any }>) =>
  filters.every((filter) => String(row[filter.column]) === String(filter.value));

const inMatches = (row: Row, filters: Array<{ column: string; values: any[] }>) =>
  filters.every((filter) => filter.values.map(String).includes(String(row[filter.column])));

const normalizeConflictKey = (value?: string) =>
  (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

const mockCreateQuery = (tableName: string) => {
  const filters: Array<{ column: string; value: any }> = [];
  const inFilters: Array<{ column: string; values: any[] }> = [];
  let mutationRows: Row[] | null = null;
  let deleteRequested = false;

  const table = () => {
    if (!mockDb[tableName]) mockDb[tableName] = [];
    return mockDb[tableName];
  };

  const filtered = () => table().filter((row) => matches(row, filters) && inMatches(row, inFilters));
  const resultRows = () => (mutationRows ?? filtered()).map(clone);

  const builder: any = {
    select: jest.fn(() => builder),
    order: jest.fn(() => builder),
    eq: jest.fn((column: string, value: any) => {
      filters.push({ column, value });
      return builder;
    }),
    in: jest.fn((column: string, values: any[]) => {
      inFilters.push({ column, values });
      return builder;
    }),
    maybeSingle: jest.fn(async () => ({ data: resultRows()[0] ?? null, error: null })),
    single: jest.fn(async () => ({ data: resultRows()[0] ?? null, error: null })),
    upsert: jest.fn((payload: Row, options?: { onConflict?: string }) => {
      const conflictColumns = normalizeConflictKey(options?.onConflict);
      const existing = conflictColumns.length > 0
        ? table().find((row) => conflictColumns.every((column) => String(row[column]) === String(payload[column])))
        : null;

      if (existing) {
        Object.assign(existing, payload);
        mutationRows = [existing];
      } else {
        const row = {
          id: payload.id ?? String(table().length + 1),
          created_at: payload.created_at ?? '2026-06-10T00:00:00.000Z',
          ...payload,
        };
        table().push(row);
        mutationRows = [row];
      }
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

describe('ContextLinksService integration trajectories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = initialDb();
    (getLocalUserId as jest.MockedFunction<typeof getLocalUserId>).mockResolvedValue('1');
    (supabaseAdmin.from as jest.MockedFunction<typeof supabaseAdmin.from>)
      .mockImplementation(((table: string) => mockFrom(table)) as any);
  });

  it('expense -> activity is visible from both expense and activity', async () => {
    const link = await ContextLinksService.createContextLink('auth-user', '7', {
      source: { type: 'expense', id: '10' },
      target: { type: 'activity', id: '30' },
    });

    expect(link.entityA.type).toBe('activity');
    expect(link.entityB.type).toBe('expense');

    const fromExpense = await ContextLinksService.listContextLinks('auth-user', '7', { type: 'expense', id: '10' });
    const fromActivity = await ContextLinksService.listContextLinks('auth-user', '7', { type: 'activity', id: '30' });

    expect(fromExpense).toHaveLength(1);
    expect(fromActivity).toHaveLength(1);
    expect(fromExpense[0].entityA.label).toBe('Museo');
    expect(fromActivity[0].entityB.label).toBe('Cena centro');
  });

  it('document can be linked to multiple expenses and activities without duplicate pairs', async () => {
    await ContextLinksService.createContextLink('auth-user', '7', {
      source: { type: 'document', id: 'doc-a' },
      target: { type: 'expense', id: '10' },
    });
    await ContextLinksService.createContextLink('auth-user', '7', {
      source: { type: 'document', id: 'doc-a' },
      target: { type: 'expense', id: '11' },
    });
    await ContextLinksService.createContextLink('auth-user', '7', {
      source: { type: 'activity', id: '30' },
      target: { type: 'document', id: 'doc-a' },
    });
    await ContextLinksService.createContextLink('auth-user', '7', {
      source: { type: 'expense', id: '10' },
      target: { type: 'document', id: 'doc-a' },
    });

    const fromDocument = await ContextLinksService.listContextLinks('auth-user', '7', { type: 'document', id: 'doc-a' });
    const labels = fromDocument.flatMap((link) => [link.entityA.label, link.entityB.label]);

    expect(fromDocument).toHaveLength(3);
    expect(labels).toEqual(expect.arrayContaining(['Cena centro', 'Taxi museo', 'Museo', 'recibo-cena.pdf']));
    expect(mockDb.trip_context_links).toHaveLength(3);
  });

  it('subgroup activity can link to expense and document', async () => {
    await ContextLinksService.createContextLink('auth-user', '7', {
      source: { type: 'subgroup_activity', id: '50' },
      target: { type: 'expense', id: '10' },
    });
    await ContextLinksService.createContextLink('auth-user', '7', {
      source: { type: 'subgroup_activity', id: '50' },
      target: { type: 'document', id: 'doc-b' },
    });

    const links = await ContextLinksService.listContextLinks('auth-user', '7', {
      type: 'subgroup_activity',
      id: '50',
    });

    expect(links).toHaveLength(2);
    expect(links.map((link) => [link.entityA.label, link.entityB.label]).flat())
      .toEqual(expect.arrayContaining(['Playa en subgrupo', 'Cena centro', 'boleto-museo.pdf']));
  });

  it('rejects linking an entity from another group', async () => {
    await expect(ContextLinksService.createContextLink('auth-user', '7', {
      source: { type: 'activity', id: '31' },
      target: { type: 'expense', id: '10' },
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deletes a relationship from all directions', async () => {
    const link = await ContextLinksService.createContextLink('auth-user', '7', {
      source: { type: 'document', id: 'doc-a' },
      target: { type: 'activity', id: '30' },
    });

    await ContextLinksService.deleteContextLink('auth-user', '7', link.id);

    const fromDocument = await ContextLinksService.listContextLinks('auth-user', '7', { type: 'document', id: 'doc-a' });
    const fromActivity = await ContextLinksService.listContextLinks('auth-user', '7', { type: 'activity', id: '30' });

    expect(fromDocument).toHaveLength(0);
    expect(fromActivity).toHaveLength(0);
  });
});
