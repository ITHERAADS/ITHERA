import { supabase } from '../../infrastructure/db/supabase.client';
import { getLocalUserId } from '../groups/groups.service';
import {
  SaveFlightProposalPayload,
  SaveHotelProposalPayload,
  UpdateProposalPayload,
  CreateCommentPayload,
  CreateVotePayload,
  ProposalVoteResult,
  UpdateCommentPayload,
} from './proposals.entity';

const isPresent = (value: unknown): boolean => value !== undefined;

const buildProposalResponse = async (proposalId: number) => {
  const { data: proposal, error } = await supabase
    .from('propuestas')
    .select('*')
    .eq('id_propuesta', proposalId)
    .single();

  if (error || !proposal) {
    throw Object.assign(new Error('Propuesta no encontrada'), { statusCode: 404 });
  }

  let detalle: Record<string, unknown> | null = null;

  if (proposal.tipo_item === 'vuelo') {
    const { data } = await supabase
      .from('vuelos')
      .select('*')
      .eq('propuesta_id', proposalId)
      .single();
    detalle = (data as Record<string, unknown> | null) ?? null;
  }

  if (proposal.tipo_item === 'hospedaje') {
    const { data } = await supabase
      .from('hospedajes')
      .select('*')
      .eq('propuesta_id', proposalId)
      .single();
    detalle = (data as Record<string, unknown> | null) ?? null;
  }

  return {
    ...proposal,
    detalle,
  };
};

const assertGroupMembership = async (grupoId: string, authUserId: string) => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data: membership, error } = await supabase
    .from('grupo_miembros')
    .select('id, grupo_id, usuario_id, rol')
    .eq('grupo_id', grupoId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!membership) {
    throw Object.assign(new Error('No tienes acceso a este grupo'), { statusCode: 403 });
  }

  return { usuarioId, membership };
};

const assertProposalAccess = async (proposalId: number, authUserId: string) => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data: proposal, error } = await supabase
    .from('propuestas')
    .select('*')
    .eq('id_propuesta', proposalId)
    .single();

  if (error || !proposal) {
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

  return { usuarioId, proposal, membership };
};

export const createFlightProposal = async (authUserId: string, payload: SaveFlightProposalPayload) => {
  const { usuarioId } = await assertGroupMembership(payload.grupoId, authUserId);

  const { data: proposal, error: proposalError } = await supabase
    .from('propuestas')
    .insert({
      grupo_id: payload.grupoId,
      tipo_item: 'vuelo',
      titulo: payload.titulo,
      descripcion: payload.descripcion ?? null,
      referencia_externa: payload.vuelo.numeroVuelo ?? null,
      fuente: payload.fuente,
      payload: payload.payload ?? null,
      estado: 'guardada',
      creado_por: usuarioId,
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: null,
    })
    .select('*')
    .single();

  if (proposalError || !proposal) {
    throw new Error(proposalError?.message ?? 'No se pudo guardar la propuesta de vuelo');
  }

  const { error: flightError } = await supabase
    .from('vuelos')
    .insert({
      propuesta_id: proposal.id_propuesta,
      aerolinea: payload.vuelo.aerolinea,
      numero_vuelo: payload.vuelo.numeroVuelo ?? null,
      origen_codigo: payload.vuelo.origenCodigo,
      origen_nombre: payload.vuelo.origenNombre ?? null,
      destino_codigo: payload.vuelo.destinoCodigo,
      destino_nombre: payload.vuelo.destinoNombre ?? null,
      salida: payload.vuelo.salida,
      llegada: payload.vuelo.llegada,
      duracion: payload.vuelo.duracion ?? null,
      precio: payload.vuelo.precio,
      moneda: payload.vuelo.moneda,
      escalas: payload.vuelo.escalas ?? 0,
      payload: payload.vuelo.payload ?? null,
    });

  if (flightError) {
    await supabase.from('propuestas').delete().eq('id_propuesta', proposal.id_propuesta);
    throw new Error(flightError.message);
  }

  return buildProposalResponse(proposal.id_propuesta);
};

