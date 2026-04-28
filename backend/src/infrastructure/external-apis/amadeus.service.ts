const AMADEUS_BASE_URL = process.env['AMADEUS_BASE_URL'] ?? 'https://test.api.amadeus.com';
const AMADEUS_AUTH_URL = process.env['AMADEUS_AUTH_URL'] ?? 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_CLIENT_ID = process.env['AMADEUS_CLIENT_ID'];
const AMADEUS_CLIENT_SECRET = process.env['AMADEUS_CLIENT_SECRET'];

interface AmadeusTokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function ensureAmadeusEnv(): void {
  if (!AMADEUS_CLIENT_ID || !AMADEUS_CLIENT_SECRET) {
    throw new Error('Faltan variables de entorno de Amadeus');
  }
}

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta no válida del servicio externo: ${text}`);
  }
}

export async function getAmadeusAccessToken(): Promise<string> {
  ensureAmadeusEnv();

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: AMADEUS_CLIENT_ID!,
    client_secret: AMADEUS_CLIENT_SECRET!,
  });

  const response = await fetch(AMADEUS_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No se pudo autenticar con Amadeus: ${response.status} ${errorText}`);
  }

  const data = await safeJson<AmadeusTokenResponse>(response);
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max((data.expires_in - 60) * 1000, 60_000),
  };

  return data.access_token;
}

export async function amadeusGet<T>(path: string, query: Record<string, string | number | undefined>): Promise<T> {
  const token = await getAmadeusAccessToken();
  const url = new URL(path, AMADEUS_BASE_URL);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error de Amadeus (${response.status}): ${errorText}`);
  }

  return safeJson<T>(response);
}