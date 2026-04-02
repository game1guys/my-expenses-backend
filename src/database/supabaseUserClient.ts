import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Client scoped to the end-user JWT so Postgres RLS (auth.uid()) works when the API
 * uses SUPABASE_ANON_KEY instead of the service role (common on small deployments).
 */
export function createSupabaseForUser(accessToken: string): SupabaseClient {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required for user-scoped queries');
  }
  return createClient(url, key, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
