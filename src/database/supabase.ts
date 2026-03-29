import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration in environment variables");
}

// Service role client can bypass RLS for admin operations from backend, 
// using Anon key means relying on Auth header for operations.
export const supabase = createClient(supabaseUrl, supabaseKey);