export const createHotelProposal = async (authUserId: string, payload: SaveHotelProposalPayload) => {
  const { usuarioId } = await assertGroupMembership(payload.grupoId, authUserId);

  const { data: proposal, error: proposalError } = await supabase
    .from('propuestas')
    .insert({
      grupo_id: payload.grupoId,
      tipo_item: 'hospedaje',
      titulo: payload.titulo,
      descripcion: payload.descripcion ?? null,
      referencia_externa: payload.hospedaje.referenciaExterna ?? null,
      fuente: payload.fuente,
      payload: payload.payload ?? null,
      estado: 'guardada',
      creado_por: usuarioId,
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: null,
    })
    .select('*')
    .single();

  if (proposalError || !proposal) {
    throw new Error(proposalError?.message ?? 'No se pudo guardar la propuesta de hospedaje');
  }

  const { error: hotelError } = await supabase
    .from('hospedajes')
    .insert({
      propuesta_id: proposal.id_propuesta,
      nombre: payload.hospedaje.nombre,
      proveedor: payload.hospedaje.proveedor ?? null,
      referencia_externa: payload.hospedaje.referenciaExterna ?? null,
      direccion: payload.hospedaje.direccion ?? null,
      latitud: payload.hospedaje.latitud ?? null,
      longitud: payload.hospedaje.longitud ?? null,
      check_in: payload.hospedaje.checkIn ?? null,
      check_out: payload.hospedaje.checkOut ?? null,
      precio_total: payload.hospedaje.precioTotal ?? null,
      moneda: payload.hospedaje.moneda ?? null,
      calificacion: payload.hospedaje.calificacion ?? null,
      payload: payload.hospedaje.payload ?? null,
    });

  if (hotelError) {
    await supabase.from('propuestas').delete().eq('id_propuesta', proposal.id_propuesta);
    throw new Error(hotelError.message);
  }

  return buildProposalResponse(proposal.id_propuesta);
};

export const listGroupProposals = async (groupId: string, authUserId: string) => {
  await assertGroupMembership(groupId, authUserId);

  const { data: proposals, error } = await supabase
    .from('propuestas')
    .select('*')
    .eq('grupo_id', groupId)
    .order('id_propuesta', { ascending: false });

  if (error) throw new Error(error.message);

  const enriched = await Promise.all(
    (proposals ?? []).map((item: { id_propuesta: number }) =>
      buildProposalResponse(item.id_propuesta)
    )
  );
  return enriched;
};

export const getProposalById = async (proposalId: number, authUserId: string) => {
  await assertProposalAccess(proposalId, authUserId);
  return buildProposalResponse(proposalId);
};

