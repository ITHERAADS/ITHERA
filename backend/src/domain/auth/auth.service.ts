import { supabaseAuth, supabaseAdmin } from '../../infrastructure/db/supabase.client';
import { env } from '../../config/env';
import {
  SignupPayload,
  LoginPayload,
  UsuarioLocal,
  ForgotPasswordPayload,
} from './auth.entity';

export interface UploadedAvatarFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

function buildFullName(payload: SignupPayload): string {
  const fullName = [
    payload.name?.trim(),
    payload.lastNamePaterno?.trim(),
    payload.lastNameMaterno?.trim(),
  ]
    .filter(Boolean)
    .join(' ');

  return fullName || payload.email.trim().split('@')[0] || 'Usuario';
}


export const findUserByEmail = async (email: string) => {
  return supabaseAdmin
    .from('usuarios')
    .select('id_usuario, email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
};

export const signUpUser = async (payload: SignupPayload) => {
  const fullName = buildFullName(payload);

  return supabaseAuth.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    options: {
      emailRedirectTo: `${env.FRONTEND_URL}/login`,
      data: {
        name: payload.name?.trim() || fullName,
        last_name_paterno: payload.lastNamePaterno?.trim() || '',
        last_name_materno: payload.lastNameMaterno?.trim() || '',
        full_name: fullName,
      },
    },
  });
};

export const signInUser = async (payload: LoginPayload) => {
  return supabaseAuth.auth.signInWithPassword({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  });
};

export const forgotPassword = async (payload: ForgotPasswordPayload) => {
  return supabaseAuth.auth.resetPasswordForEmail(payload.email.trim().toLowerCase(), {
    redirectTo: `${env.FRONTEND_URL}/reset-password`,
  });
};

export const syncUserToLocal = async (token: string) => {
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    throw Object.assign(new Error('Token inválido'), { statusCode: 401 });
  }

  const user = data.user;

  // Verificar si el usuario ya existe en la tabla local
  const { data: existingUser } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario, nombre')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  // Si ya existe, solo actualizar email y proveedor (NO sobreescribir nombre)
  if (existingUser) {
    return supabaseAdmin
      .from('usuarios')
      .update({
        email: user.email ?? '',
        proveedor_auth: (user.app_metadata?.['provider'] as string) ?? 'email',
      })
      .eq('auth_user_id', user.id)
      .select()
      .single();
  }

  // Si es usuario nuevo, crear con el nombre de los metadatos de auth
  const nombre =
    (user.user_metadata?.['full_name'] as string) ??
    [
      user.user_metadata?.['name'] as string,
      user.user_metadata?.['last_name_paterno'] as string,
      user.user_metadata?.['last_name_materno'] as string,
    ]
      .filter(Boolean)
      .join(' ') ??
    'Sin nombre';

  const insertPayload: Omit<UsuarioLocal, 'id_usuario'> = {
    auth_user_id: user.id,
    email: user.email ?? '',
    nombre,
    proveedor_auth: (user.app_metadata?.['provider'] as string) ?? 'email',
  };

  return supabaseAdmin
    .from('usuarios')
    .insert(insertPayload)
    .select()
    .single();
};

export const getUserByAuthId = async (authUserId: string) => {
  return supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();
};

export const updateUserByAuthId = async (
  authUserId: string,
  payload: { nombre: string }
) => {
  return supabaseAdmin
    .from('usuarios')
    .update({ nombre: payload.nombre })
    .eq('auth_user_id', authUserId)
    .select('*')
    .single();
};

function getStoragePathFromPublicUrl(publicUrl?: string | null): string | null {
  if (!publicUrl) return null;

  const marker = '/profile-avatars/';
  const index = publicUrl.indexOf(marker);

  if (index === -1) return null;

  return decodeURIComponent(publicUrl.substring(index + marker.length));
}

