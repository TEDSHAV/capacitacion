import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,  // Persist session to avoid frequent re-logins
        autoRefreshToken: true,  // Auto-refresh tokens for seamless experience
        detectSessionInUrl: true
      }
    }
  )
}