export const updateProposal = async (proposalId: number, authUserId: string, payload: UpdateProposalPayload) => {
  const { proposal } = await assertProposalAccess(proposalId, authUserId);

  if (payload.updatedAt && proposal.ultima_actualizacion) {
    const dbDate = new Date(proposal.ultima_actualizacion).getTime();
    const payloadDate = new Date(payload.updatedAt).getTime();
    
    if (Number.isNaN(payloadDate)) {
      const err = new Error('Invalid updatedAt timestamp.') as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }
    if (Number.isNaN(dbDate)) {
      const err = new Error('Invalid proposal update timestamp in storage.') as Error & { statusCode: number };
      err.statusCode = 500;
      throw err;
    }
    
    if (payloadDate < dbDate) {
      const err = new Error('Conflict: The entity has been modified. Refresh and try again.') as Error & { statusCode: number };
      err.statusCode = 409;
      throw err;
    }
  }

  const proposalPatch: Record<string, unknown> = {
    ultima_actualizacion: new Date().toISOString(),
  };

  if (isPresent(payload.titulo)) proposalPatch.titulo = payload.titulo;
  if (isPresent(payload.descripcion)) proposalPatch.descripcion = payload.descripcion ?? null;
  if (isPresent(payload.estado)) proposalPatch.estado = payload.estado;
  if (isPresent(payload.payload)) proposalPatch.payload = payload.payload ?? null;

  if (Object.keys(proposalPatch).length > 1) {
    const { error } = await supabase
      .from('propuestas')
      .update(proposalPatch)
      .eq('id_propuesta', proposalId);

    if (error) throw new Error(error.message);
  }

  if (payload.detalle && Object.keys(payload.detalle).length > 0) {
    if (proposal.tipo_item === 'vuelo') {
      const flightPatch: Record<string, unknown> = {
        ultima_actualizacion: new Date().toISOString(),
      };

      if (isPresent(payload.detalle.aerolinea)) flightPatch.aerolinea = payload.detalle.aerolinea;
      if (isPresent(payload.detalle.numeroVuelo)) flightPatch.numero_vuelo = payload.detalle.numeroVuelo ?? null;
      if (isPresent(payload.detalle.origenCodigo)) flightPatch.origen_codigo = payload.detalle.origenCodigo;
      if (isPresent(payload.detalle.origenNombre)) flightPatch.origen_nombre = payload.detalle.origenNombre ?? null;
      if (isPresent(payload.detalle.destinoCodigo)) flightPatch.destino_codigo = payload.detalle.destinoCodigo;
      if (isPresent(payload.detalle.destinoNombre)) flightPatch.destino_nombre = payload.detalle.destinoNombre ?? null;
      if (isPresent(payload.detalle.salida)) flightPatch.salida = payload.detalle.salida;
      if (isPresent(payload.detalle.llegada)) flightPatch.llegada = payload.detalle.llegada;
      if (isPresent(payload.detalle.duracion)) flightPatch.duracion = payload.detalle.duracion ?? null;
      if (isPresent(payload.detalle.precio)) flightPatch.precio = payload.detalle.precio;
      if (isPresent(payload.detalle.moneda)) flightPatch.moneda = payload.detalle.moneda;
      if (isPresent(payload.detalle.escalas)) flightPatch.escalas = payload.detalle.escalas;
      if (isPresent(payload.detalle.payload)) flightPatch.payload = payload.detalle.payload ?? null;

      const { error } = await supabase
        .from('vuelos')
        .update(flightPatch)
        .eq('propuesta_id', proposalId);

      if (error) throw new Error(error.message);

      if (isPresent(payload.detalle.numeroVuelo)) {
        const { error: proposalRefError } = await supabase
          .from('propuestas')
          .update({ referencia_externa: payload.detalle.numeroVuelo ?? null, ultima_actualizacion: new Date().toISOString() })
          .eq('id_propuesta', proposalId);

        if (proposalRefError) throw new Error(proposalRefError.message);
      }
    }

    if (proposal.tipo_item === 'hospedaje') {
      const hotelPatch: Record<string, unknown> = {
        ultima_actualizacion: new Date().toISOString(),
      };

      if (isPresent(payload.detalle.nombre)) hotelPatch.nombre = payload.detalle.nombre;
      if (isPresent(payload.detalle.proveedor)) hotelPatch.proveedor = payload.detalle.proveedor ?? null;
      if (isPresent(payload.detalle.referenciaExterna)) hotelPatch.referencia_externa = payload.detalle.referenciaExterna ?? null;
      if (isPresent(payload.detalle.direccion)) hotelPatch.direccion = payload.detalle.direccion ?? null;
      if (isPresent(payload.detalle.latitud)) hotelPatch.latitud = payload.detalle.latitud;
      if (isPresent(payload.detalle.longitud)) hotelPatch.longitud = payload.detalle.longitud;
      if (isPresent(payload.detalle.checkIn)) hotelPatch.check_in = payload.detalle.checkIn ?? null;
      if (isPresent(payload.detalle.checkOut)) hotelPatch.check_out = payload.detalle.checkOut ?? null;
      if (isPresent(payload.detalle.precioTotal)) hotelPatch.precio_total = payload.detalle.precioTotal;
      if (isPresent(payload.detalle.moneda)) hotelPatch.moneda = payload.detalle.moneda;
      if (isPresent(payload.detalle.calificacion)) hotelPatch.calificacion = payload.detalle.calificacion;
      if (isPresent(payload.detalle.payload)) hotelPatch.payload = payload.detalle.payload ?? null;

      const { error } = await supabase
        .from('hospedajes')
        .update(hotelPatch)
        .eq('propuesta_id', proposalId);

      if (error) throw new Error(error.message);

      if (isPresent(payload.detalle.referenciaExterna)) {
        const { error: proposalRefError } = await supabase
          .from('propuestas')
          .update({ referencia_externa: payload.detalle.referenciaExterna ?? null, ultima_actualizacion: new Date().toISOString() })
          .eq('id_propuesta', proposalId);

        if (proposalRefError) throw new Error(proposalRefError.message);
      }
    }
  }

  return buildProposalResponse(proposalId);
};

