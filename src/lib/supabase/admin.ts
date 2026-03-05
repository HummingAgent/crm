import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized admin client to avoid build-time errors
// (env vars are not available during Next.js static analysis)
let _adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    
    _adminClient = createClient(url, key);
  }
  return _adminClient;
}
