import { supabase } from '../../infrastructure/db/supabase.client';
import { emitProposalVoteUpdated } from '../../infrastructure/sockets/socket.gateway';
import { getLocalUserId } from '../groups/groups.service';
import {
  CreateCommentPayload,
  UpdateCommentPayload,
  VoteSummaryResponse,
} from './votesComments.entity';
import * as NotificationsService from '../notifications/notifications.service';

const assertProposalAccess = async (proposalId: number, authUserId: string) => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data: proposal, error: proposalError } = await supabase
    .from('propuestas')
    .select('id_propuesta, grupo_id, titulo')
    .eq('id_propuesta', proposalId)
    .single();

  if (proposalError || !proposal) {
    throw Object.assign(new Error('Propuesta no encontrada'), { statusCode: 404 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from('grupo_miembros')
    .select('id, rol')
    .eq('grupo_id', proposal.grupo_id)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership) {
    throw Object.assign(new Error('No tienes acceso a esta propuesta'), { statusCode: 403 });
  }

  return { usuarioId, proposal };
};

const getGroupVoteRanking = async (groupId: number) => {
  const { data: proposals, error: proposalsError } = await supabase
    .from('propuestas')
    .select('id_propuesta, titulo')
    .eq('grupo_id', groupId)
    .order('id_propuesta', { ascending: true });

  if (proposalsError) throw new Error(proposalsError.message);

  const ranking = await Promise.all(
    (proposals ?? []).map(async (item: { id_propuesta: number; titulo: string | null }) => {
      const { count, error: countError } = await supabase
        .from('voto')
        .select('*', { count: 'exact', head: true })
        .eq('id_propuesta', item.id_propuesta);

      if (countError) throw new Error(countError.message);

      return {
        proposalId: item.id_propuesta as number,
        titulo: (item.titulo as string | null) ?? null,
        totalVotes: count ?? 0,
      };
    }),
  );

  return ranking.sort(
    (
      a: { proposalId: number; titulo: string | null; totalVotes: number },
      b: { proposalId: number; titulo: string | null; totalVotes: number }
    ) => {
    if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
    return a.proposalId - b.proposalId;
  });
};

export const getVoteSummary = async (
  proposalId: number,
  authUserId: string,
): Promise<VoteSummaryResponse> => {
  const { usuarioId, proposal } = await assertProposalAccess(proposalId, authUserId);

  const { count: totalVotesForProposal, error: totalVotesError } = await supabase
    .from('voto')
    .select('*', { count: 'exact', head: true })
    .eq('id_propuesta', proposalId);

  if (totalVotesError) throw new Error(totalVotesError.message);

  const { data: existingVote, error: existingVoteError } = await supabase
    .from('voto')
    .select('id_propuesta')
    .eq('id_propuesta', proposalId)
    .eq('id_usuario', usuarioId)
    .maybeSingle();

  if (existingVoteError) throw new Error(existingVoteError.message);

  const ranking = await getGroupVoteRanking(proposal.grupo_id as number);

  return {
    groupId: proposal.grupo_id as number,
    proposalId,
    totalVotesForProposal: totalVotesForProposal ?? 0,
    userHasVoted: !!existingVote,
    ranking,
  };
};

export const voteProposal = async (proposalId: number, authUserId: string) => {
  const { usuarioId, proposal } = await assertProposalAccess(proposalId, authUserId);

  const { data: existingVote, error: existingVoteError } = await supabase
    .from('voto')
    .select('id_propuesta, id_usuario')
    .eq('id_propuesta', proposalId)
    .eq('id_usuario', usuarioId)
    .maybeSingle();

  if (existingVoteError) throw new Error(existingVoteError.message);
  if (existingVote) {
    throw Object.assign(new Error('Ya votaste por esta propuesta'), { statusCode: 409 });
  }

  const { error: insertError } = await supabase
    .from('voto')
    .insert({
      id_propuesta: proposalId,
      id_usuario: usuarioId,
    });

  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      throw Object.assign(new Error('Ya votaste por esta propuesta'), { statusCode: 409 });
    }

    throw new Error(insertError.message);
  }

  const summary = await getVoteSummary(proposalId, authUserId);

  emitProposalVoteUpdated({
    groupId: summary.groupId,
    proposalId: summary.proposalId,
    totalVotesForProposal: summary.totalVotesForProposal,
    ranking: summary.ranking,
  });

  return summary;
};

