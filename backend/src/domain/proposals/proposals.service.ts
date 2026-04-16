import { supabase } from '../../infrastructure/db/supabase.client';
<<<<<<< HEAD
import { LockPayload } from './proposals.entity';

// Bloquea una propuesta — la marca como editándose
export const lockPropuesta = async (payload: LockPayload) => {
  const { id_propuesta, id_usuario } = payload;

  // Verificar que no esté ya bloqueada por otro usuario
  const { data: propuesta, error: fetchError } = await supabase
    .from('propuestas')
    .select('is_locked, locked_by')
    .eq('id_propuesta', id_propuesta)
    .single();

  if (fetchError) throw new Error('Propuesta no encontrada');

  if (propuesta.is_locked && propuesta.locked_by !== id_usuario) {
    throw new Error('La propuesta ya está siendo editada por otro usuario');
  }

  return supabase
    .from('propuestas')
    .update({
      is_locked: true,
      locked_by: id_usuario,
      locked_at: new Date().toISOString(),
    })
    .eq('id_propuesta', id_propuesta)
    .select()
    .single();
};

// Libera el bloqueo de una propuesta
export const unlockPropuesta = async (id_propuesta: number, id_usuario: number) => {
  return supabase
    .from('propuestas')
    .update({
      is_locked: false,
      locked_by: null,
      locked_at: null,
    })
    .eq('id_propuesta', id_propuesta)
    .eq('locked_by', id_usuario) // solo el que bloqueó puede liberar
    .select()
    .single();
};

// Libera todos los bloqueos que llevan más de 5 minutos (TTL)
export const liberarBloqueosTTL = async () => {
  const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('propuestas')
    .update({ is_locked: false, locked_by: null, locked_at: null })
    .eq('is_locked', true)
    .lt('locked_at', cincoMinutosAtras)
    .select('id_propuesta, id_viaje');

  if (error) console.error('[TTL] Error liberando bloqueos:', error);
  return data ?? [];
=======
import { getLocalUserId } from '../groups/groups.service';
import {
  SaveFlightProposalPayload,
  SaveHotelProposalPayload,
  UpdateProposalPayload,
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

const assertGroupMembership = async (grupoId: number, authUserId: string) => {
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

export const listGroupProposals = async (groupId: number, authUserId: string) => {
  await assertGroupMembership(groupId, authUserId);

  const { data: proposals, error } = await supabase
    .from('propuestas')
    .select('*')
    .eq('grupo_id', groupId)
    .order('id_propuesta', { ascending: false });

  if (error) throw new Error(error.message);

  const enriched = await Promise.all((proposals ?? []).map((item) => buildProposalResponse(item.id_propuesta)));
  return enriched;
};

export const getProposalById = async (proposalId: number, authUserId: string) => {
  await assertProposalAccess(proposalId, authUserId);
  return buildProposalResponse(proposalId);
};

export const updateProposal = async (proposalId: number, authUserId: string, payload: UpdateProposalPayload) => {
  const { proposal } = await assertProposalAccess(proposalId, authUserId);

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

  if (proposal.tipo_item === 'vuelo') {
    const { error } = await supabase.from('vuelos').delete().eq('propuesta_id', proposalId);
    if (error) throw new Error(error.message);
  }

  if (proposal.tipo_item === 'hospedaje') {
    const { error } = await supabase.from('hospedajes').delete().eq('propuesta_id', proposalId);
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase.from('propuestas').delete().eq('id_propuesta', proposalId);
  if (error) throw new Error(error.message);

  return true;
>>>>>>> origin/develop
};
