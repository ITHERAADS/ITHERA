import * as ProposalsService from '../src/domain/proposals/proposals.service';
import { supabase } from '../src/infrastructure/db/supabase.client';
import { getLocalUserId } from '../src/domain/groups/groups.service';

jest.mock('../src/infrastructure/db/supabase.client', () => ({
  supabase: {
    from: jest.fn((table: string) => mockFrom(table)),
  },
}));

jest.mock('../src/domain/groups/groups.service', () => ({
  getLocalUserId: jest.fn(),
}));

jest.mock('../src/domain/notifications/notifications.service', () => ({
  getUserDisplayName: jest.fn().mockResolvedValue('Usuario prueba'),
  createNotification: jest.fn().mockResolvedValue(undefined),
  createNotificationForGroupMembers: jest.fn().mockResolvedValue(undefined),
  emitGroupDashboardUpdated: jest.fn(),
}));

type TableName = 'grupo_miembros' | 'propuestas' | 'voto' | 'comentario' | 'usuarios' | string;
type Row = Record<string, any>;

type MockDatabase = Record<TableName, Row[]>;

const mockInitialDatabase = (): MockDatabase => ({
  grupo_miembros: [
    { id: '1', grupo_id: '7', usuario_id: '1', rol: 'miembro' },
    { id: '2', grupo_id: '7', usuario_id: '2', rol: 'miembro' },
    { id: '3', grupo_id: '7', usuario_id: '3', rol: 'miembro' },
  ],
  propuestas: [
    {
      id_propuesta: '1',
      grupo_id: '7',
      tipo_item: 'vuelo',
      titulo: 'Propuesta 1',
      estado: 'en_votacion',
      creado_por: '2',
      payload: null,
    },
    {
      id_propuesta: '2',
      grupo_id: '7',
      tipo_item: 'hospedaje',
      titulo: 'Propuesta 2',
      estado: 'en_votacion',
      creado_por: '2',
      payload: null,
    },
    {
      id_propuesta: '3',
      grupo_id: '7',
      tipo_item: 'vuelo',
      titulo: 'Propuesta 3',
      estado: 'en_votacion',
      creado_por: '2',
      payload: null,
    },
    {
      id_propuesta: '99',
      grupo_id: '7',
      tipo_item: 'vuelo',
      titulo: 'Propuesta de prueba',
      estado: 'en_votacion',
      creado_por: '2',
      payload: null,
    },
  ],
  voto: [
    { id_voto: '1', id_propuesta: '1', id_usuario: '2', voto_tipo: 'a_favor', created_at: '2026-05-04T00:00:00.000Z' },
    { id_voto: '2', id_propuesta: '2', id_usuario: '2', voto_tipo: 'a_favor', created_at: '2026-05-04T00:00:00.000Z' },
    { id_voto: '3', id_propuesta: '2', id_usuario: '3', voto_tipo: 'a_favor', created_at: '2026-05-04T00:00:00.000Z' },
  ],
  comentario: [
    {
      id_comentario: '777',
      id_propuesta: '99',
      id_usuario: '2',
      contenido: 'Comentario de otro usuario',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-04T00:00:00.000Z',
    },
  ],
  usuarios: [
    { id_usuario: '1', nombre: 'Usuario prueba' },
    { id_usuario: '2', nombre: 'Otro usuario' },
    { id_usuario: '3', nombre: 'Tercer usuario' },
  ],
  actividades: [],
});

let mockDb: MockDatabase = mockInitialDatabase();

const mockCloneRow = (row: Row): Row => ({ ...row });

const mockSelectColumns = (rows: Row[], selectedColumns: string | undefined): Row[] => {
  if (!selectedColumns || selectedColumns.trim() === '*' || selectedColumns.includes('count')) {
    return rows.map(mockCloneRow);
  }

  const columns = selectedColumns
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);

  return rows.map((row) => {
    const selected: Row = {};
    for (const column of columns) {
      if (column in row) selected[column] = row[column];
    }
    return selected;
  });
};

const mockMatchesFilter = (row: Row, filter: { type: 'eq' | 'in'; column: string; value: any }) => {
  if (filter.type === 'eq') {
    return String(row[filter.column]) === String(filter.value);
  }

  const values = Array.isArray(filter.value) ? filter.value.map(String) : [];
  return values.includes(String(row[filter.column]));
};

