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
