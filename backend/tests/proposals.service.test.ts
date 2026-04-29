/// <reference types="jest" />

import * as ProposalsService from '../src/domain/proposals/proposals.service';
import { supabase } from '../src/infrastructure/db/supabase.client';
import { getLocalUserId } from '../src/domain/groups/groups.service';

jest.mock('../src/infrastructure/db/supabase.client', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../src/domain/groups/groups.service', () => ({
  getLocalUserId: jest.fn(),
}));

const fromMock = (supabase as any).from as jest.Mock;
const getLocalUserIdMock = getLocalUserId as jest.Mock;

const buildMaybeSingleChain = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  return chain;
};

const buildInsertSingleChain = (result: { data: any; error: any }) => {
  const chain: any = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    single: jest.fn().mockResolvedValue(result),
  };
  return chain;
};

const buildSelectEqChain = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn().mockResolvedValue(result),
  };
  return chain;
};

describe('ProposalsService integrity tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLocalUserIdMock.mockResolvedValue('10');
  });

  it('castSingleVote: registra voto cuando no existe voto previo', async () => {
    const memberChain = buildMaybeSingleChain({ data: { id: 1 }, error: null });
    const proposalChain = buildMaybeSingleChain({ data: { id_propuesta: 99, grupo_id: 7 }, error: null });
    const existingVoteChain = buildMaybeSingleChain({ data: null, error: null });
    const insertVoteChain = buildInsertSingleChain({
      data: { id_voto: 500, id_propuesta: 99, id_usuario: 10, created_at: '2026-04-19T00:00:00Z' },
      error: null,
    });
    const membersCountChain = buildSelectEqChain({
      data: [{ usuario_id: 10 }, { usuario_id: 11 }, { usuario_id: 12 }],
      error: null,
    });
    const votesCountChain = buildSelectEqChain({ count: 1, error: null, data: null } as any);

    fromMock
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(proposalChain)
      .mockReturnValueOnce(existingVoteChain)
      .mockReturnValueOnce(insertVoteChain)
      .mockReturnValueOnce(membersCountChain)
      .mockReturnValueOnce(votesCountChain);

    const result = await ProposalsService.castSingleVote('auth-user', '7', '99', {});

    expect(result.message).toBe('Voto registrado correctamente');
    expect(result.vote.id_propuesta).toBe(99);
    expect(fromMock).toHaveBeenNthCalledWith(1, 'grupo_miembros');
    expect(fromMock).toHaveBeenNthCalledWith(2, 'propuestas');
    expect(fromMock).toHaveBeenNthCalledWith(3, 'voto');
    expect(fromMock).toHaveBeenNthCalledWith(4, 'voto');
    expect(fromMock).toHaveBeenNthCalledWith(5, 'grupo_miembros');
    expect(fromMock).toHaveBeenNthCalledWith(6, 'voto');
  });

  it('castSingleVote: rechaza segundo voto del mismo usuario en la misma propuesta', async () => {
    const memberChain = buildMaybeSingleChain({ data: { id: 1 }, error: null });
    const proposalChain = buildMaybeSingleChain({ data: { id_propuesta: 99, grupo_id: 7 }, error: null });
    const existingVoteChain = buildMaybeSingleChain({ data: { id_voto: 55 }, error: null });

    fromMock
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(proposalChain)
      .mockReturnValueOnce(existingVoteChain);

    await expect(ProposalsService.castSingleVote('auth-user', '7', '99', {}))
      .rejects
      .toMatchObject({ statusCode: 409, message: 'Ya emitiste tu voto para esta propuesta' });
  });

  it('getProposalVoteResults: devuelve propuestas ordenadas por popularidad', async () => {
    const memberChain = buildMaybeSingleChain({ data: { id: 1 }, error: null });

    const proposalsChain: any = {
      select: jest.fn(() => proposalsChain),
      eq: jest.fn().mockResolvedValue({
        data: [
          { id_propuesta: 1, tipo_item: 'vuelo', titulo: 'Vuelo A' },
          { id_propuesta: 2, tipo_item: 'hospedaje', titulo: 'Hotel B' },
          { id_propuesta: 3, tipo_item: 'vuelo', titulo: 'Vuelo C' },
        ],
        error: null,
      }),
    };

    const votesChain: any = {
      select: jest.fn(() => votesChain),
      in: jest.fn().mockResolvedValue({
        data: [
          { id_propuesta: 2 },
          { id_propuesta: 2 },
          { id_propuesta: 1 },
        ],
        error: null,
      }),
    };

    fromMock
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(proposalsChain)
      .mockReturnValueOnce(votesChain);

    const result = await ProposalsService.getProposalVoteResults('auth-user', '7');

    expect(result.totalVotes).toBe(3);
    expect(result.results[0]).toMatchObject({ id_propuesta: '2', votos: 2 });
    expect(result.results[1]).toMatchObject({ id_propuesta: '1', votos: 1 });
    expect(result.results[2]).toMatchObject({ id_propuesta: '3', votos: 0 });
  });

  it('createComment: valida seguridad de grupo (rechaza usuario fuera del grupo)', async () => {
    const memberChain = buildMaybeSingleChain({ data: null, error: null });

    fromMock.mockReturnValueOnce(memberChain);

    await expect(
      ProposalsService.createComment('auth-user', '7', '99', { contenido: 'Duda sobre este vuelo' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'No autorizado: no perteneces a este viaje/grupo' });
  });

  it('updateComment: impide editar comentarios de otro usuario', async () => {
    const memberChain = buildMaybeSingleChain({ data: { id: 1 }, error: null });
    const proposalChain = buildMaybeSingleChain({ data: { id_propuesta: 99, grupo_id: 7 }, error: null });
    const commentChain = buildMaybeSingleChain({
      data: { id_comentario: 777, id_propuesta: 99, id_usuario: 999 },
      error: null,
    });

    fromMock
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(proposalChain)
      .mockReturnValueOnce(commentChain);

    await expect(
      ProposalsService.updateComment('auth-user', '7', '99', '777', { contenido: 'nuevo texto' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'No puedes editar comentarios de otro usuario' });
  });
});
