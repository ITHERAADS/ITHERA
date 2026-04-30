import { supabase } from '../../infrastructure/db/supabase.client';
import { getLocalUserId } from '../groups/groups.service';
import {
  SaveFlightProposalPayload,
  SaveHotelProposalPayload,
  UpdateProposalPayload,
	CreateCommentPayload,
	CreateVotePayload,
	ProposalVoteType,
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

const ensureUserIsAdmin = async (groupId: string, localUserId: string): Promise<void> => {
	const { data, error } = await supabase
		.from('grupo_miembros')
		.select('id, rol')
		.eq('grupo_id', groupId)
		.eq('usuario_id', localUserId)
		.maybeSingle();

	if (error) throw createError(error.message, 500);
	if (!data) throw createError('No autorizado: no perteneces a este viaje/grupo', 403);

	const role = String((data as any).rol ?? '').toLowerCase();
	if (role !== 'admin' && role !== 'organizador') {
		throw createError('Solo el organizador puede tomar esta decision', 403);
	}
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

const normalizeVoteType = (voteType: unknown): ProposalVoteType => {
	if (voteType === 'en_contra' || voteType === 'abstencion' || voteType === 'a_favor') {
		return voteType;
	}
	return 'a_favor';
};

const isMissingVoteTypeColumnError = (error: { message?: string } | null | undefined): boolean => {
	const message = String(error?.message ?? '').toLowerCase();
	return message.includes("voto_tipo") && message.includes("could not find");
};

const fetchVotesWithFallback = async (proposalIds: string[] | number[]) => {
	const voteTable = supabase.from('voto') as any;
	const selectWithType = voteTable.select('id_propuesta, voto_tipo, id_usuario') as any;

	let voteQueryResult: { data: any; error: any } = { data: null, error: null };

	if (proposalIds.length === 1 && typeof selectWithType?.eq === 'function') {
		voteQueryResult = await selectWithType.eq('id_propuesta', proposalIds[0]);
	} else if (typeof selectWithType?.in === 'function') {
		voteQueryResult = await selectWithType.in('id_propuesta', proposalIds as any);
	} else if (typeof selectWithType?.eq === 'function') {
		// Fallback de compatibilidad para mocks o clientes sin `.in`
		voteQueryResult = await selectWithType.eq('id_propuesta', proposalIds[0]);
	} else {
		throw createError('No se pudo construir la consulta de votos', 500);
	}

	const { data, error } = voteQueryResult;

	if (!error) {
		return {
			rows: (data ?? []).map((row: any) => ({
				id_propuesta: row.id_propuesta,
				id_usuario: row.id_usuario,
				voto_tipo: normalizeVoteType(row.voto_tipo),
			})),
		};
	}

	if (!isMissingVoteTypeColumnError(error)) {
		throw createError(error.message, 500);
	}

	const fallbackTable = supabase.from('voto') as any;
	const fallbackSelect = fallbackTable.select('id_propuesta, id_usuario') as any;

	let fallback: { data: any; error: any } = { data: null, error: null };

	if (proposalIds.length === 1 && typeof fallbackSelect?.eq === 'function') {
		fallback = await fallbackSelect.eq('id_propuesta', proposalIds[0]);
	} else if (typeof fallbackSelect?.in === 'function') {
		fallback = await fallbackSelect.in('id_propuesta', proposalIds as any);
	} else if (typeof fallbackSelect?.eq === 'function') {
		fallback = await fallbackSelect.eq('id_propuesta', proposalIds[0]);
	} else {
		throw createError('No se pudo construir la consulta de votos (fallback)', 500);
	}

	if (fallback.error) throw createError(fallback.error.message, 500);

	return {
		rows: (fallback.data ?? []).map((row: any) => ({
			id_propuesta: row.id_propuesta,
			id_usuario: row.id_usuario,
			voto_tipo: 'a_favor' as ProposalVoteType,
		})),
	};
};

const evaluateProposalOutcome = async (groupId: string, proposalId: string) => {
	const totalMembers = await getUniqueGroupMemberCount(groupId);
	const votesRequired = Math.floor(totalMembers / 2) + 1;

	const { rows: votes } = await fetchVotesWithFallback([proposalId]);

	let votesFor = 0;
	let votesAgainst = 0;
	let abstentions = 0;

	for (const row of votes ?? []) {
		const t = normalizeVoteType((row as any).voto_tipo);
		if (t === 'a_favor') votesFor += 1;
		else if (t === 'en_contra') votesAgainst += 1;
		else abstentions += 1;
	}

	const totalVotes = votes.length;
	const pendingVotes = Math.max(totalMembers - totalVotes, 0);
	const approved = votesFor >= votesRequired;
	const rejected = votesAgainst >= votesRequired;
	const tied = totalVotes >= totalMembers && votesFor === votesAgainst && !approved && !rejected;

	return {
		totalMembers,
		votesRequired,
		totalVotes,
		votesFor,
		votesAgainst,
		abstentions,
		pendingVotes,
		approved,
		rejected,
		tied,
	};
};

const applyProposalResolution = async (
	groupId: string,
	proposalId: string,
	resolution: 'aprobada' | 'rechazada',
	meta?: Record<string, unknown>,
) => {
	const nowIso = new Date().toISOString();
	let resolvedActivityDateStart: string | null = null;
	let resolvedItineraryId: string | number | null = null;

	const { data: currentProposal, error: currentProposalError } = await supabase
		.from('propuestas')
		.select('payload')
		.eq('id_propuesta', proposalId)
		.eq('grupo_id', groupId)
		.maybeSingle();

	if (currentProposalError) throw createError(currentProposalError.message, 500);

	const mergedPayload = {
		...(typeof (currentProposal as any)?.payload === 'object' && (currentProposal as any)?.payload !== null
			? (currentProposal as any).payload
			: {}),
		...(meta ?? {}),
	};

	const { error: proposalUpdateError } = await supabase
		.from('propuestas')
		.update({
			estado: resolution,
			fecha_cierre: nowIso,
			ultima_actualizacion: nowIso,
			payload: mergedPayload,
		})
		.eq('id_propuesta', proposalId)
		.eq('grupo_id', groupId);

	if (proposalUpdateError) throw createError(proposalUpdateError.message, 500);

	const { error: activityUpdateError } = await supabase
		.from('actividades')
		.update({
			estado: resolution === 'aprobada' ? 'confirmada' : 'cancelada',
			ultima_actualizacion: nowIso,
		})
		.eq('propuesta_id', proposalId);

	if (activityUpdateError) throw createError(activityUpdateError.message, 500);

	const { data: resolvedActivity, error: resolvedActivityError } = await supabase
		.from('actividades')
		.select('id_actividad, itinerario_id, fecha_inicio')
		.eq('propuesta_id', proposalId)
		.limit(1)
		.maybeSingle();

	if (resolvedActivityError) throw createError(resolvedActivityError.message, 500);

	resolvedActivityDateStart = (resolvedActivity as any)?.fecha_inicio
		? String((resolvedActivity as any).fecha_inicio)
		: null;
	resolvedItineraryId = (resolvedActivity as any)?.itinerario_id ?? null;

	if (resolution !== 'aprobada' || !resolvedActivityDateStart || !resolvedItineraryId) {
		return;
	}

	const { data: conflictingActivities, error: conflictingActivitiesError } = await supabase
		.from('actividades')
		.select('id_actividad, propuesta_id')
		.eq('itinerario_id', resolvedItineraryId)
		.eq('fecha_inicio', resolvedActivityDateStart)
		.eq('estado', 'pendiente')
		.neq('propuesta_id', proposalId)
		.not('propuesta_id', 'is', null);

	if (conflictingActivitiesError) throw createError(conflictingActivitiesError.message, 500);

	if (!conflictingActivities || conflictingActivities.length === 0) {
		return;
	}

	const conflictingActivityIds = conflictingActivities
		.map((row: any) => row.id_actividad)
		.filter(Boolean);

	if (conflictingActivityIds.length > 0) {
		const { error: cancelConflictActivitiesError } = await supabase
			.from('actividades')
			.update({
				estado: 'cancelada',
				ultima_actualizacion: nowIso,
			})
			.in('id_actividad', conflictingActivityIds);
		if (cancelConflictActivitiesError) throw createError(cancelConflictActivitiesError.message, 500);
	}

	const conflictingProposalIds = conflictingActivities
		.map((row: any) => row.propuesta_id)
		.filter(Boolean);

	if (conflictingProposalIds.length > 0) {
		const { error: discardConflictProposalsError } = await supabase
			.from('propuestas')
			.update({
				estado: 'descartada',
				fecha_cierre: nowIso,
				ultima_actualizacion: nowIso,
			})
			.in('id_propuesta', conflictingProposalIds)
			.eq('grupo_id', groupId);
		if (discardConflictProposalsError) throw createError(discardConflictProposalsError.message, 500);
	}
};

export const castSingleVote = async (
	authUserId: string,
	groupId: string,
	proposalId: string,
	payload: CreateVotePayload,
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

	const desiredVoteType = normalizeVoteType(payload?.voto);
	const { data: newVote, error: insertError } = await supabase
		.from('voto')
		.insert({
			id_propuesta: proposalId,
			id_usuario: localUserId,
			voto_tipo: desiredVoteType,
		})
		.select('id_voto, id_propuesta, id_usuario, voto_tipo, created_at')
		.single();

	if (insertError) {
		if (isMissingVoteTypeColumnError(insertError)) {
			const fallbackInsert = await supabase
				.from('voto')
				.insert({
					id_propuesta: proposalId,
					id_usuario: localUserId,
				})
				.select('id_voto, id_propuesta, id_usuario, created_at')
				.single();

			if (fallbackInsert.error) throw createError(fallbackInsert.error.message, 500);

			const outcome = await evaluateProposalOutcome(groupId, proposalId);

			if (outcome.approved) {
				await applyProposalResolution(groupId, proposalId, 'aprobada', { decisionType: 'B', resolution: 'majority_for' });
			}

			if (outcome.rejected) {
				await applyProposalResolution(groupId, proposalId, 'rechazada', { decisionType: 'B', resolution: 'majority_against' });
			}

			return {
				vote: { ...(fallbackInsert.data as any), voto_tipo: desiredVoteType },
				message: outcome.approved
					? 'Voto registrado y propuesta aprobada'
					: outcome.rejected
						? 'Voto registrado y propuesta rechazada'
						: outcome.tied
							? 'Votacion empatada: requiere desempate del organizador'
							: 'Voto registrado correctamente',
				votesCount: outcome.votesFor,
				votesRequired: outcome.votesRequired,
				approved: outcome.approved,
				rejected: outcome.rejected,
				requiresAdminTieBreak: outcome.tied,
				votesFor: outcome.votesFor,
				votesAgainst: outcome.votesAgainst,
				abstentions: outcome.abstentions,
				pendingVotes: outcome.pendingVotes,
			};
		}
		throw createError(insertError.message, 500);
	}

	const outcome = await evaluateProposalOutcome(groupId, proposalId);

	if (outcome.approved) {
		await applyProposalResolution(groupId, proposalId, 'aprobada', { decisionType: 'B', resolution: 'majority_for' });
	}

	if (outcome.rejected) {
		await applyProposalResolution(groupId, proposalId, 'rechazada', { decisionType: 'B', resolution: 'majority_against' });
	}

	return {
		vote: newVote,
		message: outcome.approved
			? 'Voto registrado y propuesta aprobada'
			: outcome.rejected
				? 'Voto registrado y propuesta rechazada'
				: outcome.tied
					? 'Votacion empatada: requiere desempate del organizador'
					: 'Voto registrado correctamente',
		votesCount: outcome.votesFor,
		votesRequired: outcome.votesRequired,
		approved: outcome.approved,
		rejected: outcome.rejected,
		requiresAdminTieBreak: outcome.tied,
		votesFor: outcome.votesFor,
		votesAgainst: outcome.votesAgainst,
		abstentions: outcome.abstentions,
		pendingVotes: outcome.pendingVotes,
	};
};

export const applyAdminDecisionToProposal = async (
	authUserId: string,
	groupId: string,
	proposalId: string,
	payload: { decision: 'aprobar' | 'rechazar'; reason?: string },
) => {
	const localUserId = await getLocalUserId(authUserId);
	await ensureUserBelongsToGroup(groupId, localUserId);
	await ensureUserIsAdmin(groupId, localUserId);
	await ensureProposalBelongsToGroup(groupId, proposalId);

	const decision = payload.decision === 'rechazar' ? 'rechazada' : 'aprobada';
	await applyProposalResolution(groupId, proposalId, decision, {
		decisionType: 'A',
		adminDecisionBy: localUserId,
		adminDecisionAt: new Date().toISOString(),
		adminDecisionReason: payload.reason ?? null,
	});

	return {
		decisionType: 'A',
		resolution: decision,
		message: decision === 'aprobada'
			? 'Decision administrativa aplicada: propuesta aprobada'
			: 'Decision administrativa aplicada: propuesta rechazada',
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
		.select('id_propuesta, tipo_item, titulo, estado')
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
	const { rows: votes } = await fetchVotesWithFallback(proposalIds);

	const totalMembers = await getUniqueGroupMemberCount(groupId);
	const countsFor = new Map<string, number>();
	const countsAgainst = new Map<string, number>();
	const countsAbstention = new Map<string, number>();
	const myVoteByProposal = new Map<string, ProposalVoteType>();

	for (const row of votes ?? []) {
		const idPropuesta = String((row as { id_propuesta: string | number }).id_propuesta);
		const voteType = normalizeVoteType((row as any).voto_tipo);
		if (voteType === 'a_favor') countsFor.set(idPropuesta, (countsFor.get(idPropuesta) ?? 0) + 1);
		else if (voteType === 'en_contra') countsAgainst.set(idPropuesta, (countsAgainst.get(idPropuesta) ?? 0) + 1);
		else countsAbstention.set(idPropuesta, (countsAbstention.get(idPropuesta) ?? 0) + 1);

		if (String((row as any).id_usuario) === String(localUserId)) {
			myVoteByProposal.set(idPropuesta, voteType);
		}
	}

	const results: ProposalVoteResult[] = proposals
		.map((proposal: any) => ({
			id_propuesta: String(proposal.id_propuesta),
			tipo_item: proposal.tipo_item as 'vuelo' | 'hospedaje',
			titulo: String(proposal.titulo ?? ''),
			votos: countsFor.get(String(proposal.id_propuesta)) ?? 0,
			votos_a_favor: countsFor.get(String(proposal.id_propuesta)) ?? 0,
			votos_en_contra: countsAgainst.get(String(proposal.id_propuesta)) ?? 0,
			abstenciones: countsAbstention.get(String(proposal.id_propuesta)) ?? 0,
			votos_pendientes: Math.max(
				totalMembers -
					((countsFor.get(String(proposal.id_propuesta)) ?? 0) +
					(countsAgainst.get(String(proposal.id_propuesta)) ?? 0) +
					(countsAbstention.get(String(proposal.id_propuesta)) ?? 0)),
				0,
			),
			requiere_desempate_admin:
				((countsFor.get(String(proposal.id_propuesta)) ?? 0) +
					(countsAgainst.get(String(proposal.id_propuesta)) ?? 0) +
					(countsAbstention.get(String(proposal.id_propuesta)) ?? 0)) >= totalMembers &&
				(countsFor.get(String(proposal.id_propuesta)) ?? 0) ===
					(countsAgainst.get(String(proposal.id_propuesta)) ?? 0),
			estado_actual: String(proposal.estado ?? 'en_votacion'),
			mi_voto: myVoteByProposal.get(String(proposal.id_propuesta)) ?? null,
		}))
		.sort((a, b) => b.votos - a.votos || a.id_propuesta.localeCompare(b.id_propuesta));

	return {
		tripId: groupId,
		totalVotes: votes.length,
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