export const updateUserAvatarByAuthId = async (
  authUserId: string,
  file: UploadedAvatarFile
) => {
  const { data: currentUser } = await getUserByAuthId(authUserId);
  const oldAvatarPath = getStoragePathFromPublicUrl(currentUser?.avatar_url);

  const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${authUserId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('profile-avatars')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('profile-avatars')
    .getPublicUrl(filePath);

  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update({ avatar_url: publicUrlData.publicUrl })
    .eq('auth_user_id', authUserId)
    .select('*')
    .single();

  if (!error && oldAvatarPath && oldAvatarPath !== filePath) {
    await supabaseAdmin.storage
      .from('profile-avatars')
      .remove([oldAvatarPath]);
  }

  return { data, error };
};

export const deleteUserAvatarByAuthId = async (authUserId: string) => {
  const { data: currentUser, error: userError } = await getUserByAuthId(authUserId);

  if (userError) {
    return { data: null, error: userError };
  }

  const avatarPath = getStoragePathFromPublicUrl(currentUser?.avatar_url);

  if (avatarPath) {
    await supabaseAdmin.storage
      .from('profile-avatars')
      .remove([avatarPath]);
  }

  return supabaseAdmin
    .from('usuarios')
    .update({ avatar_url: null })
    .eq('auth_user_id', authUserId)
    .select('*')
    .single();
};

export const deleteAccountByAuthId = async (authUserId: string) => {
  // 1. Eliminar avatar del storage si existe
  const { data: currentUser } = await getUserByAuthId(authUserId);
  const avatarPath = currentUser?.avatar_url
    ? getStoragePathFromPublicUrl(currentUser.avatar_url)
    : null;

  if (avatarPath) {
    await supabaseAdmin.storage.from('profile-avatars').remove([avatarPath]);
  }

  // 2. Eliminar registro en tabla usuarios
  await supabaseAdmin.from('usuarios').delete().eq('auth_user_id', authUserId);

  // 3. Eliminar usuario de Supabase Auth (operación irreversible)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
  if (error) return { data: null, error };

  return { data: { deleted: true }, error: null };
};


export interface UserTravelStats {
  tripsAsAdmin: number;
  tripsAsTraveler: number;
  acceptedProposals: number;
  totalSpent: number;
  countriesVisited: number;
  destinations: string[];
  recentTrips: Array<{
    id: number;
    nombre: string;
    destino: string | null;
    estado: string | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    rol: string;
  }>;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    ),
  );
}

export const getUserTravelStatsByAuthId = async (authUserId: string): Promise<UserTravelStats> => {
  const { data: localUser, error: userError } = await getUserByAuthId(authUserId);

  if (userError || !localUser?.id_usuario) {
    throw Object.assign(new Error('Usuario no encontrado en tabla local'), { statusCode: 404 });
  }

  const userId = Number(localUser.id_usuario);

  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('grupo_miembros')
    .select('rol, grupos_viaje(id, nombre, destino, destino_formatted_address, estado, fecha_inicio, fecha_fin)')
    .eq('usuario_id', userId);

  if (membershipsError) {
    throw membershipsError;
  }

  const normalizedMemberships = (memberships ?? [])
    .map((membership: any) => {
      const group = Array.isArray(membership.grupos_viaje)
        ? membership.grupos_viaje[0]
        : membership.grupos_viaje;
      if (!group) return null;
      return {
        rol: String(membership.rol ?? 'viajero').toLowerCase(),
        group,
      };
    })
    .filter(Boolean) as Array<{ rol: string; group: any }>;

  const tripsAsAdmin = normalizedMemberships.filter((item) => item.rol === 'admin').length;
  const tripsAsTraveler = normalizedMemberships.filter((item) => item.rol !== 'admin').length;
  const groupIds = normalizedMemberships
    .map((item) => Number(item.group.id))
    .filter((id) => Number.isFinite(id));

  let acceptedProposals = 0;
  if (groupIds.length > 0) {
    const { count, error } = await supabaseAdmin
      .from('propuestas')
      .select('id_propuesta', { count: 'exact', head: true })
      .in('grupo_id', groupIds)
      .eq('estado', 'aprobada');

    if (error) throw error;
    acceptedProposals = count ?? 0;
  }

  const { data: paidExpenses, error: paidExpensesError } = await supabaseAdmin
    .from('expenses')
    .select('amount')
    .eq('paid_by_user_id', userId);

  if (paidExpensesError) {
    throw paidExpensesError;
  }

  const totalSpent = (paidExpenses ?? []).reduce((sum: number, expense: any) => {
    const amount = Number(expense.amount ?? 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const destinations = uniqueNonEmpty(
    normalizedMemberships.flatMap((item) => [
      item.group.destino,
      item.group.destino_formatted_address,
    ]),
  );

  const recentTrips = normalizedMemberships
    .slice()
    .sort((left, right) => {
      const leftTime = Date.parse(left.group.fecha_inicio ?? left.group.created_at ?? '') || 0;
      const rightTime = Date.parse(right.group.fecha_inicio ?? right.group.created_at ?? '') || 0;
      return rightTime - leftTime;
    })
    .slice(0, 5)
    .map((item) => ({
      id: Number(item.group.id),
      nombre: String(item.group.nombre ?? 'Viaje sin nombre'),
      destino: item.group.destino ?? item.group.destino_formatted_address ?? null,
      estado: item.group.estado ?? null,
      fecha_inicio: item.group.fecha_inicio ?? null,
      fecha_fin: item.group.fecha_fin ?? null,
      rol: item.rol === 'admin' ? 'Admin' : 'Viajero',
    }));

  return {
    tripsAsAdmin,
    tripsAsTraveler,
    acceptedProposals,
    totalSpent,
    countriesVisited: destinations.length,
    destinations,
    recentTrips,
  };
};
