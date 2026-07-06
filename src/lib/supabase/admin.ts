import { createClient } from '@supabase/supabase-js';
import { serverSupabaseOptions } from '@/lib/supabase/server-options';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      ...serverSupabaseOptions,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