export const deleteProposal = async (proposalId: number, authUserId: string) => {
  const { proposal } = await assertProposalAccess(proposalId, authUserId);

  const { error: voteError } = await supabase.from('voto').delete().eq('id_propuesta', proposalId);
  if (voteError) throw new Error(voteError.message);

  const { error: commentError } = await supabase.from('comentario').delete().eq('id_propuesta', proposalId);
  if (commentError) throw new Error(commentError.message);

  if (proposal.tipo_item === 'vuelo') {
    const { error } = await supabase.from('vuelos').delete().eq('propuesta_id', proposalId);
    if (error) throw new Error(error.message);
  }

  if (proposal.tipo_item === 'hospedaje') {
    const { error } = await supabase.from('hospedajes').delete().eq('propuesta_id', proposalId);
    if (error) throw new Error(error.message);
  }

  if (proposal.tipo_item === 'actividad') {
    const { error } = await supabase.from('actividades').delete().eq('propuesta_id', proposalId);
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase.from('propuestas').delete().eq('id_propuesta', proposalId);
  if (error) throw new Error(error.message);

  return true;
};
type ServiceError = Error & { statusCode?: number };

const createError = (message: string, statusCode: number): ServiceError => {
	const err = new Error(message) as ServiceError;
	err.statusCode = statusCode;
	return err;
};

type RawCommentRow = {
	id_comentario: string | number;
	id_propuesta: string | number;
	id_usuario: string | number;
	contenido: string;
	created_at: string;
	updated_at: string;
};

const attachCommentAuthorNames = async (comments: RawCommentRow[]) => {
	if (comments.length === 0) return [];

	const uniqueUserIds = Array.from(new Set(comments.map((comment) => String(comment.id_usuario))));

	const { data: users, error: usersError } = await supabase
		.from('usuarios')
		.select('id_usuario, nombre')
		.in('id_usuario', uniqueUserIds);

	if (usersError) throw createError(usersError.message, 500);

	const nameByUserId = new Map(
		(users ?? []).map((user: any) => [String(user.id_usuario), String(user.nombre ?? '')])
	);

	return comments.map((comment) => ({
		...comment,
		authorName: nameByUserId.get(String(comment.id_usuario)) ?? null,
	}));
};

const ensureProposalBelongsToGroup = async (groupId: string, proposalId: string): Promise<void> => {
	const { data, error } = await supabase
		.from('propuestas')
		.select('id_propuesta, grupo_id')
		.eq('id_propuesta', proposalId)
		.eq('grupo_id', groupId)
		.maybeSingle();

	if (error) throw createError(error.message, 500);
	if (!data) throw createError('La propuesta no existe en el viaje/grupo indicado', 404);
};

const ensureUserBelongsToGroup = async (groupId: string, localUserId: string): Promise<void> => {
	const { data, error } = await supabase
		.from('grupo_miembros')
		.select('id')
		.eq('grupo_id', groupId)
		.eq('usuario_id', localUserId)
		.maybeSingle();

	if (error) throw createError(error.message, 500);
	if (!data) throw createError('No autorizado: no perteneces a este viaje/grupo', 403);
};

const getUniqueGroupMemberCount = async (groupId: string): Promise<number> => {
	const { data, error } = await supabase
		.from('grupo_miembros')
		.select('usuario_id')
		.eq('grupo_id', groupId);

	if (error) throw createError(error.message, 500);

	const unique = new Set((data ?? []).map((row: any) => String(row.usuario_id)));
	return unique.size;
};

export const castSingleVote = async (
	authUserId: string,
	groupId: string,
	proposalId: string,
	_payload: CreateVotePayload,
) => {
	const localUserId = await getLocalUserId(authUserId);
	const localUserIdStr = String(localUserId);
	await ensureUserBelongsToGroup(groupId, localUserId);
	await ensureProposalBelongsToGroup(groupId, proposalId);

	const { data: existingVote, error: existingVoteError } = await supabase
		.from('voto')
		.select('id_voto')
		.eq('id_propuesta', proposalId)
		.eq('id_usuario', localUserId)
		.maybeSingle();

	if (existingVoteError) throw createError(existingVoteError.message, 500);
	if (existingVote) {
		throw createError('Ya emitiste tu voto para esta propuesta', 409);
	}

	const { data: newVote, error: insertError } = await supabase
		.from('voto')
		.insert({ id_propuesta: proposalId, id_usuario: localUserId })
		.select('id_voto, id_propuesta, id_usuario, created_at')
		.single();

	if (insertError) throw createError(insertError.message, 500);

	const totalMembers = await getUniqueGroupMemberCount(groupId);
	const votesRequired = Math.floor(totalMembers / 2) + 1;

	const { count: totalVotesForProposal, error: totalVotesError } = await supabase
		.from('voto')
		.select('id_voto', { count: 'exact', head: true })
		.eq('id_propuesta', proposalId);

	if (totalVotesError) throw createError(totalVotesError.message, 500);

	const votesCount = totalVotesForProposal ?? 0;
	const approved = votesCount >= votesRequired;

	if (approved) {
		const { error: proposalUpdateError } = await supabase
			.from('propuestas')
			.update({
				estado: 'aprobada',
				fecha_cierre: new Date().toISOString(),
				ultima_actualizacion: new Date().toISOString(),
			})
			.eq('id_propuesta', proposalId)
			.eq('grupo_id', groupId);

		if (proposalUpdateError) throw createError(proposalUpdateError.message, 500);

		const { error: activityUpdateError } = await supabase
			.from('actividades')
			.update({
				estado: 'confirmada',
				ultima_actualizacion: new Date().toISOString(),
			})
			.eq('propuesta_id', proposalId);

		if (activityUpdateError) throw createError(activityUpdateError.message, 500);
	}

	return {
		vote: newVote,
		message: approved ? 'Voto registrado y propuesta aprobada' : 'Voto registrado correctamente',
		votesCount,
		votesRequired,
		approved,
	};
};

export const getProposalVoteResults = async (
	authUserId: string,
	groupId: string,
) => {
	const localUserId = await getLocalUserId(authUserId);
	await ensureUserBelongsToGroup(groupId, localUserId);

	const { data: proposals, error: proposalsError } = await supabase
		.from('propuestas')
		.select('id_propuesta, tipo_item, titulo')
		.eq('grupo_id', groupId);

	if (proposalsError) throw createError(proposalsError.message, 500);

	if (!proposals || proposals.length === 0) {
		return {
			tripId: groupId,
			totalVotes: 0,
			results: [] as ProposalVoteResult[],
		};
	}

	const proposalIds = proposals.map((p: any) => p.id_propuesta);
	const { data: votes, error: votesError } = await supabase
		.from('voto')
		.select('id_propuesta')
		.in('id_propuesta', proposalIds);

	if (votesError) throw createError(votesError.message, 500);

	const counts = new Map<string, number>();
	for (const row of votes ?? []) {
		const idPropuesta = String((row as { id_propuesta: string | number }).id_propuesta);
		counts.set(idPropuesta, (counts.get(idPropuesta) ?? 0) + 1);
	}

	const results: ProposalVoteResult[] = proposals
		.map((proposal: any) => ({
			id_propuesta: String(proposal.id_propuesta),
			tipo_item: proposal.tipo_item as 'vuelo' | 'hospedaje',
			titulo: String(proposal.titulo ?? ''),
			votos: counts.get(String(proposal.id_propuesta)) ?? 0,
		}))
		.sort((a, b) => b.votos - a.votos || a.id_propuesta.localeCompare(b.id_propuesta));

	return {
		tripId: groupId,
		totalVotes: votes?.length ?? 0,
		results,
	};
};

export const createComment = async (
	authUserId: string,
	groupId: string,
	proposalId: string,
	payload: CreateCommentPayload,
) => {
	if (!payload.contenido || !payload.contenido.trim()) {
		throw createError('contenido es requerido', 400);
	}

	const localUserId = await getLocalUserId(authUserId);
	const localUserIdStr = String(localUserId);
	await ensureUserBelongsToGroup(groupId, localUserId);
	await ensureProposalBelongsToGroup(groupId, proposalId);

	const { data, error } = await supabase
		.from('comentario')
		.insert({
			id_propuesta: proposalId,
			id_usuario: localUserId,
			contenido: payload.contenido.trim(),
		})
		.select('id_comentario, id_propuesta, id_usuario, contenido, created_at, updated_at')
		.single();

	if (error) throw createError(error.message, 500);
	const [enriched] = await attachCommentAuthorNames([data as RawCommentRow]);
	return enriched;
};

export const listComments = async (
	authUserId: string,
	groupId: string,
	proposalId: string,
) => {
	const localUserId = await getLocalUserId(authUserId);
	const localUserIdStr = String(localUserId);
	await ensureUserBelongsToGroup(groupId, localUserId);
	await ensureProposalBelongsToGroup(groupId, proposalId);

	const { data, error } = await supabase
		.from('comentario')
		.select('id_comentario, id_propuesta, id_usuario, contenido, created_at, updated_at')
		.eq('id_propuesta', proposalId)
		.order('created_at', { ascending: true });

	if (error) throw createError(error.message, 500);
	return attachCommentAuthorNames((data ?? []) as RawCommentRow[]);
};

export const updateComment = async (
	authUserId: string,
	groupId: string,
	proposalId: string,
	commentId: string,
	payload: UpdateCommentPayload,
) => {
	if (!payload.contenido || !payload.contenido.trim()) {
		throw createError('contenido es requerido', 400);
	}

	const localUserId = await getLocalUserId(authUserId);
	const localUserIdStr = String(localUserId);
	await ensureUserBelongsToGroup(groupId, localUserId);
	await ensureProposalBelongsToGroup(groupId, proposalId);

	const { data: existing, error: existingError } = await supabase
		.from('comentario')
		.select('id_comentario, id_usuario, id_propuesta')
		.eq('id_comentario', commentId)
		.maybeSingle();

	if (existingError) throw createError(existingError.message, 500);
	if (!existing || String((existing as { id_propuesta: string | number }).id_propuesta) !== proposalId) {
		throw createError('Comentario no encontrado', 404);
	}
	if (String((existing as { id_usuario: string | number }).id_usuario) !== localUserIdStr) {
		throw createError('No puedes editar comentarios de otro usuario', 403);
	}

	const { data, error } = await supabase
		.from('comentario')
		.update({ contenido: payload.contenido.trim(), updated_at: new Date().toISOString() })
		.eq('id_comentario', commentId)
		.select('id_comentario, id_propuesta, id_usuario, contenido, created_at, updated_at')
		.single();

	if (error) throw createError(error.message, 500);
	const [enriched] = await attachCommentAuthorNames([data as RawCommentRow]);
	return enriched;
};

export const deleteComment = async (
	authUserId: string,
	groupId: string,
	proposalId: string,
	commentId: string,
) => {
	const localUserId = await getLocalUserId(authUserId);
	const localUserIdStr = String(localUserId);
	await ensureUserBelongsToGroup(groupId, localUserId);
	await ensureProposalBelongsToGroup(groupId, proposalId);

	const { data: existing, error: existingError } = await supabase
		.from('comentario')
		.select('id_comentario, id_usuario, id_propuesta')
		.eq('id_comentario', commentId)
		.maybeSingle();

	if (existingError) throw createError(existingError.message, 500);
	if (!existing || String((existing as { id_propuesta: string | number }).id_propuesta) !== proposalId) {
		throw createError('Comentario no encontrado', 404);
	}
	if (String((existing as { id_usuario: string | number }).id_usuario) !== localUserIdStr) {
		throw createError('No puedes eliminar comentarios de otro usuario', 403);
	}

	const { error } = await supabase
		.from('comentario')
		.delete()
		.eq('id_comentario', commentId);

	if (error) throw createError(error.message, 500);
	return { deleted: true, commentId };
};
