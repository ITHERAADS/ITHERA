import crypto from 'crypto';
import { sendEmail } from '../../services/email.service';
import { supabase } from '../../infrastructure/db/supabase.client';
import { baseTemplate } from '../../infrastructure/email/templates/baseTemplate';
import {
  CreateGroupInvitationsPayload,
  CreateGroupPayload,
  GroupInvitePreview,
  JoinGroupPayload,
  MemberRole,
  UpdateGroupPayload,
} from './groups.entity';

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

const normalizeInviteCode = (code: string): string => code.trim().toUpperCase();

const generateInviteToken = (): string =>
  `${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;

const getFrontendJoinLink = (code: string): string => {
  const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  return `${baseUrl}/join-group?code=${encodeURIComponent(code)}`;
};

const buildInviteEmailHtml = ({
  groupName,
  groupDescription,
  inviteLink,
}: {
  groupName: string;
  groupDescription?: string | null;
  inviteLink: string;
}) => {
  const safeDescription = groupDescription?.trim();

  const content = `
    <p style="margin:0 0 14px 0;">
      Has recibido una invitación para unirte al grupo:
    </p>

    <p style="margin:0 0 10px 0; font-size:18px; font-weight:700; color:#111827;">
      ${groupName}
    </p>

    ${
      safeDescription
        ? `
      <p style="margin:0 0 18px 0;">
        ${safeDescription}
      </p>
    `
        : ''
    }

    <p style="margin:0 0 22px 0;">
      Da clic en el siguiente botón para unirte:
    </p>

    <a
      href="${inviteLink}"
      style="
        display:inline-block;
        padding:12px 24px;
        background-color:#4CAF50;
        color:#ffffff;
        text-decoration:none;
        border-radius:8px;
        font-weight:700;
      "
    >
      Unirme al grupo
    </a>

    <p style="margin:24px 0 0 0; font-size:12px; color:#9ca3af;">
      Si no esperabas esta invitación, puedes ignorar este correo.
    </p>
  `;

  return baseTemplate({
    title: 'Te invitaron a un grupo',
    content,
  });
};

const getLocalUserRecord = async (
  authUserId: string
): Promise<{ id_usuario: number; email: string | null; nombre: string | null }> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id_usuario, email, nombre')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) {
    throw new Error('Usuario no encontrado en tabla local');
  }

  return {
    id_usuario: Number(data.id_usuario),
    email: data.email ?? null,
    nombre: data.nombre ?? null,
  };
};

export const getLocalUserId = async (authUserId: string): Promise<string> => {
  const user = await getLocalUserRecord(authUserId);
  return String(user.id_usuario);
};

const getGroupById = async (groupId: string) => {
  const { data, error } = await supabase
    .from('grupos_viaje')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error || !data) {
    throw Object.assign(new Error('Grupo no encontrado'), { statusCode: 404 });
  }

  return data;
};

const getMembership = async (groupId: string, usuarioId: string) => {
  const { data, error } = await supabase
    .from('grupo_miembros')
    .select('id, rol, usuario_id, grupo_id')
    .eq('grupo_id', groupId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

const ensureGroupMember = async (authUserId: string, groupId: string) => {
  const usuarioId = await getLocalUserId(authUserId);
  const membership = await getMembership(groupId, usuarioId);

  if (!membership) {
    throw Object.assign(new Error('No perteneces a este grupo'), { statusCode: 403 });
  }

  return { usuarioId, membership };
};

const ensureGroupAdmin = async (authUserId: string, groupId: string) => {
  const { usuarioId, membership } = await ensureGroupMember(authUserId, groupId);

  if (membership.rol !== 'admin') {
    throw Object.assign(new Error('Solo un administrador puede realizar esta acción'), {
      statusCode: 403,
    });
  }

  return { usuarioId, membership };
};

const countMembers = async (groupId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('grupo_miembros')
    .select('id', { count: 'exact', head: true })
    .eq('grupo_id', groupId);

  if (error) throw new Error(error.message);
  return count ?? 0;
};

export const getGroupDetails = async (authUserId: string, groupId: string) => {
  const { membership } = await ensureGroupMember(authUserId, groupId);
  const grupo = await getGroupById(groupId);
  const memberCount = await countMembers(groupId);

  return {
    ...grupo,
    memberCount,
    myRole: membership.rol,
  };
};

export const createGroup = async (authUserId: string, payload: CreateGroupPayload) => {
  const usuarioId = await getLocalUserId(authUserId);
  const codigo = await generateUniqueCode();

  const { data: grupo, error: groupError } = await supabase
    .from('grupos_viaje')
    .insert({
      nombre: payload.nombre,
      descripcion: payload.descripcion ?? null,
      destino: payload.destino ?? null,
      fecha_inicio: payload.fecha_inicio ?? null,
      fecha_fin: payload.fecha_fin ?? null,
      maximo_miembros: payload.maximo_miembros ?? null,
      codigo_invitacion: codigo,
      creado_por: Number(usuarioId),
      estado: 'activo',
      destino_latitud: payload.destino_latitud ?? null,
      destino_longitud: payload.destino_longitud ?? null,
      destino_place_id: payload.destino_place_id ?? null,
      destino_formatted_address: payload.destino_formatted_address ?? null,
    })
    .select('*')
    .single();

  if (groupError || !grupo) {
    throw new Error(groupError?.message ?? 'Error al crear grupo');
  }

  const { error: memberError } = await supabase
    .from('grupo_miembros')
    .insert({ grupo_id: grupo.id, usuario_id: Number(usuarioId), rol: 'admin' });

  if (memberError) throw new Error(memberError.message);

  return grupo;
};

export const joinGroupByCode = async (authUserId: string, payload: JoinGroupPayload) => {
  const localUser = await getLocalUserRecord(authUserId);
  const usuarioId = String(localUser.id_usuario);
  const normalizedCode = normalizeInviteCode(payload.codigo);

  const { data: grupo, error: groupError } = await supabase
    .from('grupos_viaje')
    .select('*')
    .eq('codigo_invitacion', normalizedCode)
    .eq('estado', 'activo')
    .single();

  if (groupError || !grupo) {
    throw Object.assign(new Error('Grupo no encontrado o inactivo'), { statusCode: 404 });
  }

  const { data: existente, error: existingError } = await supabase
    .from('grupo_miembros')
    .select('id')
    .eq('grupo_id', grupo.id)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existente) {
    throw Object.assign(new Error('El usuario ya pertenece a este grupo'), { statusCode: 409 });
  }

  if (grupo.maximo_miembros) {
    const miembrosActuales = await countMembers(String(grupo.id));
    if (miembrosActuales >= grupo.maximo_miembros) {
      throw Object.assign(new Error('El grupo alcanzó el máximo de miembros'), {
        statusCode: 409,
      });
    }
  }

  const { error: insertError } = await supabase
    .from('grupo_miembros')
    .insert({ grupo_id: grupo.id, usuario_id: localUser.id_usuario, rol: 'viajero' });

  if (insertError) throw new Error(insertError.message);

  if (localUser.email) {
    await supabase
      .from('grupo_invitaciones')
      .update({
        estado: 'aceptada',
        accepted_by: localUser.id_usuario,
        accepted_at: new Date().toISOString(),
      })
      .eq('grupo_id', grupo.id)
      .eq('email', localUser.email.toLowerCase())
      .eq('estado', 'pendiente');
  }

  return grupo;
};

export const getGroupMembers = async (authUserId: string, groupId: string) => {
  await ensureGroupMember(authUserId, groupId);

  const { data, error } = await supabase
    .from('grupo_miembros')
    .select(`
      id,
      usuario_id,
      rol,
      usuarios (
        id_usuario,
        nombre,
        email
      )
    `)
    .eq('grupo_id', groupId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((item: any) => ({
    id: String(item.id),
    usuario_id: String(item.usuario_id),
    rol: item.rol,
    nombre: item.usuarios?.nombre ?? '',
    email: item.usuarios?.email ?? '',
  }));
};

export const updateMemberRole = async (
  authUserId: string,
  memberId: string,
  rol: MemberRole
) => {
  const { data: targetMember, error: memberLookupError } = await supabase
    .from('grupo_miembros')
    .select('id, grupo_id, usuario_id, rol')
    .eq('id', memberId)
    .single();

  if (memberLookupError || !targetMember) {
    throw Object.assign(new Error('Miembro no encontrado'), { statusCode: 404 });
  }

  await ensureGroupAdmin(authUserId, String(targetMember.grupo_id));

  const { data, error } = await supabase
    .from('grupo_miembros')
    .update({ rol })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const removeMember = async (
  authUserId: string,
  groupId: string,
  memberId: string
) => {
  const { membership } = await ensureGroupAdmin(authUserId, groupId);

  const { data: targetMember, error: targetError } = await supabase
    .from('grupo_miembros')
    .select('id, usuario_id, rol, grupo_id')
    .eq('id', memberId)
    .eq('grupo_id', groupId)
    .single();

  if (targetError || !targetMember) {
    throw Object.assign(new Error('Miembro no encontrado en este grupo'), { statusCode: 404 });
  }

  if (String(targetMember.usuario_id) === String(membership.usuario_id)) {
    throw Object.assign(new Error('No puedes expulsarte a ti mismo'), { statusCode: 400 });
  }

  const { error } = await supabase
    .from('grupo_miembros')
    .delete()
    .eq('id', memberId)
    .eq('grupo_id', groupId);

  if (error) throw new Error(error.message);

  return { ok: true };
};

export const getInviteInfo = async (authUserId: string, groupId: string) => {
  await ensureGroupMember(authUserId, groupId);
  const grupo = await getGroupById(groupId);

  const inviteLink = getFrontendJoinLink(grupo.codigo_invitacion);

  return {
    groupId: String(grupo.id),
    codigo: grupo.codigo_invitacion,
    inviteLink,
  };
};

export const getInvitePreviewByCode = async (
  codigo: string
): Promise<GroupInvitePreview> => {
  const normalizedCode = normalizeInviteCode(codigo);

  const { data: grupo, error } = await supabase
    .from('grupos_viaje')
    .select('*')
    .eq('codigo_invitacion', normalizedCode)
    .eq('estado', 'activo')
    .single();

  if (error || !grupo) {
    throw Object.assign(new Error('Invitación no encontrada o grupo inactivo'), {
      statusCode: 404,
    });
  }

  const memberCount = await countMembers(String(grupo.id));
  const canJoin = grupo.maximo_miembros ? memberCount < grupo.maximo_miembros : true;

  return {
    groupId: String(grupo.id),
    nombre: grupo.nombre,
    descripcion: grupo.descripcion ?? null,
    destino: grupo.destino ?? null,
    fecha_inicio: grupo.fecha_inicio ?? null,
    fecha_fin: grupo.fecha_fin ?? null,
    estado: grupo.estado,
    codigo: grupo.codigo_invitacion,
    memberCount,
    maximo_miembros: grupo.maximo_miembros ?? null,
    canJoin,
  };
};

export const getGroupInvitations = async (authUserId: string, groupId: string) => {
  await ensureGroupAdmin(authUserId, groupId);

  const { data, error } = await supabase
    .from('grupo_invitaciones')
    .select('id, email, codigo_invitacion, estado, created_at')
    .eq('grupo_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((item) => ({
    id: String(item.id),
    email: item.email,
    codigo_invitacion: item.codigo_invitacion,
    estado: item.estado,
    created_at: item.created_at,
  }));
};

export const createGroupInvitations = async (
  authUserId: string,
  groupId: string,
  payload: CreateGroupInvitationsPayload
) => {
  const { usuarioId } = await ensureGroupAdmin(authUserId, groupId);
  const grupo = await getGroupById(groupId);

  const emails = Array.from(
    new Set(payload.emails.map((email) => email.trim().toLowerCase()).filter(Boolean))
  );

  if (!emails.length) {
    throw Object.assign(new Error('Debes enviar al menos un correo válido'), {
      statusCode: 400,
    });
  }

  const { data: miembros, error: membersError } = await supabase
    .from('grupo_miembros')
    .select(`
      usuario_id,
      usuarios (
        email
      )
    `)
    .eq('grupo_id', groupId);

  if (membersError) throw new Error(membersError.message);

  const memberEmails = new Set(
    (miembros ?? [])
      .map((item: any) => item.usuarios?.email?.toLowerCase?.())
      .filter(Boolean)
  );

  const { data: pendingInvites, error: pendingError } = await supabase
    .from('grupo_invitaciones')
    .select('id, email, token, estado')
    .eq('grupo_id', groupId)
    .eq('estado', 'pendiente');

  if (pendingError) throw new Error(pendingError.message);

  const pendingByEmail = new Map(
    (pendingInvites ?? []).map((invite: any) => [invite.email.toLowerCase(), invite])
  );

  const results: Array<{
    id?: string;
    email: string;
    status: 'existing_member' | 'already_invited' | 'created';
    inviteLink?: string;
    codigo: string;
  }> = [];

  for (const email of emails) {
    if (memberEmails.has(email)) {
      results.push({
        email,
        status: 'existing_member',
        codigo: grupo.codigo_invitacion,
      });
      continue;
    }

    const existingInvite = pendingByEmail.get(email);

    if (existingInvite) {
      results.push({
        id: String(existingInvite.id),
        email,
        status: 'already_invited',
        codigo: grupo.codigo_invitacion,
        inviteLink: getFrontendJoinLink(grupo.codigo_invitacion),
      });
      continue;
    }

    const token = generateInviteToken();

    const { data: createdInvite, error: insertError } = await supabase
      .from('grupo_invitaciones')
      .insert({
        grupo_id: grupo.id,
        email,
        codigo_invitacion: grupo.codigo_invitacion,
        token,
        estado: 'pendiente',
        creada_por: Number(usuarioId),
      })
      .select('id, email')
      .single();

    if (insertError) throw new Error(insertError.message);

    const inviteLink = getFrontendJoinLink(grupo.codigo_invitacion);

    results.push({
      id: String(createdInvite.id),
      email,
      status: 'created',
      codigo: grupo.codigo_invitacion,
      inviteLink,
    });

    const html = buildInviteEmailHtml({
      groupName: grupo.nombre,
      groupDescription: grupo.descripcion ?? null,
      inviteLink,
    });

    sendEmail({
      to: email,
      subject: `Invitación a grupo: ${grupo.nombre}`,
      html,
    }).catch((err) => {
      console.error('Error enviando invitación:', err);
    });
  }

  return {
    groupId: String(grupo.id),
    codigo: grupo.codigo_invitacion,
    invitations: results,
  };
};

export const getMyTravelHistory = async (authUserId: string) => {
  const usuarioId = await getLocalUserId(authUserId);

  const { data, error } = await supabase
    .from('grupo_miembros')
    .select(`
      rol,
      grupos_viaje (
        id,
        nombre,
        descripcion,
        destino,
        fecha_inicio,
        fecha_fin,
        maximo_miembros,
        codigo_invitacion,
        estado,
        created_at,
        destino_latitud,
        destino_longitud,
        destino_place_id,
        destino_formatted_address
      )
    `)
    .eq('usuario_id', usuarioId);

  if (error) throw new Error(error.message);

  const activos =
    data?.filter((item: any) => item.grupos_viaje?.estado === 'activo') ?? [];

  const pasados =
    data?.filter((item: any) =>
      ['finalizado', 'cerrado', 'archivado'].includes(item.grupos_viaje?.estado)
    ) ?? [];

  return { activos, pasados };
};

export const updateGroup = async (
  authUserId: string,
  groupId: string,
  payload: UpdateGroupPayload
) => {
  await ensureGroupAdmin(authUserId, groupId);

  const updateData = {
    ...(payload.nombre !== undefined ? { nombre: payload.nombre } : {}),
    ...(payload.descripcion !== undefined ? { descripcion: payload.descripcion || null } : {}),
    ...(payload.destino !== undefined ? { destino: payload.destino || null } : {}),
    ...(payload.fecha_inicio !== undefined ? { fecha_inicio: payload.fecha_inicio || null } : {}),
    ...(payload.fecha_fin !== undefined ? { fecha_fin: payload.fecha_fin || null } : {}),
    ...(payload.maximo_miembros !== undefined ? { maximo_miembros: payload.maximo_miembros } : {}),
    ...(payload.destino_latitud !== undefined ? { destino_latitud: payload.destino_latitud } : {}),
    ...(payload.destino_longitud !== undefined ? { destino_longitud: payload.destino_longitud } : {}),
    ...(payload.destino_place_id !== undefined ? { destino_place_id: payload.destino_place_id || null } : {}),
    ...(payload.destino_formatted_address !== undefined ? { destino_formatted_address: payload.destino_formatted_address || null } : {}),
  };

  const { data, error } = await supabase
    .from('grupos_viaje')
    .update(updateData)
    .eq('id', groupId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo actualizar el grupo');
  }

  return data;
};

export const deleteGroup = async (authUserId: string, groupId: string) => {
  await ensureGroupAdmin(authUserId, groupId);

  const { error } = await supabase
    .from('grupos_viaje')
    .delete()
    .eq('id', groupId);

  if (error) throw new Error(error.message);

  return { ok: true };
};