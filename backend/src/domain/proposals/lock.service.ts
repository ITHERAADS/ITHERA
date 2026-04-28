import { supabase } from '../../infrastructure/db/supabase.client';

// ── Types ────────────────────────────────────────────────────────────────

export interface LockResult {
  success: boolean;
  lockedBy?: string;
  lockedByName?: string;
  grupoId?: string;
}

export interface ReleasedLock {
  propuestaId: string;
  grupoId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

type ServiceError = Error & { statusCode?: number };

const createError = (message: string, statusCode: number): ServiceError => {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  return err;
};

// ── Lock Operations ─────────────────────────────────────────────────────

/**
 * Intenta adquirir un bloqueo sobre una propuesta de forma ATÓMICA.
 *
 * Usa UPDATE condicional con .is('bloqueado_por', null) para evitar
 * race conditions: solo una petición concurrent podrá setear el lock.
 *
 * Flujo:
 * 1. UPDATE WHERE bloqueado_por IS NULL → si afecta filas, lock adquirido
 * 2. Si no afecta filas, consultar quién lo tiene:
 *    a. Si es el mismo usuario → idempotente, retorna success
 *    b. Si es otro → retorna failure con info del bloqueador
 */
export const acquireLock = async (
  propuestaId: string,
  userId: string,
): Promise<LockResult> => {
  // Intento atómico: UPDATE solo si bloqueado_por IS NULL
  const { data: updated, error: updateError } = await supabase
    .from('propuestas')
    .update({
      bloqueado_por: userId,
      fecha_bloqueo: new Date().toISOString(),
    })
    .eq('id_propuesta', propuestaId)
    .is('bloqueado_por', null)
    .select('id_propuesta, grupo_id')
    .maybeSingle();

  if (updateError) throw createError(updateError.message, 500);

  // Si el UPDATE tuvo efecto → lock adquirido
  if (updated) {
    return { success: true, grupoId: String(updated.grupo_id) };
  }

  // Si no tuvo efecto, la propuesta ya está bloqueada. Consultar quién.
  const { data: proposal, error: selectError } = await supabase
    .from('propuestas')
    .select('id_propuesta, grupo_id, bloqueado_por')
    .eq('id_propuesta', propuestaId)
    .single();

  if (selectError || !proposal) {
    throw createError('Propuesta no encontrada', 404);
  }

  // Caso idempotente: el mismo usuario ya lo tiene bloqueado
  if (String(proposal.bloqueado_por) === String(userId)) {
    return { success: true, grupoId: String(proposal.grupo_id) };
  }

  // Bloqueado por otro usuario → obtener nombre
  const { data: blocker } = await supabase
    .from('usuarios')
    .select('id_usuario, nombre')
    .eq('id_usuario', proposal.bloqueado_por)
    .single();

  return {
    success: false,
    lockedBy: String(proposal.bloqueado_por),
    lockedByName: blocker?.nombre ?? 'Otro usuario',
    grupoId: String(proposal.grupo_id),
  };
};

/**
 * Verifica que una propuesta pertenezca al grupo indicado.
 */
export const validateProposalBelongsToGroup = async (
  propuestaId: string,
  tripId: string,
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('propuestas')
    .select('id_propuesta')
    .eq('id_propuesta', propuestaId)
    .eq('grupo_id', tripId)
    .maybeSingle();

  return !error && !!data;
};

/**
 * Libera el bloqueo de una propuesta.
 * Solo el usuario que bloqueó puede liberarlo.
 */
export const releaseLock = async (
  propuestaId: string,
  userId: string,
): Promise<boolean> => {
  // UPDATE atómico: solo libera si bloqueado_por === userId
  const { data: updated, error: updateError } = await supabase
    .from('propuestas')
    .update({
      bloqueado_por: null,
      fecha_bloqueo: null,
    })
    .eq('id_propuesta', propuestaId)
    .eq('bloqueado_por', userId)
    .select('id_propuesta')
    .maybeSingle();

  if (updateError) throw createError(updateError.message, 500);

  if (!updated) {
    // Verificar si la propuesta existe
    const { data: exists } = await supabase
      .from('propuestas')
      .select('id_propuesta, bloqueado_por')
      .eq('id_propuesta', propuestaId)
      .single();

    if (!exists) throw createError('Propuesta no encontrada', 404);
    if (exists.bloqueado_por !== null && String(exists.bloqueado_por) !== String(userId)) {
      throw createError('No puedes desbloquear una propuesta bloqueada por otro usuario', 403);
    }
  }

  return true;
};

/**
 * Libera TODOS los bloqueos de un usuario específico.
 * Se usa cuando el usuario se desconecta (onDisconnect).
 * Retorna las propuestas liberadas con su grupo_id para notificar a las rooms.
 */
export const releaseAllUserLocks = async (
  userId: string,
): Promise<ReleasedLock[]> => {
  // Buscar todas las propuestas bloqueadas por este usuario
  const { data: locked, error: selectError } = await supabase
    .from('propuestas')
    .select('id_propuesta, grupo_id')
    .eq('bloqueado_por', userId);

  if (selectError) {
    console.error('[lock-service] Error buscando bloqueos del usuario:', selectError.message);
    return [];
  }

  if (!locked || locked.length === 0) return [];

  // Liberar todos
  const { error: updateError } = await supabase
    .from('propuestas')
    .update({ bloqueado_por: null, fecha_bloqueo: null })
    .eq('bloqueado_por', userId);

  if (updateError) {
    console.error('[lock-service] Error liberando bloqueos:', updateError.message);
    return [];
  }

  console.log(`[lock-service] Liberados ${locked.length} bloqueo(s) del usuario ${userId}`);

  return locked.map((p: any) => ({
    propuestaId: String(p.id_propuesta),
    grupoId: String(p.grupo_id),
  }));
};

/**
 * Limpia bloqueos huérfanos (TTL expirado).
 * Incluye bloqueos donde:
 *  - fecha_bloqueo < cutoff (TTL expirado)
 *  - fecha_bloqueo IS NULL pero bloqueado_por IS NOT NULL (datos legacy/inconsistentes)
 */
export const cleanExpiredLocks = async (
  ttlMinutes: number,
): Promise<ReleasedLock[]> => {
  const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString();

  // Buscar bloqueos expirados por tiempo
  const { data: expiredByTime, error: err1 } = await supabase
    .from('propuestas')
    .select('id_propuesta, grupo_id, bloqueado_por')
    .not('bloqueado_por', 'is', null)
    .not('fecha_bloqueo', 'is', null)
    .lt('fecha_bloqueo', cutoff);

  // Buscar bloqueos inconsistentes (bloqueado_por sin fecha_bloqueo)
  const { data: orphanedNoDate, error: err2 } = await supabase
    .from('propuestas')
    .select('id_propuesta, grupo_id, bloqueado_por')
    .not('bloqueado_por', 'is', null)
    .is('fecha_bloqueo', null);

  if (err1) console.error('[lock-service] Error buscando bloqueos expirados:', err1.message);
  if (err2) console.error('[lock-service] Error buscando bloqueos huérfanos:', err2.message);

  const expired = [...(expiredByTime ?? []), ...(orphanedNoDate ?? [])];
  if (expired.length === 0) return [];

  // Liberar los expirados
  const expiredIds = expired.map((p: any) => p.id_propuesta);
  const { error: updateError } = await supabase
    .from('propuestas')
    .update({ bloqueado_por: null, fecha_bloqueo: null })
    .in('id_propuesta', expiredIds);

  if (updateError) {
    console.error('[lock-service] Error limpiando bloqueos expirados:', updateError.message);
    return [];
  }

  console.log(`[lock-service] Limpiados ${expired.length} bloqueo(s) expirado(s) (TTL: ${ttlMinutes}min)`);

  return expired.map((p: any) => ({
    propuestaId: String(p.id_propuesta),
    grupoId: String(p.grupo_id),
  }));
};
