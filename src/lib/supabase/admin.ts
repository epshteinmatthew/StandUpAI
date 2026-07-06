import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

/** Vercel/Node 20 has no native WebSocket; supabase-js requires one at client init. */
const nodeRealtimeOptions = {
  realtime: {
    transport: ws as unknown as typeof WebSocket,
  },
};

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      ...nodeRealtimeOptions,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
