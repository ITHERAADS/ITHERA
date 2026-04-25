import { supabaseAuth, supabaseAdmin } from '../../infrastructure/db/supabase.client';
import { env } from '../../config/env';
import {
  SignupPayload,
  LoginPayload,
  UsuarioLocal,
  ForgotPasswordPayload,
} from './auth.entity';

function buildFullName(payload: SignupPayload): string {
  return [
    payload.name?.trim(),
    payload.lastNamePaterno?.trim(),
    payload.lastNameMaterno?.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

export const signUpUser = async (payload: SignupPayload) => {
  const fullName = buildFullName(payload);

  return supabaseAuth.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    options: {
      emailRedirectTo: `${env.FRONTEND_URL}/login`,
      data: {
        name: payload.name.trim(),
        last_name_paterno: payload.lastNamePaterno.trim(),
        last_name_materno: payload.lastNameMaterno.trim(),
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

  const upsertPayload: Omit<UsuarioLocal, 'id_usuario'> = {
    auth_user_id: user.id,
    email: user.email ?? '',
    nombre,
    proveedor_auth: (user.app_metadata?.['provider'] as string) ?? 'email',
  };

  return supabaseAdmin
    .from('usuarios')
    .upsert(upsertPayload, { onConflict: 'auth_user_id' })
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