import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../services/apiClient';
import { supabase } from '../lib/supabase';
import {
  AuthContext,
  type LocalUser,
  type RegisterPayload,
  type RegisterResult,
  type SessionShape,
  type SessionUser,
} from './auth-context';

const STORAGE_KEY = 'ithera_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    setAccessToken(null);
    setSessionUser(null);
    setLocalUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const persist = useCallback(
    (payload: {
      accessToken: string | null;
      sessionUser: SessionUser | null;
      localUser: LocalUser | null;
    }) => {
      if (!payload.accessToken || !payload.sessionUser) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
    []
  );

  const syncUser = useCallback(async (token: string) => {
    const syncRes = await apiClient.post<{ ok: boolean; user: LocalUser }>(
      '/auth/sync-user',
      {},
      token
    );

    return syncRes.user;
  }, []);

  const applySession = useCallback(
    async (session: SessionShape) => {
      const browserUser: SessionUser = {
        id: session.user.id,
        email: session.user.email ?? '',
      };

      const syncedUser = await syncUser(session.access_token);

      setAccessToken(session.access_token);
      setSessionUser(browserUser);
      setLocalUser(syncedUser);

      persist({
        accessToken: session.access_token,
        sessionUser: browserUser,
        localUser: syncedUser,
      });
    },
    [persist, syncUser]
  );

  const refreshMe = useCallback(
    async (tokenParam?: string) => {
      const token = tokenParam ?? accessToken;
      if (!token) return;

      const meRes = await apiClient.get<{ ok: boolean; user: LocalUser }>(
        '/auth/me',
        token
      );

      setLocalUser(meRes.user);

      persist({
        accessToken: token,
        sessionUser,
        localUser: meRes.user,
      });
    },
    [accessToken, sessionUser, persist]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const loginRes = await apiClient.post<{
        ok: boolean;
        session: { access_token: string } | null;
        user: SessionUser | null;
      }>('/auth/login', { email, password });

      if (!loginRes.session?.access_token || !loginRes.user) {
        throw new Error('No se pudo iniciar sesión');
      }

      const token = loginRes.session.access_token;
      const syncedUser = await syncUser(token);

      setAccessToken(token);
      setSessionUser(loginRes.user);
      setLocalUser(syncedUser);

      persist({
        accessToken: token,
        sessionUser: loginRes.user,
        localUser: syncedUser,
      });
    },
    [persist, syncUser]
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<RegisterResult> => {
      const registerRes = await apiClient.post<{
        ok: boolean;
        message?: string;
        data: {
          session: { access_token: string } | null;
          user: SessionUser | null;
        };
      }>('/auth/register', payload);

      const token = registerRes.data?.session?.access_token;
      const user = registerRes.data?.user;

      if (token && user) {
        const syncedUser = await syncUser(token);

        setAccessToken(token);
        setSessionUser(user);
        setLocalUser(syncedUser);

        persist({
          accessToken: token,
          sessionUser: user,
          localUser: syncedUser,
        });

        return {
          requiresEmailConfirmation: false,
          message: registerRes.message ?? 'Usuario registrado correctamente',
        };
      }

      return {
        requiresEmailConfirmation: true,
        message:
          registerRes.message ??
          'Cuenta creada. Revisa tu correo para confirmar tu cuenta.',
      };
    },
    [persist, syncUser]
  );

  const forgotPassword = useCallback(async (email: string) => {
    await apiClient.post('/auth/forgot-password', { email });
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/my-trips`,
      },
    });

    if (error) throw error;
  }, []);

  const loginWithFacebook = useCallback(async (redirectTo = '/my-trips') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}${redirectTo}`,
      },
    });

    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearAuthState();
  }, [clearAuthState]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.access_token && session.user) {
          await applySession(session);
        } else {
          await supabase.auth.signOut();
          clearAuthState();
        }
      } catch (error) {
        console.error('Error al restaurar sesión:', error);
        await supabase.auth.signOut();
        if (isMounted) {
          clearAuthState();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.access_token && session.user) {
          await applySession(session);
        } else {
          clearAuthState();
        }
      } catch (error) {
        console.error('Error al procesar cambio de sesión:', error);
        await supabase.auth.signOut();
        clearAuthState();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySession, clearAuthState]);

  const value = useMemo(
    () => ({
      accessToken,
      sessionUser,
      localUser,
      loading,
      login,
      register,
      forgotPassword,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      refreshMe,
    }),
    [
      accessToken,
      sessionUser,
      localUser,
      loading,
      login,
      register,
      forgotPassword,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      refreshMe,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}