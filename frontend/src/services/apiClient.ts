import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL as string;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ParsedBody = {
  isJson: boolean;
  data: unknown;
  raw: string;
};

export type ApiErrorPayload = {
  ok?: false;
  error?: string;
  details?: string;
  code?: string;
  retryAfterSeconds?: number;
  lockedUntil?: string;
  remainingAttempts?: number;
};

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(
    message: string,
    status: number,
    payload: ApiErrorPayload | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Determina si un error capturado corresponde a un fallo de red (sin conexión,
 * servidor inalcanzable o timeout de fetch), distinto de un error HTTP normal.
 * Usado para implementar el comportamiento ERR-NET-02.
 */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // TypeError es lo que lanza fetch cuando no hay red ("Failed to fetch", "NetworkError", etc.)
  if (!(err instanceof TypeError)) return false;
  // Verificación adicional por nombre de mensaje para mayor robustez entre navegadores
  const msg = err.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("networkerror") ||
    !navigator.onLine
  );
}

/**
 * Obtiene un access token fresco desde Supabase. Supabase mantiene la sesión
 * con autoRefreshToken activo, por lo que getSession() devuelve un token
 * renovado cuando el anterior expiró. Si la sesión está vencida, forzamos un
 * refresh explícito. Devuelve null si no hay sesión recuperable.
 *
 * Esto resuelve el caso en que el access token guardado en memoria/estado de la
 * app queda obsoleto durante sesiones largas (>1h) y provoca respuestas 401
 * "Token inválido o expirado" en acciones como enviar invitaciones.
 */
async function getFreshToken(previousToken?: string): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token ?? null;

    // Si getSession devolvió el mismo token que ya falló, forzamos refresh.
    if (!token || token === previousToken) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token ?? token;
    }

    return token && token !== previousToken ? token : null;
  } catch {
    return null;
  }
}

async function parseResponseBody(response: Response): Promise<ParsedBody> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.toLowerCase().includes("application/json");
  const raw = await response.text();

  if (!isJson || !raw) {
    return { isJson, data: null, raw };
  }

  try {
    return { isJson, data: JSON.parse(raw), raw };
  } catch {
    return { isJson, data: null, raw };
  }
}

function sanitizeApiMessage(message: string): string {
  return message
    .replace(/^ERR-[A-Z0-9]+(?:-[A-Z0-9]+)*:\s*/i, "")
    .replace(/^\[[^\]]+\]\s*/i, "")
    .trim();
}

function buildHttpError(
  response: Response,
  parsed: ParsedBody,
  fallback: string,
): ApiError {
  const payload = (parsed.data ?? null) as ApiErrorPayload | null;
  const message =
    payload?.error ||
    payload?.details ||
    (parsed.raw && !parsed.isJson ? parsed.raw : null) ||
    `${fallback} (HTTP ${response.status})`;

  return new ApiError(sanitizeApiMessage(message), response.status, payload);
}

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  token?: string,
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Reintento automático ante token expirado: si la petición venía autenticada
  // y el backend responde 401, intentamos obtener un token fresco de Supabase y
  // repetimos la llamada una sola vez.
  if (response.status === 401 && token && !isRetry) {
    const freshToken = await getFreshToken(token);
    if (freshToken) {
      return request<T>(path, method, body, freshToken, true);
    }
  }

  const parsed = await parseResponseBody(response);

  if (!response.ok) {
    throw buildHttpError(response, parsed, "Error en la peticion");
  }

  if (!parsed.isJson) {
    throw new Error(
      `Respuesta no JSON en ${path} (HTTP ${response.status}). Verifica VITE_API_URL y rutas del backend.`,
    );
  }

  return (parsed.data ?? {}) as T;
}

async function upload<T>(
  path: string,
  formData: FormData,
  token?: string,
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers,
    body: formData,
  });

  if (response.status === 401 && token && !isRetry) {
    const freshToken = await getFreshToken(token);
    if (freshToken) {
      return upload<T>(path, formData, freshToken, true);
    }
  }

  const parsed = await parseResponseBody(response);

  if (!response.ok) {
    throw buildHttpError(response, parsed, "Error al subir archivo");
  }

  if (!parsed.isJson) {
    throw new Error(
      `Respuesta no JSON en ${path} (HTTP ${response.status}). Verifica VITE_API_URL y rutas del backend.`,
    );
  }

  return (parsed.data ?? {}) as T;
}

export const apiClient = {
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, "POST", body, token),

  get: <T>(path: string, token?: string) =>
    request<T>(path, "GET", undefined, token),

  put: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, "PUT", body, token),

  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, "PATCH", body, token),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, "DELETE", undefined, token),

  upload: <T>(path: string, formData: FormData, token?: string) =>
    upload<T>(path, formData, token),
};
