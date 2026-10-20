import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  // Fail loudly in dev, but let production builds succeed (values injected at runtime by the host).
  if (import.meta.env.DEV) {
    throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy frontend/.env.example to frontend/.env.');
  }
}
export const supabase = createClient(url, anonKey);
