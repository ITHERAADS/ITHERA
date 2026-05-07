import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SECRET_KEY: string;
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;
  LOCK_TTL_MINUTES: number;
  AMADEUS_BASE_URL?: string;
  AMADEUS_AUTH_URL?: string;
  AMADEUS_CLIENT_ID?: string;
  AMADEUS_CLIENT_SECRET?: string;
  DUFFEL_ACCESS_TOKEN?: string;
  DUFFEL_BASE_URL?: string;
  DUFFEL_API_VERSION?: string;
  GOOGLE_MAPS_API_KEY?: string;
  GOOGLE_MAPS_BASE_URL?: string;
  GOOGLE_ROUTES_BASE_URL?: string;
  GOOGLE_PLACES_BASE_URL?: string;
  LITEAPI_BASE_URL?: string;
  LITEAPI_API_KEY?: string;
  WEATHER_API_KEY?: string;
  WEATHER_API_BASE_URL?: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variable de entorno requerida no encontrada: ${key}`);
  }
  return value;
}

export const env: EnvConfig = {
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv('SUPABASE_ANON_KEY'),
  SUPABASE_SECRET_KEY: requireEnv('SUPABASE_SECRET_KEY'),
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  LOCK_TTL_MINUTES: parseInt(process.env.LOCK_TTL_MINUTES ?? '10', 10),
  AMADEUS_BASE_URL: process.env.AMADEUS_BASE_URL,
  AMADEUS_AUTH_URL: process.env.AMADEUS_AUTH_URL,
  AMADEUS_CLIENT_ID: process.env.AMADEUS_CLIENT_ID,
  AMADEUS_CLIENT_SECRET: process.env.AMADEUS_CLIENT_SECRET,
  DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN,
  DUFFEL_BASE_URL: process.env.DUFFEL_BASE_URL,
  DUFFEL_API_VERSION: process.env.DUFFEL_API_VERSION,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_BASE_URL: process.env.GOOGLE_MAPS_BASE_URL,
  GOOGLE_ROUTES_BASE_URL: process.env.GOOGLE_ROUTES_BASE_URL,
  GOOGLE_PLACES_BASE_URL: process.env.GOOGLE_PLACES_BASE_URL,
  LITEAPI_BASE_URL: process.env.LITEAPI_BASE_URL,
  LITEAPI_API_KEY: process.env.LITEAPI_API_KEY,
  WEATHER_API_KEY: process.env.WEATHER_API_KEY,
  WEATHER_API_BASE_URL: process.env.WEATHER_API_BASE_URL,
};
