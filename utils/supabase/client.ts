import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,  // Don't persist session - require login after expiration
        autoRefreshToken: false,  // Don't auto-refresh - let user log in again
        detectSessionInUrl: true
      }
    }
  )
}