const mockCreateQueryBuilder = (tableName: string) => {
  const filters: Array<{ type: 'eq' | 'in'; column: string; value: any }> = [];
  let selectedColumns: string | undefined;
  let mutationData: Row | Row[] | null = null;
  let deleteRequested = false;

  const getTable = () => {
    if (!mockDb[tableName]) mockDb[tableName] = [];
    return mockDb[tableName];
  };

  const getFilteredRows = () => {
    return getTable().filter((row) => filters.every((filter) => mockMatchesFilter(row, filter)));
  };

  const getResultRows = () => {
    const baseRows = mutationData
      ? Array.isArray(mutationData)
        ? mutationData
        : [mutationData]
      : getFilteredRows();

    return mockSelectColumns(baseRows, selectedColumns);
  };

  const builder: any = {
    select: jest.fn((columns?: string) => {
      selectedColumns = columns;
      return builder;
    }),

    eq: jest.fn((column: string, value: any) => {
      filters.push({ type: 'eq', column, value });
      return builder;
    }),

    in: jest.fn((column: string, values: any[]) => {
      filters.push({ type: 'in', column, value: values });
      return builder;
    }),

    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),

    maybeSingle: jest.fn(async () => ({
      data: getResultRows()[0] ?? null,
      error: null,
    })),

    single: jest.fn(async () => ({
      data: getResultRows()[0] ?? null,
      error: null,
    })),

    insert: jest.fn((payload: Row | Row[]) => {
      const rows = Array.isArray(payload) ? payload : [payload];

      const insertedRows = rows.map((row, index) => {
        if (tableName === 'voto') {
          return {
            id_voto: row.id_voto ?? String(getTable().length + index + 1),
            created_at: row.created_at ?? '2026-05-04T00:00:00.000Z',
            ...row,
          };
        }

        if (tableName === 'comentario') {
          return {
            id_comentario: row.id_comentario ?? String(getTable().length + index + 1),
            created_at: row.created_at ?? '2026-05-04T00:00:00.000Z',
            updated_at: row.updated_at ?? '2026-05-04T00:00:00.000Z',
            ...row,
          };
        }

        return { ...row };
      });

      getTable().push(...insertedRows);
      mutationData = Array.isArray(payload) ? insertedRows : insertedRows[0];
      return builder;
    }),

    update: jest.fn((payload: Row) => {
      const updatedRows = getFilteredRows().map((row) => {
        Object.assign(row, payload);
        return row;
      });
      mutationData = updatedRows;
      return builder;
    }),

    delete: jest.fn(() => {
      deleteRequested = true;
      return builder;
    }),

    then: (resolve: (value: { data: Row[] | null; error: null }) => any) => {
      if (deleteRequested) {
        const table = getTable();
        const remainingRows = table.filter((row) => !filters.every((filter) => mockMatchesFilter(row, filter)));
        mockDb[tableName] = remainingRows;
        return Promise.resolve({ data: null, error: null }).then(resolve);
      }

      return Promise.resolve({ data: getResultRows(), error: null }).then(resolve);
    },
  };

  return builder;
};

function mockFrom(table: string) {
  return mockCreateQueryBuilder(table);
}

describe('ProposalsService integrity tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = mockInitialDatabase();
    (getLocalUserId as jest.Mock).mockResolvedValue('1');
    (supabase.from as jest.Mock).mockImplementation((table: string) => mockFrom(table));
  });

  it('castSingleVote: registra voto cuando no existe voto previo', async () => {
    mockDb.voto = mockDb.voto.filter((vote) => String(vote.id_propuesta) !== '99');

    const result = await ProposalsService.castSingleVote('auth-user', '7', '99', { voto: 'a_favor' });

    expect(result).toMatchObject({
      message: 'Voto registrado correctamente',
      approved: false,
      rejected: false,
      votesFor: 1,
      votesRequired: 2,
    });
    expect(result.vote).toMatchObject({
      id_propuesta: '99',
      id_usuario: '1',
      voto_tipo: 'a_favor',
    });
  });

  it('castSingleVote: rechaza segundo voto del mismo usuario en la misma propuesta', async () => {
    mockDb.voto.push({
      id_voto: '99',
      id_propuesta: '99',
      id_usuario: '1',
      voto_tipo: 'a_favor',
      created_at: '2026-05-04T00:00:00.000Z',
    });

    await expect(ProposalsService.castSingleVote('auth-user', '7', '99', {}))
      .rejects
      .toMatchObject({ statusCode: 409, message: 'Ya emitiste tu voto para esta propuesta' });
  });

  it('getProposalVoteResults: devuelve propuestas ordenadas por popularidad', async () => {
    const result = await ProposalsService.getProposalVoteResults('auth-user', '7');

    expect(result.totalVotes).toBe(3);
    expect(result.results[0]).toMatchObject({ id_propuesta: '2', votos: 2 });
    expect(result.results[1]).toMatchObject({ id_propuesta: '1', votos: 1 });
    expect(result.results[2]).toMatchObject({ id_propuesta: '3', votos: 0 });
  });

  it('createComment: valida seguridad de grupo (rechaza usuario fuera del grupo)', async () => {
    mockDb.grupo_miembros = mockDb.grupo_miembros.filter((member) => String(member.usuario_id) !== '1');

    await expect(
      ProposalsService.createComment('auth-user', '7', '99', { contenido: 'Duda sobre este vuelo' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'No autorizado: no perteneces a este viaje/grupo' });
  });

  it('updateComment: impide editar comentarios de otro usuario', async () => {
    await expect(
      ProposalsService.updateComment('auth-user', '7', '99', '777', { contenido: 'nuevo texto' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'No puedes editar comentarios de otro usuario' });
  });
});
