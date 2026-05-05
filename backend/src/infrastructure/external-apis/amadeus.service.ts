interface AmadeusTokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function ensureAmadeusEnv(): { clientId: string; clientSecret: string } {
  const clientId = process.env['AMADEUS_CLIENT_ID'];
  const clientSecret = process.env['AMADEUS_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    throw new Error('Faltan variables de entorno de Amadeus');
  }
  return { clientId, clientSecret };
}

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error('La respuesta del servicio de Amadeus está vacía');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta no válida del servicio externo: ${text}`);
  }
}

export async function getAmadeusAccessToken(): Promise<string> {
  const { clientId, clientSecret } = ensureAmadeusEnv();

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const authUrl = process.env['AMADEUS_AUTH_URL'] || 'https://test.api.amadeus.com/v1/security/oauth2/token';
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(8000), // Timeout for integrity
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No se pudo autenticar con Amadeus: ${response.status} ${errorText}`);
  }

  const data = await safeJson<AmadeusTokenResponse>(response);
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(((data.expires_in || 1799) - 60) * 1000, 60_000),
  };

  return data.access_token;
}

export async function amadeusGet<T>(path: string, query: Record<string, string | number | undefined>): Promise<T> {
  const token = await getAmadeusAccessToken();
  const baseUrl = process.env['AMADEUS_BASE_URL'] || 'https://test.api.amadeus.com';
  const url = new URL(path, baseUrl);

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
    signal: AbortSignal.timeout(8000), // Timeout for integrity
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error de Amadeus (${response.status}): ${errorText}`);
  }

  return safeJson<T>(response);
}