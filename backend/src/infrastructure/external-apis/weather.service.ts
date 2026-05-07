import { env } from '../../config/env';

const WEATHER_API_BASE_URL = process.env['WEATHER_API_BASE_URL'] ?? 'https://api.weatherapi.com';

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta no válida de WeatherAPI: ${text}`);
  }
}

export async function weatherApiForecast<T>(latitude: number, longitude: number, days = 6): Promise<T> {
  if (!env.WEATHER_API_KEY) {
    throw new Error('Falta configurar WEATHER_API_KEY en el backend');
  }

  const url = new URL('/v1/forecast.json', WEATHER_API_BASE_URL);
  url.searchParams.set('key', env.WEATHER_API_KEY);
  url.searchParams.set('q', `${latitude},${longitude}`);
  url.searchParams.set('days', String(Math.min(Math.max(days, 1), 10)));
  url.searchParams.set('aqi', 'no');
  url.searchParams.set('alerts', 'no');
  url.searchParams.set('lang', 'es');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Error de WeatherAPI (${response.status}): ${await response.text()}`);
  }

  return safeJson<T>(response);
}
