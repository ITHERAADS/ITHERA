import { createContext } from 'react';

export type SessionUser = {
  id: string;
  email: string;
};

export type LocalUser = {
  id_usuario: string;
  auth_user_id: string;
  email: string;
  nombre: string;
  proveedor_auth: string;
};

export type RegisterPayload = {
  name: string;
  lastNamePaterno: string;
  lastNameMaterno: string;
  email: string;
  password: string;
};

export type RegisterResult = {
  requiresEmailConfirmation: boolean;
  message: string;
};

export type AuthContextType = {
  accessToken: string | null;
  sessionUser: SessionUser | null;
  localUser: LocalUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  forgotPassword: (email: string) => Promise<void>;
  loginWithGoogle: (redirectTo?: string) => Promise<void>;
  loginWithFacebook: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: (token?: string) => Promise<void>;
};

export type SessionShape = {
  access_token: string;
  user: {
    id: string;
    email?: string | null;
  };
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);