export const listCommentsByProposal = async (proposalId: number, authUserId: string) => {
  await assertProposalAccess(proposalId, authUserId);

  const { data, error } = await supabase
    .from('comentario')
    .select(`
      id_comentario,
      id_propuesta,
      id_usuario,
      contenido,
      created_at,
      updated_at,
      usuarios ( id_usuario, nombre, email )
    `)
    .eq('id_propuesta', proposalId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
};

export const createComment = async (
  proposalId: number,
  authUserId: string,
  payload: CreateCommentPayload,
) => {
  const { usuarioId } = await assertProposalAccess(proposalId, authUserId);

  const { data, error } = await supabase
    .from('comentario')
    .insert({
      id_propuesta: proposalId,
      id_usuario: usuarioId,
      contenido: payload.contenido.trim(),
    })
    .select(`
      id_comentario,
      id_propuesta,
      id_usuario,
      contenido,
      created_at,
      updated_at,
      usuarios ( id_usuario, nombre, email )
    `)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo crear el comentario');
  }

  // Notificar al creador de la propuesta
  const { proposal } = await assertProposalAccess(proposalId, authUserId);
  
  const { data: proposalAuthorData } = await supabase.from('propuestas').select('creado_por').eq('id_propuesta', proposalId).single();
  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  if (proposalAuthorData && String(proposalAuthorData.creado_por) !== String(usuarioId)) {
    await NotificationsService.createNotification({
      usuarioId: Number(proposalAuthorData.creado_por),
      grupoId: Number(proposal.grupo_id),
      tipo: 'comentario_nuevo',
      titulo: 'Nuevo comentario',
      mensaje: `${actorName} comentó en tu propuesta "${proposal.titulo}".`,
      entidadTipo: 'propuesta',
      entidadId: Number(proposalId),
      metadata: {
        actorName,
        actorUsuarioId: Number(usuarioId),
        itemTitle: proposal.titulo,
        itemType: 'propuesta',
        commentPreview: payload.contenido.trim().slice(0, 120),
      },
    });
  }

  NotificationsService.emitGroupDashboardUpdated(Number(proposal.grupo_id), {
    tipo: 'comentario_nuevo',
    entidadTipo: 'propuesta',
    entidadId: Number(proposalId),
    actorUsuarioId: Number(usuarioId),
    metadata: { actorName, commentPreview: payload.contenido.trim().slice(0, 120) },
  });

  return data;
};

export const updateComment = async (
  proposalId: number,
  commentId: number,
  authUserId: string,
  payload: UpdateCommentPayload,
) => {
  const { usuarioId } = await assertProposalAccess(proposalId, authUserId);

  const { data: existingComment, error: existingError } = await supabase
    .from('comentario')
    .select('id_comentario, id_usuario, id_propuesta')
    .eq('id_comentario', commentId)
    .eq('id_propuesta', proposalId)
    .single();

  if (existingError || !existingComment) {
    throw Object.assign(new Error('Comentario no encontrado'), { statusCode: 404 });
  }

  if (String(existingComment.id_usuario) !== String(usuarioId)) {
    throw Object.assign(new Error('No puedes editar un comentario de otro usuario'), { statusCode: 403 });
  }

  const { data, error } = await supabase
    .from('comentario')
    .update({
      contenido: payload.contenido.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id_comentario', commentId)
    .eq('id_propuesta', proposalId)
    .select(`
      id_comentario,
      id_propuesta,
      id_usuario,
      contenido,
      created_at,
      updated_at,
      usuarios ( id_usuario, nombre, email )
    `)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo actualizar el comentario');
  }

  const { proposal } = await assertProposalAccess(proposalId, authUserId);
  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  NotificationsService.emitGroupDashboardUpdated(Number(proposal.grupo_id), {
    tipo: 'comentario_actualizado',
    entidadTipo: 'propuesta',
    entidadId: Number(proposalId),
    actorUsuarioId: Number(usuarioId),
    metadata: {
      actorName,
      actorUsuarioId: Number(usuarioId),
      commentId: Number(commentId),
      commentPreview: payload.contenido.trim().slice(0, 120),
    },
  });

  return data;
};

export const deleteComment = async (
  proposalId: number,
  commentId: number,
  authUserId: string,
) => {
  const { usuarioId } = await assertProposalAccess(proposalId, authUserId);

  const { data: existingComment, error: existingError } = await supabase
    .from('comentario')
    .select('id_comentario, id_usuario, id_propuesta')
    .eq('id_comentario', commentId)
    .eq('id_propuesta', proposalId)
    .single();

  if (existingError || !existingComment) {
    throw Object.assign(new Error('Comentario no encontrado'), { statusCode: 404 });
  }

  if (String(existingComment.id_usuario) !== String(usuarioId)) {
    throw Object.assign(new Error('No puedes eliminar un comentario de otro usuario'), { statusCode: 403 });
  }

  const { error } = await supabase
    .from('comentario')
    .delete()
    .eq('id_comentario', commentId)
    .eq('id_propuesta', proposalId);

  if (error) throw new Error(error.message);

  const { proposal } = await assertProposalAccess(proposalId, authUserId);
  const actorName = await NotificationsService.getUserDisplayName(usuarioId);
  NotificationsService.emitGroupDashboardUpdated(Number(proposal.grupo_id), {
    tipo: 'comentario_eliminado',
    entidadTipo: 'propuesta',
    entidadId: Number(proposalId),
    actorUsuarioId: Number(usuarioId),
    metadata: {
      actorName,
      actorUsuarioId: Number(usuarioId),
      commentId: Number(commentId),
    },
  });

  return true;
};
