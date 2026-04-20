import * as dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SECRET_KEY: string;
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;
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
};