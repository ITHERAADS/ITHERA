import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

export const supabase: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});