import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase server environment configuration. Copy .env.example and fill values locally.');
}

// Node.js < 22 has no native WebSocket, which @supabase/supabase-js requires at
// client creation. The API never uses realtime, but polyfill it so the server
// boots on Node 20 (the minimum declared in package.json engines).
if (typeof globalThis.WebSocket === 'undefined') {
  const { default: ws } = await import('ws');
  globalThis.WebSocket = ws;
}

// The service-role key bypasses RLS. Keep it server-side and authorize every request before using adminDb.
export const adminDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
export const authVerifier = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
