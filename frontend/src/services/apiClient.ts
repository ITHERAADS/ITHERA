const API_URL = import.meta.env.VITE_API_URL as string;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || data?.details || 'Error en la petición');
  }

  return data as T;
}

export const apiClient = {
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, 'POST', body, token),

  get: <T>(path: string, token?: string) =>
    request<T>(path, 'GET', undefined, token),
};