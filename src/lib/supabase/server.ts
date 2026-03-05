import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './types';

// Helper to clean env vars (strip newlines)
const getEnv = (key: string) => (process.env[key] || '').trim();

// Lazy getters to avoid build-time evaluation
function getSupabaseUrl() {
  return getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
}

function getSupabaseAnonKey() {
  return getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

function getSupabaseServiceKey() {
  return getEnv('SUPABASE_SERVICE_ROLE_KEY');
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  );
}

// Lazy-initialized admin client singleton
let _adminClient: SupabaseClient | null = null;

// Admin client for server-side operations (bypasses RLS)
// Note: Not typed to Database since CRM tables aren't in the type definitions yet
export function createAdminClient() {
  if (!_adminClient) {
    _adminClient = createSupabaseClient(
      getSupabaseUrl(),
      getSupabaseServiceKey()!
    );
  }
  return _adminClient;
}
