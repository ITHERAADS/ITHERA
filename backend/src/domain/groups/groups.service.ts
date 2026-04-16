import { supabase } from '../../infrastructure/db/supabase.client';
import { CreateGroupPayload, JoinGroupPayload, MemberRole } from './groups.entity';

// ── Helpers ────────────────────────────────────────────────────────────────────

const generateGroupCode = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
};

const generateUniqueCode = async (): Promise<string> => {
  let code = '';
  let exists = true;

  while (exists) {
    code = generateGroupCode(8);
    const { data, error } = await supabase
      .from('grupos_viaje')
      .select('id')
      .eq('codigo_invitacion', code)
      .maybeSingle();

    if (error) throw new Error(error.message);
    exists = !!data;
  }

  return code;
};

export const getLocalUserId = async (authUserId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id_usuario')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) throw new Error('Usuario no encontrado en tabla local');
  return data.id_usuario as string;
};

// ── Service functions ──────────────────────────────────────────────────────────

export const createGroup = async (authUserId: string, payload: CreateGroupPayload) => {
  const usuarioId = await getLocalUserId(authUserId);
  const codigo = await generateUniqueCode();

  const { data: grupo, error: groupError } = await supabase
    .from('grupos_viaje')
    .insert({
      nombre: payload.nombre,
      descripcion: payload.descripcion ?? null,
      codigo_invitacion: codigo,
      creado_por: usuarioId,
      estado: 'activo',
    })
    .select()
    .single();

  if (groupError || !grupo) throw new Error(groupError?.message ?? 'Error al crear grupo');

  const { error: memberError } = await supabase
    .from('grupo_miembros')
    .insert({ grupo_id: grupo.id, usuario_id: usuarioId, rol: 'admin' });

  if (memberError) throw new Error(memberError.message);

  return grupo;
};

export const joinGroupByCode = async (authUserId: string, payload: JoinGroupPayload) => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data: grupo, error: groupError } = await supabase
    .from('grupos_viaje')
    .select('*')
    .eq('codigo_invitacion', payload.codigo)
    .eq('estado', 'activo')
    .single();

  if (groupError || !grupo) throw new Error('Grupo no encontrado o inactivo');

  const { data: existente } = await supabase
    .from('grupo_miembros')
    .select('id')
    .eq('grupo_id', grupo.id)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (existente) throw Object.assign(new Error('El usuario ya pertenece a este grupo'), { statusCode: 409 });

  const { error: insertError } = await supabase
    .from('grupo_miembros')
    .insert({ grupo_id: grupo.id, usuario_id: usuarioId, rol: 'colaborador' });

  if (insertError) throw new Error(insertError.message);

  return grupo;
};

export const getGroupMembers = async (groupId: string) => {
  const { data, error } = await supabase
    .from('grupo_miembros')
    .select(`id, rol, usuarios ( id_usuario, nombre, email )`)
    .eq('grupo_id', groupId);

  if (error) throw new Error(error.message);
  return data;
};

export const updateMemberRole = async (memberId: string, rol: MemberRole) => {
  const { data, error } = await supabase
    .from('grupo_miembros')
    .update({ rol })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getMyTravelHistory = async (authUserId: string) => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data, error } = await supabase
    .from('grupo_miembros')
    .select(`rol, grupos_viaje ( id, nombre, descripcion, codigo_invitacion, estado, created_at )`)
    .eq('usuario_id', usuarioId);

  if (error) throw new Error(error.message);

  const activos = data?.filter((item: any) => item.grupos_viaje?.estado === 'activo') ?? [];
  const pasados = data?.filter((item: any) => item.grupos_viaje?.estado === 'finalizado') ?? [];

  return { activos, pasados };
};