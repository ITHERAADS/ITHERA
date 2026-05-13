import { supabase } from '../../infrastructure/db/supabase.client';
import {
  CreateSearchHistoryPayload,
  RecoverFromHistoryPayload,
  SearchHistoryItem,
} from './searchHistory.entity';

const buildProposalTitle = (
  tipo: string,
  parametros: Record<string, unknown>
): string => {
  const str = (key: string) => (typeof parametros[key] === 'string' ? String(parametros[key]) : '');
  switch (tipo) {
    case 'vuelo':    return `Vuelo ${str('origen')}→${str('destino')}`.trim();
    case 'hospedaje': return `Hospedaje en ${str('destino') || str('nombre')}`.trim();
    case 'lugar':    return `Lugar: ${str('nombre') || str('destino')}`.trim();
    case 'ruta':     return `Ruta: ${str('origen')}→${str('destino')}`.trim();
    default:         return 'Opción recuperada del historial';
  }
};

export const listByUser = async (usuarioId: string): Promise<SearchHistoryItem[]> => {
  const { data, error } = await supabase
    .from('historial_busquedas')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const now = new Date().toISOString();
  return (data ?? []).map((row) => ({
    ...(row as SearchHistoryItem),
    expirado: row.expires_at < now,
  }));
};

export const createEntry = async (
  payload: CreateSearchHistoryPayload
): Promise<SearchHistoryItem> => {
  const { data, error } = await supabase
    .from('historial_busquedas')
    .insert({
      usuario_id:      payload.usuario_id,
      grupo_id:        payload.grupo_id ?? null,
      tipo:            payload.tipo,
      parametros:      payload.parametros,
      resultado_cache: payload.resultado_cache,
      expires_at:      payload.expires_at,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as SearchHistoryItem;
};

export const deleteEntry = async (id: string, usuarioId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('historial_busquedas')
    .delete()
    .eq('id', id)
    .eq('usuario_id', usuarioId)
    .select('id');

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    throw Object.assign(
      new Error('Registro de historial no encontrado'),
      { statusCode: 404 }
    );
  }
};

export const clearHistory = async (usuarioId: string): Promise<void> => {
  const { error } = await supabase
    .from('historial_busquedas')
    .delete()
    .eq('usuario_id', usuarioId);

  if (error) throw new Error(error.message);
};

export const recoverAsProposalTypeB = async (
  payload: RecoverFromHistoryPayload
): Promise<Record<string, unknown>> => {
  const { data: item, error: fetchError } = await supabase
    .from('historial_busquedas')
    .select('*')
    .eq('id', payload.historialId)
    .single();

  if (fetchError || !item) {
    throw Object.assign(
      new Error('Registro de historial no encontrado'),
      { statusCode: 404, code: 'ERR-74-001' }
    );
  }

  const now = new Date().toISOString();
  if ((item as SearchHistoryItem).expires_at < now) {
    throw Object.assign(
      new Error(
        'Esta opción ya no está disponible porque expiró. Realiza una nueva búsqueda.'
      ),
      { statusCode: 410, code: 'ERR-74-001' }
    );
  }

  const historyItem = item as SearchHistoryItem;
  const titulo = buildProposalTitle(historyItem.tipo, historyItem.parametros);

  const { data: proposal, error: insertError } = await supabase
    .from('propuestas')
    .insert({
      grupo_id:      payload.grupoId,
      tipo_item:     historyItem.tipo,
      titulo,
      descripcion:   'Recuperado desde historial de búsquedas',
      fuente:        'historial',
      payload:       historyItem.resultado_cache,
      estado:        'guardada',
      creado_por:    payload.usuarioId,
      fecha_apertura: new Date().toISOString(),
      fecha_cierre:  null,
    })
    .select('*')
    .single();

  if (insertError) {
    throw Object.assign(
      new Error('No se pudo crear la propuesta desde el historial'),
      { statusCode: 500, code: 'ERR-74-002' }
    );
  }

  return proposal as Record<string, unknown>;
};
