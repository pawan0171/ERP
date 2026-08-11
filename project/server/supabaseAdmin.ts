import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

if (!url || !serviceKey) {
  throw new Error('Missing Supabase env variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

// Admin client — bypasses RLS. Only used server-side, never exposed to browser.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
