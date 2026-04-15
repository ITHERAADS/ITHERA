import { supabase } from '../../infrastructure/db/supabase.client';
import { SignupPayload, LoginPayload, UsuarioLocal } from './auth.entity';

export const signUpUser = async (payload: SignupPayload) => {
  const { email, password, nombre } = payload;
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: nombre ?? 'Sin nombre' } },
  });
};

export const signInUser = async (payload: LoginPayload) => {
  return supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });
};

export const syncUserToLocal = async (token: string) => {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error('Token inválido');

  const user = data.user;
  const upsertPayload: Omit<UsuarioLocal, 'id_usuario'> = {
    auth_user_id: user.id,
    email: user.email ?? '',
    nombre:
      (user.user_metadata?.['full_name'] as string) ??
      (user.user_metadata?.['name'] as string) ??
      'Sin nombre',
    proveedor_auth: (user.app_metadata?.['provider'] as string) ?? 'email',
  };

  return supabase
    .from('usuarios')
    .upsert(upsertPayload, { onConflict: 'auth_user_id' })
    .select()
    .single();
};

export const getUserByAuthId = async (authUserId: string) => {
  return supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();
};