import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import ws from 'ws';

/** Vercel/Node 20 has no native WebSocket; supabase-js requires one at client init. */
const nodeRealtimeOptions = {
  realtime: {
    transport: ws as unknown as typeof WebSocket,
  },
};

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...nodeRealtimeOptions,
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
            // Called from a Server Component; middleware will refresh session.
          }
        },
      },
    }
  );
}
