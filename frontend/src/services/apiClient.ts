const API_URL = import.meta.env.VITE_API_URL as string

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type ParsedBody = {
  isJson: boolean
  data: unknown
  raw: string
}

export type ApiErrorPayload = {
  ok?: false
  error?: string
  details?: string
  code?: string
  retryAfterSeconds?: number
  lockedUntil?: string
  remainingAttempts?: number
}

export class ApiError extends Error {
  status: number
  payload: ApiErrorPayload | null

  constructor(message: string, status: number, payload: ApiErrorPayload | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

async function parseResponseBody(response: Response): Promise<ParsedBody> {
  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.toLowerCase().includes('application/json')
  const raw = await response.text()

  if (!isJson || !raw) {
    return { isJson, data: null, raw }
  }

  try {
    return { isJson, data: JSON.parse(raw), raw }
  } catch {
    return { isJson, data: null, raw }
  }
}

function buildHttpError(response: Response, parsed: ParsedBody, fallback: string): ApiError {
  const payload = (parsed.data ?? null) as ApiErrorPayload | null
  const message =
    payload?.error ||
    payload?.details ||
    (parsed.raw && !parsed.isJson ? parsed.raw : null) ||
    `${fallback} (HTTP ${response.status})`

  return new ApiError(message, response.status, payload)
}

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const parsed = await parseResponseBody(response)

  if (!response.ok) {
    throw buildHttpError(response, parsed, 'Error en la peticion')
  }

  if (!parsed.isJson) {
    throw new Error(
      `Respuesta no JSON en ${path} (HTTP ${response.status}). Verifica VITE_API_URL y rutas del backend.`
    )
  }

  return (parsed.data ?? {}) as T
}

async function upload<T>(
  path: string,
  formData: FormData,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: formData,
  })

  const parsed = await parseResponseBody(response)

  if (!response.ok) {
    throw buildHttpError(response, parsed, 'Error al subir archivo')
  }

  if (!parsed.isJson) {
    throw new Error(
      `Respuesta no JSON en ${path} (HTTP ${response.status}). Verifica VITE_API_URL y rutas del backend.`
    )
  }

  return (parsed.data ?? {}) as T
}

export const apiClient = {
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, 'POST', body, token),

  get: <T>(path: string, token?: string) =>
    request<T>(path, 'GET', undefined, token),

  put: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, 'PUT', body, token),

  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, 'PATCH', body, token),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, 'DELETE', undefined, token),

  upload: <T>(path: string, formData: FormData, token?: string) =>
    upload<T>(path, formData, token),
}
