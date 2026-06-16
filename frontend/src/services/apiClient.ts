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
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    err instanceof TypeError ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("networkerror")
  );
}

function buildNetworkError(): ApiError {
  return new ApiError(
    "Sin conexión. Verifica tu red e inténtalo de nuevo.",
    0,
    { ok: false, code: "ERR-NET", error: "Sin conexión. Verifica tu red e inténtalo de nuevo." },
  );
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

function isExpiredTokenResponse(response: Response, parsed: ParsedBody): boolean {
  if (response.status !== 401) return false;
  const payload = (parsed.data ?? null) as ApiErrorPayload | null;
  const message = `${payload?.error ?? ""} ${payload?.details ?? ""} ${parsed.raw ?? ""}`.toLowerCase();
  return message.includes("token") && (message.includes("expir") || message.includes("invalid"));
}

async function getFreshAccessToken(currentToken?: string): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const freshToken = session?.access_token ?? null;
  if (!freshToken || freshToken === currentToken) return null;
  return freshToken;
}

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  token?: string,
  retryOnExpiredToken = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (isNetworkError(err)) throw buildNetworkError();
    throw err;
  }

  const parsed = await parseResponseBody(response);

  if (retryOnExpiredToken && token && isExpiredTokenResponse(response, parsed)) {
    const freshToken = await getFreshAccessToken(token);
    if (freshToken) {
      return request<T>(path, method, body, freshToken, false);
    }
  }

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
  retryOnExpiredToken = true,
): Promise<T> {
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers,
      body: formData,
    });
  } catch (err) {
    if (isNetworkError(err)) throw buildNetworkError();
    throw err;
  }

  const parsed = await parseResponseBody(response);

  if (retryOnExpiredToken && token && isExpiredTokenResponse(response, parsed)) {
    const freshToken = await getFreshAccessToken(token);
    if (freshToken) {
      return upload<T>(path, formData, freshToken, false);
    }
  }

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
