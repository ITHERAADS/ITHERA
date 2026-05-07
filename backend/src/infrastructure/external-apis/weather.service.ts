const OPEN_METEO_BASE_URL = process.env['OPEN_METEO_BASE_URL'] ?? 'https://api.open-meteo.com';

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta no válida de Open-Meteo: ${text}`);
  }
}

export async function openMeteoForecast<T>(latitude: number, longitude: number): Promise<T> {
  const url = new URL('/v1/forecast', OPEN_METEO_BASE_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '6');
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');

  const response = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`Error de Open-Meteo (${response.status}): ${await response.text()}`);
  }

  return safeJson<T>(response);
}
