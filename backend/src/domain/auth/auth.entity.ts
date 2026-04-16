export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface UsuarioLocal {
  id_usuario: string;
  auth_user_id: string;
  email: string;
  nombre: string;
  proveedor_auth: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  nombre?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}